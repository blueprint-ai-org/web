/**
 * `/student/onboarding/sharing` — onboarding step 3 (prototype `#s1`).
 * "You choose what to share" intro. No writes.
 * Mirrored at `/preview/student/onboarding/sharing`.
 */

import { SharingScreen } from '~/components/dashboard/student/onboarding-v2'

export function meta() {
  return [{ title: 'What you share · Blueprint' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

export default function StudentOnboardingSharingRoute() {
  return <SharingScreen />
}
