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
 * in `loader` below: it must NOT be mirrored into
 * `preview.student._index.tsx`.** `/preview/student` exists so a screen can be
 * opened straight from a URL for visual QA with no session and no flow behind
 * it; a gate there would bounce every single preview visit into onboarding and
 * break the only tool that lets anyone look at the hub directly. The mirror
 * being editable independently is exactly why these are two modules.
 */

import { redirect } from 'react-router'

import type { Route } from './+types/student._index'

import { TodayHub } from '~/components/dashboard/student/today'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'
import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2'
import { bpMe } from '~/lib/bp-ai/me.server'
import { getAppSession } from '~/lib/session.server'

export function meta() {
  return [
    { title: 'Today · Blueprint' },
    { name: 'description', content: 'Student Today hub.' },
  ]
}

/**
 * The post-login fork: has this student been through onboarding?
 *
 * The server's answer since step-22 (`me.user.onboardingCompletedAt`, set by
 * `completeOnboarding` on the way out of `complete`). It used to be a
 * `localStorage` flag read in `clientLoader`, so a second device — or a cleared
 * browser — walked all nine screens again.
 *
 * Everything that is not "a student record with no date" falls through to the
 * hub, each for its own reason:
 *
 *  - **An LTI launch** carries Canvas claims and no BP AI token, so there is
 *    nothing to ask. It needs no gate here anyway: `app.tsx` sends every
 *    launching student into onboarding already (out of scope for step-22, and
 *    it means an LTI student sees onboarding on every launch).
 *  - **No `User` record** — the tenant owner, or a support pass. Neither has an
 *    onboarding to finish.
 *  - **`me` failed.** Logged and let through: this is a welcome tour, not an
 *    access gate, and bouncing a student into nine screens because the gateway
 *    hiccupped is the worse failure.
 *
 * No session at all never reaches here — `_persona.tsx` gates it first.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return null

  const me = await bpMe(session.session.accessToken)
  if (!me.ok) {
    console.error(`[student] me failed (${me.error.kind}): ${me.error.message} — showing the hub`)
    return null
  }
  if (me.data.hasUserRecord && me.data.onboardingCompletedAt === null) {
    throw redirect(ONBOARDING_FIRST_PATH)
  }
  return null
}

/**
 * Client loader — reads the hub's `bp_*` state via the storage adapter (the
 * seam a future backend session swaps key-by-key). Phase 6 consumes this.
 *
 * It asks `serverLoader()` first so the onboarding redirect above also applies
 * on client-side navigations (e.g. `/login`'s redirect here), not only on a
 * document load.
 */
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  await serverLoader()

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
