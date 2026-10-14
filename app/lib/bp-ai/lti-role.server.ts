/**
 * The persona of a Canvas launch, answered by the gateway.
 *
 * ```graphql
 * ltiLaunchRole(ltiToken: String!): LtiLaunchRole!   # @auth(type: NO_USER)
 * ```
 *
 * This replaces `app/lib/roles.ts`, which classified the launch here, in the
 * app, from the `roles` array and the `custom_fields.lti_role` override. The
 * same table existed in lms-connector (`CanvasLtiClaims.IsAdmin`) and the two
 * had drifted, so one person could get two answers from two halves of one
 * product. Now there is one implementation and this asks it.
 *
 * ## Why there is a cache
 *
 * `/graphql` is rate limited (50 requests/hour), and a launch loads several
 * documents. Without a cache the role lookup would be the most-called operation
 * in the app and the one most likely to be refused — and a refusal here sends a
 * real teacher to `/unsupported-role`.
 *
 * In-process, not a cookie, because of Safari ITP: in cookieless mode there is
 * no cookie to put it in, and that is exactly the mode a launch arrives in on
 * the browsers that matter.
 *
 * **The TTL is a flat five minutes, not the launch JWT's own `exp`.** Reading
 * `exp` means base64-decoding the token in this process to believe a claim
 * about itself, which is the practice step-7 exists to remove — and it would be
 * the only remaining caller of it. Five minutes covers the document loads of a
 * single launch (the persona loader already skips client-side GETs) and bounds
 * how long a revoked or re-roled launch keeps its old answer.
 *
 * Negative answers are cached too, and for the same reason: a malformed or
 * expired token would otherwise re-ask on every request and burn the whole
 * budget on a launch that is never going to work.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { Role } from './gql/schema'

const LTI_LAUNCH_ROLE = gql(`query LtiLaunchRole($ltiToken: String!) {
  ltiLaunchRole(ltiToken: $ltiToken) { role }
}`)

/** Five minutes, in milliseconds. See the TTL note above. */
const TTL_MS = 5 * 60 * 1000

/**
 * Entries, newest-inserted last.
 *
 * A `Map` keyed by the token with a size cap, rather than an LRU library: the
 * eviction policy that matters is "do not grow without bound in a long-lived
 * server process", and insertion order is enough for that. 500 entries is well
 * past any realistic concurrent-launch count and costs a few hundred kilobytes.
 */
const cache = new Map<string, { role: Role | null; expiresAt: number }>()
const MAX_ENTRIES = 500

/**
 * The role of a launch, or `null` when the gateway would not say.
 *
 * `null` covers all three refusals on purpose — an invalid token, a launch
 * whose roles map to nothing, and a gateway that did not answer — because the
 * caller does the same thing with each: send them to `/unsupported-role`, which
 * prints what was detected instead of guessing a persona.
 *
 * Keyed on the raw token rather than on anything inside it: the token IS the
 * identity of the launch here, and a key derived from its claims would mean
 * reading them, which is what this module exists to stop doing.
 */
export async function bpLtiLaunchRole(ltiToken: string): Promise<Role | null> {
  const now = Date.now()
  const hit = cache.get(ltiToken)
  if (hit && hit.expiresAt > now) return hit.role

  const result = await graphql(LTI_LAUNCH_ROLE, { ltiToken })
  if (!result.ok) {
    // Logged because a role lookup that stops working routes every launch to
    // "unsupported role", which looks like a product decision rather than an
    // outage unless somebody can see this line.
    console.error(`[lti-role] ltiLaunchRole failed (${result.error.kind}): ${result.error.message}`)
  }

  const role = result.ok ? (result.data.ltiLaunchRole.role ?? null) : null
  remember(ltiToken, role, now)
  return role
}

function remember(token: string, role: Role | null, now: number): void {
  // Delete first so a re-insert moves to the end of the insertion order.
  cache.delete(token)
  cache.set(token, { role, expiresAt: now + TTL_MS })
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}

/** Test seam. Nothing in the app clears this cache. */
export function __clearLtiRoleCache(): void {
  cache.clear()
}
