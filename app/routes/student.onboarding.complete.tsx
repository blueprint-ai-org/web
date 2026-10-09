/**
 * `/student/onboarding/complete` — onboarding step 9 (prototype `#s7`).
 * "+10 Sparkz · Set-up Complete"; "Start with Your Mood" exits into
 * `/student/mood-checkin`. Mirrored at `/preview/student/onboarding/complete`
 * (which resolves the exit to `/preview/student/mood-checkin`).
 */

import { CompleteScreen } from '~/components/dashboard/student/onboarding-v2'

export function meta() {
  return [{ title: 'Set-up complete · Blueprint' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Stub action — the future completion write seam. */
export function action() {
  return null
}

export default function StudentOnboardingCompleteRoute() {
  return <CompleteScreen />
}
