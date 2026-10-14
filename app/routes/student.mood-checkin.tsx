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
 * tiles with their triads, and the three questions behind the reasons and sleep
 * screens. The catalogue is ONE request since step-8 (`listMoods(curatedOnly:)`),
 * where it used to be two. The
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
 * and each yields {@link EMPTY_CHECKIN_CATALOGUE}.
 *
 * **What the screen does with that changed in step-8.** It used to render its
 * own baked copy of the fifteen tiles, so a student could complete a check-in
 * that recorded nothing. With no tiles it now says the check-in is unavailable:
 * the catalogue is the catalogue, and a screen that invents one is a screen
 * that lies about having saved.
 */

import type { LoaderFunctionArgs } from 'react-router'

import { MoodCheckin } from '~/components/dashboard/student/mood-checkin'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpRuleReward, FAMILY_EVENT } from '~/lib/bp-ai/gamification.server'
import { bpCheckinCatalogue } from '~/lib/bp-ai/moods.server'
import { bpQuestions } from '~/lib/bp-ai/questions.server'
import { getAppSession } from '~/lib/session.server'
import { EMPTY_CHECKIN_CATALOGUE, type CheckinCatalogue } from '~/lib/student/checkin-catalogue'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Mood check-in · Blueprint' }, { name: 'description', content: 'Daily mood check-in.' }]
}

/**
 * The three questions behind the reasons and sleep screens, by stable key.
 *
 * **One request for all three.** It was three — one per question — and each one
 * fetched its whole CATEGORY and then matched `(category, order, type)` in
 * memory, so the screen pulled every sleep question and every mood-reason
 * question to find two rows.
 */
const QUESTION_KEYS = ['checkin.reasons', 'checkin.other', 'checkin.sleep'] as const

/**
 * The catalogue and the three questions, in TWO requests.
 *
 * Both are `USER_OR_API` and answer a student's own token, so this needs
 * nothing but the session. They run together rather than in sequence: the
 * check-in is the heaviest screen in the app and serial round trips would be
 * felt before the first blob is drawn. It was four requests before step-8 and
 * step-9 — one for the mood categories, one for the moods, and one per
 * question.
 */
type CheckinData = CheckinCatalogue & {
  /** What the check-in pays (`listSparkRules`), announced on the done screen BEFORE the write. */
  reward: number | null
}

export async function loader({ request }: LoaderFunctionArgs): Promise<CheckinData> {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`[mood-checkin] no BP session (kind: ${session?.kind ?? 'none'}) — baked copy, nothing will record`)
    }
    return { ...EMPTY_CHECKIN_CATALOGUE, reward: null }
  }

  const { accessToken } = session.session
  const [moods, questions, reward] = await Promise.all([
    bpCheckinCatalogue(accessToken),
    bpQuestions(accessToken, { keys: [...QUESTION_KEYS] }),
    bpRuleReward(accessToken, FAMILY_EVENT.MOOD),
  ])

  if (!moods.ok) {
    console.error(`[mood-checkin] listMoods failed (${moods.error.kind}): ${moods.error.message}`)
  }
  if (!questions.ok) {
    console.error(`[mood-checkin] listQuestions failed (${questions.error.kind}): ${questions.error.message}`)
  }

  const byKey = new Map((questions.ok ? questions.data : []).map((q) => [q.key, q]))

  return {
    tiles: moods.ok ? moods.data : [],
    reasons: byKey.get('checkin.reasons') ?? null,
    other: byKey.get('checkin.other') ?? null,
    sleep: byKey.get('checkin.sleep') ?? null,
    reward,
  }
}

/** Client loader — `?edit` prefill reads the stored selection via the adapter. */
export function clientLoader({ serverLoader }: { serverLoader: () => Promise<CheckinData> }) {
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
  return <MoodCheckin catalogue={loaderData?.catalogue ?? EMPTY_CHECKIN_CATALOGUE} reward={loaderData?.catalogue.reward ?? null} />
}
