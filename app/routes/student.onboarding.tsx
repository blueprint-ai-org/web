/**
 * `/student/onboarding` — onboarding wizard parent layout.
 *
 * Phase 4 replaced the Figma onboarding with the prototype flow
 * (`app/components/dashboard/student/onboarding-v2`). Each screen is its own
 * route and owns its full-bleed `StudentStage`, so this layout is a plain
 * passthrough — cross-screen state lives in the storage adapter, not a
 * provider. (The legacy provider/step components were removed in Phase 4B.)
 */

import { Outlet } from 'react-router'

export default function StudentOnboardingLayout() {
  return <Outlet />
}
