/**
 * `/student/all-about-you` — all-about-you activity (ports `all-about-you.html`).
 *
 * Full-bleed page (no sidebar): the monster asks today's question; Save
 * records the answer and hands off to `/student/completed?card=about`
 * (Phase 7). Client-only render (see `HydrateFallback`). Mirrored at
 * `/preview/student/all-about-you`.
 *
 * **The monster asks one micro-survey question a day**, drawn by the server
 * (`dailyQuestions(category: "about_you")`, step-30): the same one all day,
 * unanswered first, in the student's local day. Free-text, single-pick and
 * multi-pick questions all render. With nothing drawn — no BP AI session, or a
 * tenant whose ~68 `about_you` questions are not seeded yet — the screen says
 * so and records nothing; it no longer offers the prototype's emoji grid,
 * whose answer only ever reached `localStorage`.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { AllAboutYou } from '~/components/dashboard/student/activities'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpAnswerQuestion } from '~/lib/bp-ai/answers.server'
import { bpDailyQuestions, type CatalogueQuestion } from '~/lib/bp-ai/questions.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor, timeZoneFor } from '~/lib/student/time-zone'

const TAG = '[all-about-you]'

export function meta() {
  return [{ title: 'All about you · Blueprint' }, { name: 'description', content: 'All-about-you activity.' }]
}

/**
 * The catalogue category this screen draws from.
 *
 * It was a constant in `answers.server`, used for both the read
 * and the row's `survey_type`. The write side is gone — the server reads the
 * question's category — and what is left is a category a screen asks for, which
 * is choosing a screen rather than keeping a copy of a dictionary.
 */
const ABOUT_YOU_CATEGORY = 'about_you'

/** `/preview` has no session: one fixed single-pick question. */
const PREVIEW_QUESTION: CatalogueQuestion = {
  id: 'preview-about',
  key: null,
  label: 'Which of these sounds most like your week?',
  category: ABOUT_YOU_CATEGORY,
  type: 'SELECT_ONE',
  display: null,
  maxSelections: null,
  options: [
    { id: 'p1', label: 'Busy', value: 'busy', emoji: '🏃', imageUrl: null, order: 1 },
    { id: 'p2', label: 'Calm', value: 'calm', emoji: '🌿', imageUrl: null, order: 2 },
  ],
}

/**
 * Today's question, or `null` (nothing to ask).
 *
 * **Never throws.** No BP AI session (an LTI launch), an unseeded category or
 * an unreachable gateway all come back as `null`.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ question: CatalogueQuestion | null }> {
  if (isPreviewRequest(request)) return { question: PREVIEW_QUESTION }

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { question: null }

  const result = await bpDailyQuestions(bp.accessToken, {
    category: ABOUT_YOU_CATEGORY,
    date: localDateFor(request) ?? new Date().toISOString().slice(0, 10),
    timeZone: timeZoneFor(request),
    count: 1,
  })
  if (!result.ok) {
    console.error(`${TAG} dailyQuestions failed (${result.error.kind}): ${result.error.message}`)
    return { question: null }
  }
  return { question: result.data[0] ?? null }
}

/** Keeps the render client-only. */
export async function clientLoader({ serverLoader }: { serverLoader: () => ReturnType<typeof loader> }) {
  return serverLoader()
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
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) {
    if (import.meta.env.DEV) {
      console.log(`${TAG} answer arrived with no BP session — not recorded`)
    }
    return { saved: false }
  }

  const form = await request.formData()
  const questionId = String(form.get('questionId') ?? '').trim()
  // `answer` is the student's own text and arrives only for an open question;
  // for a pick it was the option labels joined here, which is the server's
  // since step-10. `survey_type` is gone with it: it was a literal
  // (`'about_you'`), and the server reads the question's category.
  const answer = String(form.get('answer') ?? '').trim()
  const optionIds = form.getAll('optionIds').map((v) => String(v).trim()).filter(Boolean)
  if (!questionId || (optionIds.length === 0 && !answer)) return { saved: false }

  const result = await bpAnswerQuestion(
    bp.accessToken,
    bp.userId,
    { questionId, optionIds, ...(answer ? { answer } : {}) },
    new Date().toISOString(),
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
