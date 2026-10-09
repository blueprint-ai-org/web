/**
 * Transparent access-token refresh, as an Express middleware.
 *
 * The gateway's access token lives exactly **900 seconds** (measured — see
 * `BP_ACCESS_TOKEN_LIFETIME_SECONDS` in `auth.server.ts`). Nothing in the app
 * may surface that number to a user: a tab left open for twenty minutes has to
 * keep working. This middleware is the only thing that makes that true.
 *
 * **Why Express and not a loader (decision D11).** React Router 7 runs the
 * loaders of a matched route tree *in parallel*. A refresh living in a loader
 * would therefore fire N times for one navigation, and because the refresh
 * token **rotates on every use** all but the first call would be reusing a
 * spent token. Express middleware is the only place in this stack that is
 * guaranteed to run exactly once per HTTP request, before any loader.
 *
 * ## What a request sees
 *
 * On a successful refresh the middleware does two things that must both
 * happen, and are easy to get half-right:
 *
 *  1. Appends the new `Set-Cookie` to the response, so the *browser* stops
 *     sending the spent refresh token. `res.append` (not `setHeader`), because
 *     `@react-router/express` also appends its own headers when it sends the
 *     RR response — `sendRemixResponse` loops `res.append(key, value)` — so
 *     both survive, and a route that deliberately clears the cookie
 *     (`/logout`) still wins because its header lands last.
 *  2. Rewrites `req.headers.cookie`, so *this* request's loaders see the fresh
 *     token. `createRemixRequest` builds the RR `Request`'s headers from
 *     `req.headers` at handler time, so a rewrite here is visible to every
 *     loader; without it the whole request would still run on the token we
 *     just replaced, and any gateway call in it would 401.
 *
 * ## Failure is a logout, never an error
 *
 * A refresh can fail for a boring reason (network) or a final one (the refresh
 * family was revoked). Either way the middleware clears the cookie — on the
 * response *and* on `req.headers.cookie` — and calls `next()`. It never
 * throws, never 500s, never redirects. The route gate is what decides where an
 * unauthenticated request goes; a piece of middleware that cannot renew a
 * token has no business making that call.
 *
 * Severity note, because the plan (D11) overstated it: reusing a rotated
 * refresh token revokes the *refresh family* only. Live access tokens keep
 * validating to their 15-minute expiry and an immediate re-login works. So the
 * cost of a lost race is "silently signed out within ≤15 minutes", not a dead
 * account — which is why the error path is a quiet logout rather than anything
 * louder. Measured in
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`
 * ("Refresh reuse revokes the refresh family, NOT the live access token").
 */

import {
  BP_SESSION_MAX_AGE_SECONDS,
  bpSessionCookie,
  clearBpSessionCookie,
  readBpSession,
  sealBpSession,
} from './session.server'
import type { BpSession } from './types'

/**
 * How long before expiry a token counts as "needs refreshing", in seconds.
 *
 * 60s against a 900s lifetime. Wide enough to cover the gateway round-trip
 * plus clock skew between us and the issuer (we compute the expiry from our
 * own `Date.now()` at issue time, so the two clocks are ours only in the happy
 * case), narrow enough that a normal browsing session refreshes about once
 * every fifteen minutes rather than constantly.
 */
export const BP_REFRESH_SKEW_SECONDS = 60

/** Cookie name, kept in sync with `session.server.ts`'s private constant. */
const COOKIE_NAME = 'bp-session'

/**
 * Requests under this prefix are skipped outright.
 *
 * An LTI launch must be byte-identical to what it is today (decision D2), and
 * the nested `CLAUDE.md` calls the `/lti/*` route order load-bearing. The
 * cookie check below would already make every launch a no-op — `bp-session` is
 * `SameSite=Lax`, so Canvas's cross-site POST never carries it — but that is a
 * property of a *browser* honouring an attribute. This prefix check is the
 * property of *this file*, and it is the one a reader can verify locally.
 */
const LTI_PATH_PREFIX = '/lti'

/**
 * The slice of an Express `Request` this middleware touches.
 *
 * Declared structurally rather than imported from `express` for two reasons.
 * `app/**` compiles under `tsconfig.vite.json`, whose `types` omits `node`, so
 * `@types/express` cannot resolve its own `http` dependencies here. And a
 * three-property surface is a far better description of what this middleware
 * needs than the ~80-member Express interface: the tests can hand it a plain
 * object, with no framework in the room.
 *
 * Express's real `Request` is assignable to this (its `headers` is
 * `IncomingHttpHeaders`, which declares `cookie?: string`).
 */
export interface BpRefreshRequest {
  /** Path only, no query string. Express's `req.path`. */
  readonly path: string
  headers: { cookie?: string | undefined }
}

/**
 * The slice of an Express `Response` this middleware touches: appending one
 * header. Declared as a method so its parameters stay bivariant and Express's
 * wider `append(field: string, value?: string[] | string): this` is assignable.
 */
