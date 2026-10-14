/**
 * `/student/onboarding/complete` — onboarding step 9 (prototype `#s7`).
 * "+10 Sparkz · Set-up Complete"; "Start with Your Mood" exits into
 * `/student/mood-checkin`. Mirrored at `/preview/student/onboarding/complete`
 * (which resolves the exit to `/preview/student/mood-checkin`).
 */

import type { ActionFunctionArgs } from 'react-router'

import { CompleteScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpCompleteOnboarding } from '~/lib/bp-ai/privacy.server'
import { getAppSession } from '~/lib/session.server'

export function meta() {
  return [{ title: 'Set-up complete · Blueprint' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/**
 * Record that onboarding is done — the fact `/student`'s loader reads.
 *
 * Never fails the screen: `CompleteScreen` does not wait for this. If it fails,
 * the next visit to `/student` lands in onboarding again, which is the correct
 * failure — a repeated tour, never a student locked out of the hub.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries no BP AI token; `app.tsx` decides onboarding there.
  if (session?.kind !== 'bp') return { saved: false }

  const result = await bpCompleteOnboarding(session.session.accessToken)
  if (!result.ok) {
    console.error(`[onboarding/complete] completeOnboarding failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentOnboardingCompleteRoute() {
  return <CompleteScreen />
}
