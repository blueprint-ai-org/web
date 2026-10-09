/**
 * `/student/mood-checkin` — daily check-in wizard (ports `mood-checkin.html`).
 * Query: `?edit=1` (re-check-in copy variant).
 *
 * Full-bleed page (no sidebar): the 15-emotion picker → per-emotion detail
 * screens → reasons → sleep slider → done. Client-only render (see
 * `HydrateFallback`) — the flow reads storage and runs rAF-driven cinematics.
 * Mirrored at `/preview/student/mood-checkin`.
 *
 * ## Dynamic, in two halves
 *
 * The **reads** happen here, in the server loader — the catalogue's fifteen
 * moods and the three questions behind the reasons and sleep screens. The
 * `HydrateFallback` only covers the hydration gap; the loader runs normally.
 *
 * The **write** does not happen here. It is a `fetch` to `/api/mood-checkin`
 * from the orchestrator when the flow finishes, because a form post to this
 * route's `action` would revalidate this loader and re-render the tree
 * underneath a running exit animation. See that route's header.
 *
 * ## The loader cannot fail the screen
 *
 * Three ways it legitimately comes back empty — an LTI launch carries no BP AI
 * token, an unseeded tenant answers `[]`, and an unreachable gateway is logged —
 * and none of them is something a student mid-check-in should ever see. Each
 * yields {@link EMPTY_CHECKIN_CATALOGUE} and the screen renders its baked copy,
 * exactly as it did before any of this was dynamic. The only thing lost is the
 * recording, which `/api/mood-checkin` reports rather than throws.
 */

import type { LoaderFunctionArgs } from 'react-router'

import { MoodCheckin } from '~/components/dashboard/student/mood-checkin'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpMoodCatalogue } from '~/lib/bp-ai/moods.server'
import { bpOnboardingQuestion } from '~/lib/bp-ai/questions.server'
import { getAppSession } from '~/lib/session.server'
import {
  EMPTY_CHECKIN_CATALOGUE,
  joinMoodCatalogue,
  type CheckinCatalogue,
} from '~/lib/student/checkin-catalogue'
import {
  CHECKIN_OTHER_QUESTION,
  CHECKIN_REASONS_QUESTION,
  CHECKIN_SLEEP_QUESTION,
} from '~/lib/student/checkin-questions'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Mood check-in · Blueprint' }, { name: 'description', content: 'Daily mood check-in.' }]
}

const SELECTORS = [CHECKIN_REASONS_QUESTION, CHECKIN_OTHER_QUESTION, CHECKIN_SLEEP_QUESTION].map((spec) => ({
  category: spec.category,
  order: spec.order,
  type: spec.type,
}))

/**
 * The catalogue and the three questions, in one round of parallel reads.
 *
 * All four are `USER_OR_API` and answer a student's own token, so this needs
 * nothing but the session. They run together rather than in sequence: the
 * check-in is the heaviest screen in the app and four serial round trips would
 * be felt before the first blob is drawn.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<CheckinCatalogue> {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`[mood-checkin] no BP session (kind: ${session?.kind ?? 'none'}) — baked copy, nothing will record`)
    }
    return EMPTY_CHECKIN_CATALOGUE
  }

  const { accessToken } = session.session
  const [moods, reasons, other, sleep] = await Promise.all([
    bpMoodCatalogue(accessToken),
    ...SELECTORS.map((selector) => bpOnboardingQuestion(accessToken, selector)),
  ])

  if (!moods.ok) {
    console.error(`[mood-checkin] listMoods failed (${moods.error.kind}): ${moods.error.message}`)
  }
  for (const [name, result] of [
    ['reasons', reasons],
    ['other', other],
    ['sleep', sleep],
  ] as const) {
    if (!result.ok) console.error(`[mood-checkin] ${name} question failed (${result.error.kind}): ${result.error.message}`)
  }

  return {
    ...joinMoodCatalogue(moods.ok ? moods.data : []),
    reasons: reasons.ok ? reasons.data : null,
    other: other.ok ? other.data : null,
    sleep: sleep.ok ? sleep.data : null,
  }
}

/** Client loader — `?edit` prefill reads the stored selection via the adapter. */
export function clientLoader({ serverLoader }: { serverLoader: () => Promise<CheckinCatalogue> }) {
  return serverLoader().then((catalogue) => ({
    catalogue,
    moodEmotions: studentStorage.getMoodEmotions(),
    moodReasons: studentStorage.getMoodReasons(),
  }))
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Mood check-in" route="/student/mood-checkin" source="mood-checkin.html" />
}

export default function StudentMoodCheckinRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MoodCheckin catalogue={loaderData?.catalogue ?? EMPTY_CHECKIN_CATALOGUE} />
}
