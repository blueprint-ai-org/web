/**
 * The `bp-session` cookie codec — the credential-side sibling of
 * `lti/session.ts` + `app/lib/lti-session.server.ts`.
 *
 * **The two session systems are deliberately separate (decision D10).** They
 * share no secret, no cookie name, no payload shape and no reader. An LTI
 * launch never sees this cookie, and a credential login never sees
 * `lti-claims`. The separation is enforced three ways:
 *
 *   1. A distinct signing secret, `BP_SESSION_SECRET`, never `LTI_KEY` — and
 *      `bpSecret()` refuses to run if the two are set to the same value.
 *   2. A distinct claim set. Note there is no `token` claim here: `getLtiToken`
 *      returns `payload.token`, so a bp-session payload yields `null` from it
 *      even in the impossible case that the signatures ever agreed.
 *   3. `SameSite=Lax`, not the LTI cookie's `SameSite=None`. `/login` and
 *      `/signup` are top-level pages by definition (D1), so there is no reason
 *      to ship this cookie on cross-site subrequests the way the Canvas
 *      iframe forces us to for `lti-claims`.
 *
 * Two lifetimes live in here and must not be confused:
 *
 *   - **The seal / cookie lifetime** (`BP_SESSION_MAX_AGE_SECONDS`, 30 days) is
 *     the JWT's own `exp` and the cookie's `Max-Age`. It tracks the *refresh*
 *     token, because the cookie stays useful for exactly as long as the refresh
 *     token inside it can still buy a new access token.
 *   - **`access_expires_at`** is a payload *field*, not the JWT `exp`. It says
 *     when the ~15-minute access token goes stale, which is the signal Phase 4's
 *     refresh middleware reads. `readBpSession` deliberately does **not** reject
 *     a session whose access token has expired — that session is refreshable,
 *     not dead, and only the caller can decide which.
 *
 * Contract source of truth (measured, not documented):
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`.
 */

import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

import type { BpSession } from './types'

const COOKIE_NAME = 'bp-session'

/**
 * Seal and cookie lifetime, in seconds.
 *
 * 30 days, matching the refresh token's documented lifetime. Unlike the access
 * token's 900s this number is *not* measured — the refresh token is opaque
 * 64-char hex, so there is nothing to decode and the Phase 0 spike could not
 * confirm it. If the gateway's real refresh window turns out to be shorter, a
 * cookie can outlive its refresh token; the failure mode is a normal
 * `unauthenticated` on the next refresh, which Phase 4 already has to handle.
 */
export const BP_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

/**
 * Resolve the HS256 signing key.
 *
 * Read per call rather than once at module evaluation — deliberately unlike
 * `config.server.ts`, which validates `BP_AI_GRAPHQL_URL` eagerly and throws at
 * import time. Two reasons:
 *
 *   - Phase 3 imports this module from route modules. An import-time throw
 *     would make `BP_SESSION_SECRET` mandatory to *boot*, so an LTI-only deploy
 *     that never uses credential login would stop starting — a direct breach of
 *     D2 ("the LTI path is untouched").
 *   - `readBpSession` must never throw. A lazy read lets it swallow the
 *     misconfiguration as `null` (logged out) while `sealBpSession` still fails
 *     loudly, which is the correct asymmetry: never mint a session we cannot
 *     protect, but never 500 a page over a cookie we cannot read.
 */
function bpSecret(): Uint8Array {
  const secret = process.env.BP_SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error(
      'Missing env BP_SESSION_SECRET — required to sign the bp-session cookie. See .env.example.',
    )
  }
  if (secret === process.env.LTI_KEY?.trim()) {
    throw new Error(
      'BP_SESSION_SECRET must not equal LTI_KEY — a shared secret is the one way the ' +
        'LTI and BP AI sessions could cross-authenticate. Generate a separate one: ' +
        'openssl rand -hex 32',
    )
  }
  return new TextEncoder().encode(secret)
}

/**
 * The sealed payload, snake_case because it is a *serialized* format — the same
 * boundary convention Phase 1 set with `AuthPayload` (wire, snake_case) versus
 * `BpSession` (in-memory, camelCase).
 *
 * `access_token` holds what the gateway calls `token`; the rename happens here,
 * once, and is the reason a bp-session payload can never satisfy `getLtiToken`.
 * `access_expires_at` is epoch **milliseconds**, carried straight through from
 * `BpSession.accessTokenExpiresAt` — not the seconds a JWT `exp` would use.
 *
 * A `type`, not an `interface`, so it satisfies `jose`'s `JWTPayload` index
 * signature without a cast — only object-literal type aliases get an implicit
 * index signature.
 */