export interface BpRefreshResponse {
  append(field: string, value: string): unknown
}

/** Express's `next`, minus the error-forwarding overload we never use. */
export type BpRefreshNext = () => void

/**
 * In-flight refreshes, keyed by the **spent** refresh token — the value the
 * arriving cookie carried, not the one the gateway returns.
 *
 * That key is the whole point. Two requests that arrive together carry the same
 * cookie, therefore the same refresh token, therefore they collapse onto one
 * upstream call and one rotation. Keying on anything else (user id, session id)
 * would work too, but the refresh token is what the gateway actually
 * invalidates, so it is the honest unit of exclusion.
 *
 * Entries are deleted when the promise settles (see {@link refreshOnce}), so
 * the map holds at most one entry per concurrently-refreshing session and
 * needs no TTL or eviction. The stored promise **never rejects** —
 * {@link performRefresh} resolves `null` on every failure — so an awaiting
 * request can never inherit a throw from a sibling.
 *
 * ### Known limitation: in-process only
 *
 * This is a plain `Map` in one Node process. Two app instances behind a load
 * balancer would each keep their own, and two simultaneous requests routed to
 * different instances would both refresh — the second getting
 * `refresh token reuse detected; family revoked` and signing the user out
 * within ≤15 minutes. Closing that needs a *durable* single-flight store, and
 * this repo already has the pattern for one: `lti/nonce-store.ts` puts
 * short-TTL records in Mongo with a TTL index, which is exactly the shape
 * required (key = refresh token, TTL ≈ 30s, unique index for the claim).
 * Single-instance today, so a Map is the correct amount of machinery; the
 * upgrade path is named here so it is a known cost rather than a surprise.
 *
 * A second, narrower window survives even the durable version: a request that
 * was already on the wire when the rotation completed still carries the spent
 * token, arrives after the map entry is gone, and fails its own refresh. The
 * window is one round-trip wide and its cost is the same quiet logout. Fixing
 * *that* means caching old-token → new-session for a few seconds, which is a
 * different design with a different security story (a spent refresh token
 * would keep buying sessions), so it is deliberately not done here.
 */
const inFlight = new Map<string, Promise<BpSession | null>>()

/** True when `part` is a `name=value` pair for exactly `name`. */
function isNamed(part: string, name: string): boolean {
  const eq = part.indexOf('=')
  return eq !== -1 && part.slice(0, eq) === name
}

/**
 * Rewrite one cookie inside a raw `Cookie` request header, leaving every other
 * cookie in place — `lti-claims` and the theme cookie ride in the same header
 * and must survive untouched.
 *
 * `value === null` removes the cookie. Returns `undefined` when nothing is
 * left, which is what `req.headers.cookie` should be for "no cookies at all".
 *
 * No encoding is applied: the value is always a compact JWS (base64url and
 * dots, every character cookie-safe), which is also why it round-trips through
 * `readBpSession`'s `decodeURIComponent`.
 */
function rewriteCookieHeader(
  header: string,
  name: string,
  value: string | null,
): string | undefined {
  const kept = header
    .split(/;\s*/)
    .filter((part) => part.length > 0 && !isNamed(part, name))
  if (value !== null) kept.push(`${name}=${value}`)
  return kept.length > 0 ? kept.join('; ') : undefined
}

/**
 * True when `session`'s access token is expired or about to be.
 *
 * `accessTokenExpiresAt` is epoch **milliseconds** (`types.ts`), so the skew
 * has to be scaled — treating it as seconds would compare a 13-digit number
 * against a 10-digit one and refresh on literally every request.
 *
 * `<=` rather than `<`, and no lower bound: an *already* expired token still
 * refreshes, which is the case a user coming back to a stale tab actually hits.
 */
export function bpAccessTokenNeedsRefresh(session: BpSession, now: number = Date.now()): boolean {
  return session.accessTokenExpiresAt - now <= BP_REFRESH_SKEW_SECONDS * 1000
}

/**
 * Run one refresh upstream. Resolves `null` for every failure, and **never
 * rejects** — see the note on {@link inFlight}.
 *
 * `auth.server.ts` is imported *lazily*, on the first refresh this process ever
 * performs, and that is deliberate. It reaches `config.server.ts`, which
 * validates `BP_AI_GRAPHQL_URL` at module evaluation and throws when it is
 * missing. A static import here would put that throw in `server.ts`'s import
 * graph and make the variable mandatory to **boot** — an LTI-only deploy that
 * never touches credential login would stop starting, which is exactly the
 * breach of D2 that `session.server.ts` avoids by reading its secret lazily.
 * Deferred, the same misconfiguration surfaces as one failed refresh (a
 * logout) instead of a dead server.
 */
