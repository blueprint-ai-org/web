/**
 * The app's single "is anyone here?" question, answered across both session
 * systems.
 *
 * This module **composes** the two readers; it does not replace or reshape
 * either one. `app/lib/lti-session.server.ts` and
 * `app/lib/bp-ai/session.server.ts` are both untouched by design (decisions D2
 * and D10) — the LTI reader because every Canvas launch depends on it and the
 * TC-3 / Safari-ITP regression surface has to stay out of the blast radius, the
 * BP AI reader because its whole value is that it cannot break the other one.
 * Everything new lives here, in a file no LTI code imports.
 *
 * The three exports answer the three questions a gate actually has:
 *
 *   - {@link getAppSession} — *who is this?*
 *   - {@link getRoleFor} — *what may they see?*
 *   - {@link isEmbeddedLtiRequest} — *and if nobody is here, is sending them to
 *     `/login` a kindness or a trap?*
 *
 * The backend's LTI→JWT exchange (`loginLti`, step-15) lands here as
 * {@link bpSessionOf}: a launch keeps its `lti` kind — it is still a Canvas
 * launch, with no cookie of ours to log out of — but now also has a BP AI
 * session for the loaders that read the gateway.
 */

import { Role } from './bp-ai/gql/schema'
import { bpLtiSession } from './bp-ai/lti-login.server'
import { bpLtiLaunchRole } from './bp-ai/lti-role.server'
import { readBpSession } from './bp-ai/session.server'
import type { BpSession } from './bp-ai/types'
import { getLtiToken } from './lti-session.server'

/**
 * The verified Canvas claims blob, as `getLtiToken` actually types it.
 *
 * Derived from the function rather than declared, deliberately: `getLtiToken`
 * returns `payload.token` through an `any` cast it inherits from ltijs's
 * untyped claim bag (`lti-session.server.ts:20`), and that file must stay
 * byte-identical. Restating the shape here would be a second, drifting source
 * of truth for something we do not control; `_persona.tsx` has typed its
 * `token` this exact way since it was written, and this alias just names the
 * convention instead of repeating it.
 */
export type LtiToken = Awaited<ReturnType<typeof getLtiToken>>

/** A Canvas launch: LTI claims, resolved from the URL token or the cookie. */
export interface LtiAppSession {
  kind: 'lti'
  token: LtiToken
  /**
   * The raw `lti-claims` JWT the claims came from, when we could tell which
   * transport won.
   *
   * Needed because the role is no longer classified here: `ltiLaunchRole` takes
   * the token and lms-connector verifies it again. Nothing in this app decodes
   * it — it is carried, not read.
   */
  raw: string | null
}

/** A credential login: a BP AI token pair sealed in the `bp-session` cookie. */
export interface BpAppSession {
  kind: 'bp'
  session: BpSession
}

/**
 * Either way into the app. A discriminated union rather than a merged shape,
 * because the two carry genuinely different things — Canvas claims versus
 * bearer tokens — and every consumer wants to know which it got.
 */
export type AppSession = LtiAppSession | BpAppSession

/** `'lti' | 'bp'` — the discriminant, named so contexts can carry it alone. */
export type AppSessionKind = AppSession['kind']

/**
 * Resolve whoever is behind this request, LTI or credential, or `null`.
 *
 * **LTI is tried first, and the order is load-bearing.** If a developer logs in
 * with credentials and then launches the same tool from Canvas in the same
 * browser, both cookies exist at once — and in that case the launch must behave
 * exactly as it does today (D2). Checking LTI first makes that structural: the
 * presence of a `bp-session` cookie can never change what a Canvas launch
 * resolves to. The reverse order would have let our cookie shadow a real
 * launch, which is precisely the class of surprise D2 exists to prevent.
 *
 * Never throws. Both readers already swallow every failure into `null`
 * (bad signature, expired seal, missing secret), so this inherits that
 * contract: a caller gates on `null` and nothing else.
 *
 * Note that an expired *access* token still resolves to a session here — the
 * `bp-session` cookie tracks the 30-day refresh token, and Phase 4's Express
 * middleware has already refreshed the access token by the time any loader
 * runs. "Needs a refresh" is not "logged out", and this function must not
 * conflate them.
 */
export async function getAppSession(request: Request): Promise<AppSession | null> {
  const token = await getLtiToken(request)
  if (token) return { kind: 'lti', token, raw: rawLtiToken(request) }

  const session = await readBpSession(request)
  if (session) return { kind: 'bp', session }

  return null
}

/**
 * The raw launch JWT, by the same precedence `getLtiToken` uses: the URL token
 * first, the `lti-claims` cookie second.
 *
 * A fifth copy of the cookie loop, for the reason the other four are copies:
 * the alternative is editing `lti-session.server.ts`, which this module exists
 * not to touch.
 *
 * **It can disagree with `getLtiToken` in one case** — a `?lti_session=` that
 * is present but expired, where `getLtiToken` falls through to a valid cookie
 * and this returns the dead URL token. The consequence is bounded: the role
 * lookup fails and the launch lands on `/unsupported-role`, which is where a
 * launch with no resolvable role goes anyway. Reproducing the fallthrough
 * faithfully would mean verifying the token a second time here, with a second
 * copy of `LTI_KEY` — a real signing path added to avoid a redirect.
 */
