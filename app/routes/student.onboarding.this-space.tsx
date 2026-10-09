/**
 * `/student/onboarding/this-space` — onboarding step 2 (prototype `#s0`).
 * Welcome screen with rocking challenge cards. No writes.
 * Mirrored at `/preview/student/onboarding/this-space`.
 */

import { ThisSpaceScreen } from '~/components/dashboard/student/onboarding-v2'

export function meta() {
  return [{ title: 'This space is for you · Blueprint' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

export default function StudentOnboardingThisSpaceRoute() {
  return <ThisSpaceScreen />
}
