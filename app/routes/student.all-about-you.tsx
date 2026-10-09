/**
 * `/student/all-about-you` — all-about-you activity (ports `all-about-you.html`).
 *
 * Full-bleed page (no sidebar): a single-select 10-emoji grid (pre-selected on
 * edit); Save writes `bp_about_emoji` and hands off to
 * `/student/completed?card=about` (Phase 7). Client-only render (see
 * `HydrateFallback`). Mirrored at `/preview/student/all-about-you`.
 *
 * **The monster asks one micro-survey question a day.** The `about_you`
 * catalogue holds ~70 (seeded 2026-10-05 from "Micro Survey Examples +
 * Engagement", eleven topic areas — the gateway cannot hold the sheet's own
 * categories, so they all live in `about_you`). The loader draws one this
 * student has never answered, the same one all day, and the answer is recorded
 * against it so it never comes back. Free-text, single-pick and multi-pick
 * questions all render; without a BP AI session the screen keeps the
 * prototype's emoji grid.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { AllAboutYou } from '~/components/dashboard/student/activities'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { ABOUT_YOU_SURVEY_TYPE, bpRecordAnswer } from '~/lib/bp-ai/answers.server'
import { bpAnsweredQuestionIds } from '~/lib/bp-ai/journal.server'
import { bpQuestionsInCategory } from '~/lib/bp-ai/questions.server'
import { getAppSession } from '~/lib/session.server'
import { journalTopicSeed, pickUnanswered } from '~/lib/student/journal-prompts'
import { studentStorage } from '~/lib/student/storage'

const TAG = '[all-about-you]'

export function meta() {
  return [{ title: 'All about you · Blueprint' }, { name: 'description', content: 'All-about-you activity.' }]
}

/**
 * Today's question, or `null` for the prototype's emoji grid.
 *
 * **Never throws.** No BP AI session (an LTI launch), an empty catalogue or an
 * unreachable gateway all render the prototype. If only the answered-list read
 * fails, a question is still drawn — a possible repeat beats the baked grid.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { question: null }

  const { accessToken, userId } = session.session
  const [catalogue, answered] = await Promise.all([
    bpQuestionsInCategory(accessToken, ABOUT_YOU_SURVEY_TYPE),
    bpAnsweredQuestionIds(accessToken, userId),
  ])
  if (!catalogue.ok) {
    console.error(`${TAG} listQuestions failed (${catalogue.error.kind}): ${catalogue.error.message}`)
    return { question: null }
  }
  if (!answered.ok) {
    console.error(`${TAG} listMiniSurveys failed (${answered.error.kind}): ${answered.error.message}`)
  }

  // Dev-only: `?question=<id>` opens a specific row, so QA can see every input
  // type without waiting for the draw to land on it. Ignored in production.
  if (import.meta.env.DEV) {
    const forced = new URL(request.url).searchParams.get('question')
    const match = forced ? catalogue.data.find((q) => q.id === forced) : undefined
    if (match) return { question: match }
  }

  const question = pickUnanswered(
    catalogue.data,
    answered.ok ? answered.data : new Set(),
    new Set(),
    `${journalTopicSeed(userId, new Date())}|about`,
  )
  return { question }
}

/** Client loader — the server's question, plus the emoji pre-select via the adapter. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  const server = await serverLoader()
  return { ...server, aboutEmoji: studentStorage.getAboutEmoji() }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="All about you" route="/student/all-about-you" source="all-about-you.html" />
}

/**
 * Record the answer as an `about_you` mini-survey.
 *
 * **Never fails the screen.** The shell has already moved on to the completed
 * screen; a refused or unreachable write is logged and reported as
 * `{ saved: false }`. The gateway validates the option count against the
 * question's type, so nothing is re-checked here.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`${TAG} answer arrived with no BP session (kind: ${session?.kind ?? 'none'}) — not recorded`)
    }
    return { saved: false }
  }

  const form = await request.formData()
  const questionId = String(form.get('questionId') ?? '').trim()
  const question = String(form.get('question') ?? '').trim()
  const answer = String(form.get('answer') ?? '').trim()
  const optionIds = form.getAll('optionIds').map((v) => String(v).trim()).filter(Boolean)
  if (!questionId || !question || !answer) return { saved: false }

  const result = await bpRecordAnswer(
    session.session.accessToken,
    session.session.userId,
    { questionId, question, answer, optionIds },
    new Date().toISOString(),
    ABOUT_YOU_SURVEY_TYPE,
  )
  if (!result.ok) {
    console.error(`${TAG} recording ${questionId} failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentAllAboutYouRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <AllAboutYou question={loaderData?.question ?? null} />
}
