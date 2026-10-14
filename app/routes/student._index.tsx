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

import { useEffect, useRef } from 'react'
import { redirect, useRevalidator } from 'react-router'

import type { Route } from './+types/student._index'

import { TodayHub } from '~/components/dashboard/student/today'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2'
import { bpHub, EMPTY_HUB } from '~/lib/bp-ai/gamification.server'
import { bpMe } from '~/lib/bp-ai/me.server'
import { bpCheckinCatalogue } from '~/lib/bp-ai/moods.server'
import { getAppSession } from '~/lib/session.server'
import { tileArtKey } from '~/lib/student/tile-art'
import { browserToday, localDateFor, rememberTimeZone } from '~/lib/student/time-zone'

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
 *
 * **The hub's state is the server's too** (step-23): the balance is
 * `sparkBalance` and which cards are done is `dailyCards` for the student's
 * local day. Without a BP session (an LTI launch) the hub is empty — balance 0,
 * nothing done — and never falls back to `localStorage`. `day` is the date the
 * cards were asked for (`''` = the gateway's UTC default), `null` without a
 * session.
 *
 * `moodChips` feeds the done mood card's overlay: per tile art key, the
 * catalogue `chips` of that tile's moods (one `listMoods`). The overlay knows
 * which tiles were picked, not which level, so it gets the tile's rows. No
 * session or a failed read ⇒ `{}`, and the overlay shows no chips.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { hub: EMPTY_HUB, day: null, moodChips: {} }

  const { accessToken } = session.session
  const date = localDateFor(request)
  const [me, hub, moods] = await Promise.all([
    bpMe(accessToken),
    bpHub(accessToken, date),
    bpCheckinCatalogue(accessToken),
  ])
  if (!me.ok) {
    console.error(`[student] me failed (${me.error.kind}): ${me.error.message} — showing the hub`)
  } else if (me.data.hasUserRecord && me.data.onboardingCompletedAt === null) {
    throw redirect(ONBOARDING_FIRST_PATH)
  }
  if (!hub.ok) console.error(`[student] hub read failed (${hub.error.kind}): ${hub.error.message}`)
  if (!moods.ok) console.error(`[student] listMoods failed (${moods.error.kind}): ${moods.error.message}`)
  const moodChips: Record<string, string[]> = {}
  for (const tile of moods.ok ? moods.data : []) {
    moodChips[tileArtKey(tile.identifier)] = tile.moods.flatMap((m) => m.chips)
  }
  return { hub: hub.ok ? hub.data : EMPTY_HUB, day: date ?? '', moodChips }
}

/**
 * Client loader — tells the server the student's zone (for the NEXT load),
 * then asks `serverLoader()` so the onboarding redirect above also applies on
 * client-side navigations (e.g. `/login`'s redirect here).
 */
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  rememberTimeZone()
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Today (hub)" route="/student" source="today.html" chrome />
}

export default function StudentTodayRoute({ loaderData }: Route.ComponentProps) {
  const { revalidate } = useRevalidator()
  const asked = useRef(false)
  // The very first visit has no zone cookie yet, and a student who crossed a
  // zone still carries the old one: the cards were read for the wrong day. The
  // cookie is current now, so ask once more. Once per mount — with cookies
  // blocked it would otherwise loop.
  useEffect(() => {
    if (asked.current || loaderData.day === null || loaderData.day === browserToday()) return
    asked.current = true
    void revalidate()
  }, [loaderData.day, revalidate])

  // Keyed by day: the hub hydrates its state once, so a re-read for another
  // day has to remount it.
  return <TodayHub key={loaderData.day ?? ''} hub={loaderData.hub} moodChips={loaderData.moodChips} />
}