async function performRefresh(refreshToken: string): Promise<BpSession | null> {
  try {
    const { bpRefresh, bpSessionFromPayload } = await import('./auth.server')
    const result = await bpRefresh(refreshToken)
    if (!result.ok) {
      // `unauthenticated` here is usually the rotation race — the family was
      // revoked because this token had already been spent. Logged at warn
      // level, not error: the user-visible outcome is a re-login, and the
      // gateway's own message is the only thing that distinguishes causes.
      console.warn(
        `[bp-refresh] refresh failed (${result.error.kind}): ${result.error.message}`,
      )
      return null
    }
    return bpSessionFromPayload(result.data)
  } catch (error) {
    // Only reachable through the lazy import above (a missing
    // `BP_AI_GRAPHQL_URL`) — `bpRefresh` itself resolves rather than throws.
    console.error('[bp-refresh] refresh threw:', error)
    return null
  }
}

/**
 * Single-flight wrapper around {@link performRefresh}: concurrent callers
 * holding the same refresh token share one upstream call and one rotation.
 *
 * The `.finally` cleanup and the `set` both operate on the *tracked* promise,
 * so the entry is guaranteed gone by the time any awaiter resumes — a request
 * arriving later refreshes for itself rather than awaiting a settled promise
 * whose token is already spent.
 */
function refreshOnce(refreshToken: string): Promise<BpSession | null> {
  const pending = inFlight.get(refreshToken)
  if (pending) return pending

  const tracked = performRefresh(refreshToken).finally(() => {
    inFlight.delete(refreshToken)
  })
  inFlight.set(refreshToken, tracked)
  return tracked
}

/** Test seam: assert the map is empty, i.e. that nothing leaked. */
export function bpRefreshInFlightCount(): number {
  return inFlight.size
}

/**
 * Express middleware. Mounted ahead of the React Router handler in
 * `server.ts`; see that file for why it sits where it does.
 *
 * Calls `next()` exactly once on every path through, including every failure.
 * A request that carries no `bp-session` cookie leaves here having cost two
 * string comparisons.
 */
export async function bpRefreshMiddleware(
  req: BpRefreshRequest,
  res: BpRefreshResponse,
  next: BpRefreshNext,
): Promise<void> {
  // 1. Never touch an LTI launch.
  if (req.path === LTI_PATH_PREFIX || req.path.startsWith(`${LTI_PATH_PREFIX}/`)) {
    next()
    return
  }

  // 2. No credential session in play — the overwhelmingly common case, and it
  //    must stay free. A substring test before any parsing or crypto.
  const cookieHeader = req.headers.cookie
  if (!cookieHeader || !cookieHeader.includes(`${COOKIE_NAME}=`)) {
    next()
    return
  }

  try {
    // `readBpSession` takes a web `Request` and only ever reads its `cookie`
    // header, so a throwaway one is the cheapest way to reuse the verified
    // reader instead of re-implementing cookie parsing and `jwtVerify` here.
    // The URL is never inspected.
    const session = await readBpSession(
      new Request('http://bp-refresh.internal/', { headers: { cookie: cookieHeader } }),
    )

    // Unreadable, expired-seal, or wrong-shape cookie: not our problem to fix.
    // There is no refresh token to spend, so there is nothing to refresh. The
    // cookie is left in place — deleting it is the route gate's call, and
    // `readBpSession` already reports it as "no session" to every loader.
    if (!session) {
      next()
      return
    }

    if (!bpAccessTokenNeedsRefresh(session)) {
      next()
      return
    }

    const refreshed = await refreshOnce(session.refreshToken)

    if (!refreshed) {
      // Refresh is unrecoverable for this session. Strip the cookie from both
      // directions so the request continues genuinely unauthenticated: leaving
      // it on `req` would let loaders read a session whose access token is
      // seconds from expiry and whose refresh token is spent, turning one
      // clean redirect to `/login` into a page of failing gateway calls.
      res.append('Set-Cookie', clearBpSessionCookie())
      req.headers.cookie = rewriteCookieHeader(cookieHeader, COOKIE_NAME, null)
      next()
      return
    }

    // `sealBpSession` is the one call here that can still throw (a missing or
    // LTI-colliding `BP_SESSION_SECRET`), which is why it is inside the try:
    // holding a rotated pair we cannot persist is a logout, not a 500.
    const sealed = await sealBpSession(refreshed)

    // The cookie's own lifetime tracks the refresh token, so a refresh
    // re-arms the full 30 days — the session is demonstrably alive.
    res.append('Set-Cookie', bpSessionCookie(sealed, BP_SESSION_MAX_AGE_SECONDS))
    req.headers.cookie = rewriteCookieHeader(cookieHeader, COOKIE_NAME, sealed)
  } catch (error) {
    // Belt and braces: nothing above is expected to throw, and if something
    // does, a signed-in user must still get a page. Clear rather than keep —
    // whatever failed, we can no longer vouch for the session.
    console.error('[bp-refresh] middleware failed, continuing unauthenticated:', error)
    try {
      res.append('Set-Cookie', clearBpSessionCookie())
      req.headers.cookie = rewriteCookieHeader(cookieHeader, COOKIE_NAME, null)
    } catch {
      // The response is already committed. Nothing left to do but continue.
    }
  }

  next()
}
