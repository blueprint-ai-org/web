/**
 * Shared persona layout for `/teacher`, `/student/*` and `/counselor/*`.
 *
 * Pathless layout (filename starts with `_`) — owns the session gate, the
 * theme-mode cookie read, the Canvas header chrome, and the `frame-ancestors`
 * CSP that lets Canvas embed us in an iframe.
 *
 * The gate accepts **either** session: a Canvas LTI launch or a credential
 * login (`getAppSession`). Neither reader knows about the other; see
 * `app/lib/session.server.ts` for why that composition lives outside both.
 *
 * Child routes consume `{ token, themeMode, sessionKind }` via
 * `useOutletContext`.
 */

import { Outlet, redirect, useOutletContext } from 'react-router'
import type { ShouldRevalidateFunction } from 'react-router'
import type { Route } from './+types/_persona'
import { CanvasHeader } from '~/components/dashboard/CanvasHeader'
import { bpProfile } from '~/lib/bp-ai/profile.server'
import { getAppSession, getRoleFor, isEmbeddedLtiRequest } from '~/lib/session.server'
import type { AppSession, AppSessionKind, LtiToken } from '~/lib/session.server'
import { preferredName } from '~/lib/student/display-name'
import { readThemeMode } from '~/lib/theme-cookie.server'
import type { ThemeMode } from '~/lib/theme-types'

export type PersonaOutletContext = {
  /**
   * The Canvas claims blob, or `null` on a credential session — there are no
   * LTI claims to hand out when nobody launched from Canvas. Nothing in the
   * student subtree reads it today; `sessionKind` is the field to branch on.
   */
  token: LtiToken | null
  themeMode: ThemeMode
  /**
   * Which way in the user came. The one thing a screen needs it for so far is
   * deciding whether there is a session of *ours* to end — see the log-out
   * control in `settings/SettingsPage.tsx`.
   */
  sessionKind: AppSessionKind
  /**
   * What to call this person, or `null` when no session we hold knows.
   *
   * Resolved server-side because only the server can see the LTI claims and
   * hold the access token that `getUser` needs. It replaces the onboarding
   * screen that used to ask (removed 2026-09-23) — see
   * `~/lib/student/display-name.ts`.
   */
  profileName: string | null
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAppSession(request)
  if (!session) {
    // Inside the Canvas iframe, keep the 401 exactly as it was: `/login` is
    // unusable there (the `bp-session` cookie is SameSite=Lax and would never
    // arrive), so redirecting would replace a blunt error with a misleading
    // one. Everywhere else there is finally somewhere to send people.
    if (isEmbeddedLtiRequest(request)) {
      throw new Response('No active LTI session', {
        status: 401,
        headers: { 'Content-Security-Policy': 'frame-ancestors https://*.instructure.com' },
      })
    }
    throw redirect('/login')
  }

  const role = getRoleFor(session)
  const themeMode = readThemeMode(request, role)
  return {
    token: session.kind === 'lti' ? session.token : null,
    themeMode,
    role,
    sessionKind: session.kind,
    profileName: await resolveProfileName(session),
  }
}

/**
 * The name to greet this person with, from whichever session they arrived on.
 *
 * **One gateway call per document load, not per navigation.** `shouldRevalidate`
 * below already skips this loader on client-side GETs, which is what keeps a
 * `getUser` off every step of onboarding.
 *
 * **A failure is `null`, never a thrown error.** Not knowing someone's name is
 * a cosmetic problem — the surfaces that use it have their own default — and
 * failing the whole persona layout over it would turn a blank greeting into a
 * blank app. The failure is logged because a `getUser` that stops working is
 * worth noticing, and invisible otherwise.
 */
async function resolveProfileName(session: AppSession): Promise<string | null> {
  if (session.kind === 'lti') {
    const info = session.token?.userInfo
    return preferredName({ ltiGivenName: info?.given_name, ltiName: info?.name })
  }

  const result = await bpProfile(session.session.accessToken, session.session.userId)
  if (!result.ok) {
    console.error(`[_persona] getUser failed (${result.error.kind}): ${result.error.message}`)
    return null
  }
  return preferredName({ firstName: result.data.firstName, displayName: result.data.displayName })
}

// The LTI session gate (loader above) re-runs on every client navigation by
// default. Inside the Canvas iframe in Safari the `lti-claims` cookie is
// dropped (ITP) and `navigate()` does not carry the `?lti_session=` URL token,
// so a revalidation `.data` request has no session and 401s — surfacing the
// root ErrorBoundary "An unexpected error occurred." mid-onboarding.
// The session is established once at the initial SSR document load and does not
// change between persona sub-routes, so we skip revalidating it on plain GET
// navigations. Submissions (e.g. the /api/theme POST) must still revalidate so
// `themeMode` updates live.
//
// Known limitation: a full page reload inside the Safari iframe is a fresh
// document GET with no cookie and no URL token, so it still hits the gate 401.
// That residual case needs a CHIPS `Partitioned` cookie or the Storage Access
// API and is tracked as a follow-up (out of scope here).
// See thoughts/sergio/research/2026-05-31-onboarding-next-button-broken.md
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  defaultShouldRevalidate,
}) => {
  if (formMethod && formMethod.toUpperCase() !== 'GET') {
    return defaultShouldRevalidate
  }
  return false
}

export function headers() {
  return {
    'Content-Security-Policy': 'frame-ancestors https://*.instructure.com',
  }
}

export default function PersonaLayout({ loaderData }: Route.ComponentProps) {
  const { token, themeMode, role, sessionKind, profileName } = loaderData
  const ctx: PersonaOutletContext = { token, themeMode, sessionKind, profileName }
  const scopeClass =
    role === 'student' ? 'student-dark'
    : themeMode === 'light' ? 'counselor-light'
    : ''
  return (
    <>
      <CanvasHeader />
      <div className={scopeClass}>
        <Outlet context={ctx} />
      </div>
    </>
  )
}

/** Typed accessor for child routes that need the persona context. */
export function usePersonaContext(): PersonaOutletContext {
  return useOutletContext<PersonaOutletContext>()
}
