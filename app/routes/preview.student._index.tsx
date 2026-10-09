/**
 * `/preview/student` index — dev-only mirror of the LTI `/student` Today hub.
 *
 * SEPARATE index module from `student._index.tsx` (the preview mirror keeps its
 * own index file). Behaviour is identical — same {@link TodayHub} + storage seam
 * — only the meta title differs. Edit both together, with **one deliberate
 * exception**: the LTI module's `clientLoader` redirects a user with no
 * `bp_onboarding_done` flag into onboarding, and this one must not. Preview
 * exists so a screen can be opened directly with no session and no flow behind
 * it; that gate here would bounce every preview visit into onboarding. Do not
 * "fix" the asymmetry — it is the point.
 */

import { TodayHub } from '~/components/dashboard/student/today'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [
    { title: 'Today (preview) · Blueprint' },
    { name: 'description', content: 'Student Today hub preview.' },
  ]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — reads the hub's `bp_*` state via the storage adapter. */
export function clientLoader() {
  return {
    sparks: studentStorage.ensureSparks(),
    todaySections: studentStorage.getTodaySections(),
    moodEmotions: studentStorage.getMoodEmotions(),
    tourDone: studentStorage.getTourDone(),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Today (hub)" route="/preview/student" source="today.html" chrome />
}

export default function PreviewStudentTodayRoute() {
  return <TodayHub />
}
