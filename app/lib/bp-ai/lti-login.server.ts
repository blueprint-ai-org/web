/**
 * A BP AI session for a Canvas launch (step-15).
 *
 * ```graphql
 * loginLti(ltiToken: String!): AuthPayload!   # @auth(type: NO_USER)
 * ```
 *
 * The gateway verifies the launch (lms-connector), finds the school by its
 * Canvas deployment and the person by email, and creates them just in time
 * with the launch's role. What comes back is the same `AuthPayload` a password
 * login gets, mapped by the same `bpSessionFromPayload`.
 *
 * ## Why it lives in this process, not in the `bp-session` cookie
 *
 * A launch renders inside the Canvas iframe. `bp-session` is `SameSite=Lax`, so
 * a cross-site iframe never sends it back, and in Safari's cookieless mode no
 * cookie survives at all. The session is therefore held here, keyed by the
 * launch token — exactly what `lti-role.server.ts` does with the role, for the
 * same two reasons: the cookie cannot carry it, and `/graphql` is rate limited
 * (50 requests/hour), so one exchange per launch, not per request.
 *
 * The access token lasts ~15 minutes and a launch token up to an hour: an entry
 * past its `accessTokenExpiresAt` is refreshed with its own refresh token
 * (single-flight — a refresh token rotates, and presenting it twice revokes the
 * family), and logged in again only if that fails.
 *
 * A refusal (unknown school, admin launch, gateway down) is cached for five
 * minutes like a negative role answer: a launch that will not work must not
 * spend the whole budget asking again.
 */

import { bpRefresh, bpSessionFromPayload } from './auth.server'
import { graphql } from './client.server'
import { gql } from './gql'
import type { BpSession } from './types'

const LOGIN_LTI = gql(`mutation LoginLti($ltiToken: String!) {
  loginLti(ltiToken: $ltiToken) { ...AuthPayloadFields }
}`)

/** A refused exchange is asked again after five minutes. */
const NEGATIVE_TTL_MS = 5 * 60 * 1000
/** Refresh a little early, so a loader never starts with a token about to die. */
const EARLY_REFRESH_MS = 30 * 1000
/** Same bound as the role cache: "do not grow forever", in insertion order. */
const MAX_ENTRIES = 500

type Entry = { session: BpSession | null; retryAt: number }

const cache = new Map<string, Entry>()
const inFlight = new Map<string, Promise<BpSession | null>>()

/**
 * The BP AI session of a launch, or `null` when the gateway will not give one.
 *
 * Never throws: a launch without a BP session still renders, with the empty
 * states every loader already has for it.
 */
export function bpLtiSession(ltiToken: string): Promise<BpSession | null> {
  const now = Date.now()
  const hit = cache.get(ltiToken)
  if (hit?.session && hit.session.accessTokenExpiresAt - EARLY_REFRESH_MS > now) {
    return Promise.resolve(hit.session)
  }
  if (hit && !hit.session && hit.retryAt > now) return Promise.resolve(null)

  const pending = inFlight.get(ltiToken)
  if (pending) return pending

  const next = obtain(ltiToken, hit?.session ?? null).finally(() => inFlight.delete(ltiToken))
  inFlight.set(ltiToken, next)
  return next
}

async function obtain(ltiToken: string, stale: BpSession | null): Promise<BpSession | null> {
  if (stale) {
    const refreshed = await bpRefresh(stale.refreshToken)
    if (refreshed.ok) return remember(ltiToken, bpSessionFromPayload(refreshed.data))
  }

  const result = await graphql(LOGIN_LTI, { ltiToken })
  if (!result.ok) {
    // Logged: without this line a launch that cannot exchange looks exactly
    // like a teacher with an empty class.
    console.error(`[lti-login] loginLti failed (${result.error.kind}): ${result.error.message}`)
    return remember(ltiToken, null)
  }
  return remember(ltiToken, bpSessionFromPayload(result.data.loginLti))
}

function remember(token: string, session: BpSession | null): BpSession | null {
  cache.delete(token)
  cache.set(token, { session, retryAt: Date.now() + NEGATIVE_TTL_MS })
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
  return session
}

/** Test seam. Nothing in the app clears this cache. */
export function __clearLtiLoginCache(): void {
  cache.clear()
  inFlight.clear()
}