type BpSessionClaims = {
  access_token: string
  refresh_token: string
  user_id: string
  tenant: string
  access_expires_at: number
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Accept a verified payload only if all five fields survived intact. A valid
 * signature over the wrong shape (an `lti-claims` payload re-signed with our
 * secret, a payload from an older seal format) must read as "no session"
 * rather than as a half-populated `BpSession`.
 */
function isBpSessionClaims(payload: JWTPayload): payload is JWTPayload & BpSessionClaims {
  return (
    nonEmptyString(payload.access_token) &&
    nonEmptyString(payload.refresh_token) &&
    nonEmptyString(payload.user_id) &&
    nonEmptyString(payload.tenant) &&
    typeof payload.access_expires_at === 'number' &&
    Number.isFinite(payload.access_expires_at)
  )
}

/**
 * Read one cookie out of a `Cookie` header.
 *
 * Copied from `app/lib/lti-session.server.ts:5-13` rather than shared, exactly
 * as `app/lib/theme-cookie.server.ts:29-37` already copies it. Extracting it
 * would mean editing the LTI reader, and the whole point of D10 is that this
 * file cannot break that one. Nine duplicated lines are the cheaper trade, and
 * they are the reason this phase needs no cookie-parser dependency.
 */
function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1))
  }
  return null
}

/**
 * Sign a `BpSession` into the opaque string that goes in the cookie.
 *
 * Throws if `BP_SESSION_SECRET` is missing or equal to `LTI_KEY` — a
 * misconfigured deploy must fail at the login attempt, not mint sessions
 * anyone could forge.
 */
export async function sealBpSession(session: BpSession): Promise<string> {
  const claims: BpSessionClaims = {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    user_id: session.userId,
    tenant: session.tenant,
    access_expires_at: session.accessTokenExpiresAt,
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + BP_SESSION_MAX_AGE_SECONDS)
    .sign(bpSecret())
}

/**
 * Resolve the active BP AI session for this request, or `null`.
 *
 * **Never throws** — mirroring `getLtiToken`'s forgiving contract
 * (`app/lib/lti-session.server.ts:39-52`). Absent cookie, bad signature,
 * expired seal, wrong shape, missing or misconfigured secret all read the same
 * way: no session. Callers gate on `null`, never on an exception.
 *
 * Cookie-only, with no `?bp_session=` URL fallback. The LTI reader needs that
 * second transport because Safari ITP drops cookies in Canvas's iframe; these
 * pages are top-level (D1), so the cookie always arrives.
 */
export async function readBpSession(request: Request): Promise<BpSession | null> {
  const raw = readCookie(request.headers.get('cookie'), COOKIE_NAME)
  if (!raw) return null

  try {
    const { payload } = await jwtVerify(raw, bpSecret(), { algorithms: ['HS256'] })
    if (!isBpSessionClaims(payload)) return null
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      userId: payload.user_id,
      tenant: payload.tenant,
      accessTokenExpiresAt: payload.access_expires_at,
    }
  } catch {
    return null
  }
}

/**
 * Build the `Set-Cookie` header value carrying a sealed session.
 *
 * `bp-session=<jwt>; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax; Secure`
 *
 * Attribute order follows `serializeThemeCookie`
 * (`app/lib/theme-cookie.server.ts:89-92`) and is asserted verbatim in the
 * tests, so a silent change to any attribute fails a check rather than a
 * browser. `HttpOnly` because the payload holds bearer tokens and nothing in
 * the browser has any business reading them. `SameSite=Lax`, not the LTI
 * cookie's `None`. The value needs no escaping — a compact JWS is base64url
 * plus dots, every character cookie-safe.
 */
export function bpSessionCookie(
  value: string,
  maxAge: number = BP_SESSION_MAX_AGE_SECONDS,
): string {
  return `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax; Secure`
}

/**
 * Build the `Set-Cookie` header value that removes the session.
 *
 * `Max-Age=0` with an empty value. Every other attribute must match
 * {@link bpSessionCookie} or the browser keeps the original cookie instead of
 * overwriting it.
 */
export function clearBpSessionCookie(): string {
  return bpSessionCookie('', 0)
}
