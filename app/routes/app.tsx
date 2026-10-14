import { useEffect } from 'react'
import { redirect } from 'react-router'
import type { Route } from './+types/app'
import { getAppSession, getRoleFor } from '~/lib/session.server'
import { pathForRole } from '~/lib/personas'

/**
 * The landing route of a Canvas launch: resolve the persona, then redirect.
 *
 * The `switch` that used to live here — six cases mapping a locally classified
 * role onto a path — is gone. `getRoleFor` asks the gateway (which asks
 * lms-connector, the one classifier left) and `pathForRole` owns the mapping,
 * shared with `/` and `/unsupported-role`. The three copies had already
 * drifted: this one sent students to `ONBOARDING_FIRST_PATH` and `/` sent them
 * to a hard-coded `/student/onboarding/welcome`.
 *
 * A launching student still lands in onboarding EVERY time. Since step-22 the
 * credential path asks the gateway whether onboarding is done
 * (`me.user.onboardingCompletedAt`, in `/student`'s loader), but a launch holds
 * Canvas claims and no BP AI token, so there is nobody to ask. Closing that
 * needs a launch → BP AI token exchange, which is out of scope here.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAppSession(request)
  if (!session || session.kind !== 'lti')
    throw new Response('No active LTI session', {
      status: 401,
      headers: { 'Content-Security-Policy': 'frame-ancestors https://*.instructure.com' },
    })

  const role = await getRoleFor(session)

  // Forward the URL token through the redirect so cookieless browsers
  // (Safari ITP, Firefox Strict ETP) — which may drop the lti-claims cookie
  // in iframe context — still resolve a session on the persona route.
  const sessionToken = new URL(request.url).searchParams.get('lti_session')
  const qs = sessionToken ? `?lti_session=${encodeURIComponent(sessionToken)}` : ''

  throw redirect(`${pathForRole(role)}${qs}`)
}

export default function AppPage() {
  // The loader always redirects or throws 401, so this component is only
  // a fallback if React Router renders before the redirect resolves.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.search.includes('lti_session=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])
  return null
}

export function headers() {
  return {
    'Content-Security-Policy': "frame-ancestors https://*.instructure.com",
  }
}
