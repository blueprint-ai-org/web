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
 * When the backend ships an LTI→JWT exchange this module is the seam that
 * collapses: one session kind, and `getRoleFor`'s branch goes away.
 */

import { readBpSession } from './bp-ai/session.server'
import type { BpSession } from './bp-ai/types'
import { getLtiToken } from './lti-session.server'
import { classifyRole, type KnownRole } from './roles'

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
  if (token) return { kind: 'lti', token }

  const session = await readBpSession(request)
  if (session) return { kind: 'bp', session }

  return null
}

/**
 * Which persona a session may see.
 *
 * LTI sessions go through {@link classifyRole} unchanged — same claims, same
 * precedence, same six outcomes as before this module existed.
 *
 * **Credential sessions are always `'student'` (D5).** Not a placeholder: the
 * gateway's `signup`/`login` carry no role at all, and the student flow is the
 * only UI reachable without a Canvas launch. There is nothing to infer from and
 * nowhere else to go, so the constant is the honest answer rather than a
 * lookup that would pretend otherwise. When teachers need direct login this is
 * the one line that has to change, and it should change alongside a real role
 * claim on the API — not before.
 */
export function getRoleFor(session: AppSession): KnownRole {
  if (session.kind === 'bp') return 'student'

  return classifyRole({
    roles: session.token.platformContext?.roles ?? [],
    customFields: session.token.platformContext?.custom ?? {},
  })
}

/**
 * Presence-only cookie scan.
 *
 * A fourth copy of the nine-line loop in `lti-session.server.ts:5-13`,
 * `theme-cookie.server.ts:29-37` and `bp-ai/session.server.ts:140-148` — and
 * for the same reason each of those is a copy: extracting it would mean editing
 * the LTI reader, which is the one file this whole design promises not to
 * touch. This variant answers presence, not value, because a cookie we cannot
 * verify still tells us where the request came from.
 */
function hasCookie(header: string | null, name: string): boolean {
  if (!header) return false
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === name) return true
  }
  return false
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