function rawLtiToken(request: Request): string | null {
  const fromUrl = new URL(request.url).searchParams.get('lti_session')
  if (fromUrl) return fromUrl
  return readCookieValue(request.headers.get('cookie'), 'lti-claims')
}

function readCookieValue(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1))
  }
  return null
}

/**
 * Which role a session carries, or `null` when nobody will say.
 *
 * Both halves changed in step-7, and in the same direction: the answer now
 * comes from the server in both cases.
 *
 * **A credential session reads its own `role` claim.** It used to be the
 * constant `'student'` (decision D5) — honest only while the gateway's `login`
 * carried no role and students were the only people who could use one. It
 * carries one now, so a teacher logging in with a password lands in the teacher
 * app instead of in a child's onboarding flow.
 *
 * **A launch asks `ltiLaunchRole`**, which is lms-connector's `CanonicalRole`
 * — the classifier this app used to duplicate in `lib/roles.ts`. Hence
 * `async`: every caller is a loader and already awaits, and the lookup is
 * cached per launch token.
 *
 * `null` means "no supported persona", from any cause: a role this app has no
 * screens for, a launch the gateway refused, or a gateway that did not answer.
 * The caller sends all three to `/unsupported-role` rather than guessing, and
 * `personaFor` in `lib/personas.ts` is where "has screens" is decided.
 */
export async function getRoleFor(session: AppSession): Promise<Role | null> {
  if (session.kind === 'bp') return session.session.role
  return session.raw ? bpLtiLaunchRole(session.raw) : null
}

/**
 * The BP AI session behind a request, whichever way it came in, or `null`.
 *
 * A credential login carries its own. A Canvas launch is exchanged once
 * (`loginLti`, cached per launch token in `lti-login.server.ts`) — except an
 * ADMIN launch, which signs in through `signupCanvas` and which `loginLti`
 * refuses, so asking would only spend the rate-limit budget on a known "no".
 *
 * `null` means every loader's existing empty state: no session, a launch the
 * gateway would not place, or a gateway that did not answer. Never throws.
 */
export async function bpSessionOf(session: AppSession | null): Promise<BpSession | null> {
  if (!session) return null
  if (session.kind === 'bp') return session.session
  if (!session.raw) return null

  const role = await bpLtiLaunchRole(session.raw)
  if (!role || role === Role.Admin) return null
  return bpLtiSession(session.raw)
}

/**
 * Presence-only cookie scan, over the same loop {@link readCookieValue} uses.
 *
 * It answers presence rather than value because a cookie we cannot verify still
 * tells us where the request came from — an empty `lti-claims=` counts.
 */
function hasCookie(header: string | null, name: string): boolean {
  return readCookieValue(header, name) !== null
}

/** Canvas hosts, for the `Referer` signal below. */
function isCanvasHost(hostname: string): boolean {
  return hostname === 'instructure.com' || hostname.endsWith('.instructure.com')
}

/**
 * Does this request come from inside Canvas?
 *
 * Only ever asked when there is **no** session, and only to choose between two
 * failures. The distinction matters more than it looks:
 *
 *   - In a normal tab, `/login` is the whole point of this plan — a bare 401
 *     there is a dead end with a working door right next to it.
 *   - Inside the Canvas iframe, `/login` is a *trap*. The `bp-session` cookie
 *     is `SameSite=Lax`, so a cross-site iframe would never receive it: the
 *     user would type real credentials, watch the form succeed, and land back
 *     at a login screen with no explanation. The existing 401 is the honest
 *     answer, and keeping it means Canvas behaviour is unchanged (D2).
 *
 * Four signals, cheapest first. Any one is sufficient — this is a question
 * about provenance, and each of these is only produced by a launch context:
 *
 *   1. `?lti_session=` in the URL. Present even when the JWT inside it is
 *      expired or malformed, which is exactly the case that reaches here.
 *   2. An `lti-claims` cookie. Same: presence proves provenance even when the
 *      value no longer verifies. Every browser that accepts third-party cookies
 *      in an iframe (Chrome by default) hits this arm.
 *   3. `Sec-Fetch-Dest: iframe`. The browser stating that this document is
 *      being loaded into a frame — the signal that covers the Safari ITP
 *      reload, where both transports above are gone.
 *   4. A `Referer` on a Canvas host, for the in-iframe navigation that carries
 *      one.
 *
 * **Accepted residual**, stated rather than papered over: a browser that sends
 * no `Sec-Fetch-*` headers (Safari before 16.4), reloading inside the iframe,
 * with the cookie dropped and no URL token and no referrer, will now be
 * redirected to `/login` instead of shown the 401. That exact combination is
 * the "known limitation" already documented on `_persona.tsx`'s
 * `shouldRevalidate` — it was a broken page before this change and it is a
 * misleading page after it. Widening the net to catch it (treating any
 * `Sec-Fetch-Site: cross-site` document as embedded) would 401 real credential
 * users arriving from an emailed link, which is a live case traded against a
 * dead one.
 */
export function isEmbeddedLtiRequest(request: Request): boolean {
  if (new URL(request.url).searchParams.has('lti_session')) return true

  if (hasCookie(request.headers.get('cookie'), 'lti-claims')) return true

  const dest = request.headers.get('sec-fetch-dest')
  if (dest === 'iframe' || dest === 'frame') return true

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      if (isCanvasHost(new URL(referer).hostname)) return true
    } catch {
      // A malformed Referer tells us nothing. Fall through.
    }
  }

  return false
}
