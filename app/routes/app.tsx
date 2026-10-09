import { useEffect } from 'react'
import { redirect } from 'react-router'
import type { Route } from './+types/app'
import { getLtiToken } from '../lib/lti-session.server'
import { classifyRole } from '~/lib/roles'
import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2'

export async function loader({ request }: Route.LoaderArgs) {
  const token = await getLtiToken(request)
  if (!token)
    throw new Response('No active LTI session', {
      status: 401,
      headers: { 'Content-Security-Policy': 'frame-ancestors https://*.instructure.com' },
    })

  const role = classifyRole({
    roles: token.platformContext?.roles ?? [],
    customFields: token.platformContext?.custom ?? {},
  })

  // Forward the URL token through the redirect so cookieless browsers
  // (Safari ITP, Firefox Strict ETP) — which may drop the lti-claims cookie
  // in iframe context — still resolve a session on the persona route.
  const sessionToken = new URL(request.url).searchParams.get('lti_session')
  const qs = sessionToken ? `?lti_session=${encodeURIComponent(sessionToken)}` : ''

  switch (role) {
    case 'teacher':
      throw redirect(`/teacher${qs}`)
    case 'counselor':
      throw redirect(`/counselor${qs}`)
    case 'student':
      throw redirect(`${ONBOARDING_FIRST_PATH}${qs}`)
    case 'parent':
      throw redirect(`/parent${qs}`)
    case 'admin':
      throw redirect(`/counselor${qs}`)
    default:
      throw redirect(`/unsupported-role${qs}`)
  }
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
