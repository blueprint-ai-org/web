/**
 * `/student/onboarding/privacy` — onboarding step 4 (prototype `#s2`).
 * Privacy toggle cards; writes `bp_privacy_1` / `bp_privacy_2` on Next.
 * Mirrored at `/preview/student/onboarding/privacy`.
 */

import { PrivacyScreen } from '~/components/dashboard/student/onboarding-v2'

export function meta() {
  return [{ title: 'Privacy settings · Blueprint' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Stub action — the future write seam for `bp_privacy_1` / `bp_privacy_2`. */
export function action() {
  return null
}

export default function StudentOnboardingPrivacyRoute() {
  return <PrivacyScreen />
}
