/**
 * `/preview/student` index — dev-only mirror of the LTI `/student` Today hub.
 *
 * SEPARATE index module from `student._index.tsx` (the preview mirror keeps its
 * own index file). Behaviour is identical — same {@link TodayHub} — except the
 * hub state, which is a constant fixture here (no session behind preview). Edit both together, with **one deliberate
 * exception**: the real module's `loader` redirects a student whose record has
 * no `onboardingCompletedAt` into onboarding, and this one must not. Preview
 * exists so a screen can be opened directly with no session and no flow behind
 * it; that gate here would bounce every preview visit into onboarding. Do not
 * "fix" the asymmetry — it is the point.
 */

import { TodayHub } from '~/components/dashboard/student/today'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import type { HubState } from '~/lib/bp-ai/gamification.server'

export function meta() {
  return [
    { title: 'Today (preview) · Blueprint' },
    { name: 'description', content: 'Student Today hub preview.' },
  ]
}

/** Preview has no session: a constant hub with one card done, so every card state shows. */
const PREVIEW_HUB: HubState = { balance: 120, done: ['MOOD'] }

export function loader() {
  return { hub: PREVIEW_HUB }
}

/** Keeps the render client-only: the hub's animation flags read storage. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<ReturnType<typeof loader>> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Today (hub)" route="/preview/student" source="today.html" chrome />
}

export default function PreviewStudentTodayRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  return <TodayHub hub={loaderData.hub} />
}
