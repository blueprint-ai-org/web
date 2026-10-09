/**
 * `/student` index — Today hub (ports `today.html`).
 *
 * Renders the card-queue {@link TodayHub} (Phase 6). Client-only (see
 * `HydrateFallback`) — the hub reads `bp_*` storage and runs rAF cinematics.
 *
 * SEPARATE index module from `preview.student._index.tsx` by design — the two
 * mounts are edited together (see the preview-mirror discipline in the plan).
 *
 * **The one documented exception to that discipline is the onboarding redirect
 * in `clientLoader` below: it must NOT be mirrored into
 * `preview.student._index.tsx`.** `/preview/student` exists so a screen can be
 * opened straight from a URL for visual QA with no session and no flow behind
 * it; a gate there would bounce every single preview visit into onboarding and
 * break the only tool that lets anyone look at the hub directly. The mirror
 * being editable independently is exactly why these are two modules.
 */

import { redirect } from 'react-router'

import { TodayHub } from '~/components/dashboard/student/today'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'
import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2'

export function meta() {
  return [
    { title: 'Today · Blueprint' },
    { name: 'description', content: 'Student Today hub.' },
  ]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/**
 * Client loader — reads the hub's `bp_*` state via the storage adapter (the
 * seam a future backend session swaps key-by-key). Phase 6 consumes this.
 *
 * Also the **post-login fork** (decision D6). `/login` can only ever redirect
 * here: whether onboarding is done lives in `bp_onboarding_done` in
 * localStorage, and no server action can see localStorage. So the decision is
 * made in the one place that can — right here, on the client, before the hub
 * reads a single key. A first-time user is sent to the first onboarding screen;
 * everyone else falls through to the hub.
 *
 * This is unconditional rather than credential-only, and that is deliberate on
 * two counts. It matches what the LTI path already does — `app/routes/app.tsx`
 * sends *every* launching student to the first onboarding step regardless — so
 * no LTI user reaches the hub by a route this could newly divert. And the
 * onboarding flow has no skip, so there is no way to bounce between the two:
 * the only exit from `complete` sets the flag on its way out.
 */
export function clientLoader() {
  if (!studentStorage.getOnboardingDone()) {
    throw redirect(ONBOARDING_FIRST_PATH)
  }

  return {
    sparks: studentStorage.ensureSparks(),
    todaySections: studentStorage.getTodaySections(),
    moodEmotions: studentStorage.getMoodEmotions(),
    tourDone: studentStorage.getTourDone(),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Today (hub)" route="/student" source="today.html" chrome />
}

export default function StudentTodayRoute() {
  return <TodayHub />
}
