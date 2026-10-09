/**
 * `/student/write-it-out` — write-it-out activity (ports `write-it-out.html`).
 *
 * Full-bleed page (no sidebar): a monster prompt + textarea; Save dual-stores
 * `bp_write_text` and hands off to `/student/completed?card=write` (Phase 7).
 * Client-only render (see `HydrateFallback`). Mirrored at
 * `/preview/student/write-it-out`.
 *
 * **The monster asks a journal prompt.** The loader draws one question from the
 * tenant's `journal` catalogue that this student has never answered, and the
 * answer is recorded against it, so it never comes back. See `pickUnanswered`
 * for the rules; without a BP AI session the screen keeps the prototype's line.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { WriteItOut } from '~/components/dashboard/student/activities'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { JOURNAL_SURVEY_TYPE, bpRecordAnswer } from '~/lib/bp-ai/answers.server'
import { bpAnsweredQuestionIds, bpJournalPrompts } from '~/lib/bp-ai/journal.server'
import { getAppSession } from '~/lib/session.server'
import { journalTopicSeed, pickPrompts, pickUnanswered } from '~/lib/student/journal-prompts'
import { studentStorage } from '~/lib/student/storage'

const TAG = '[write-it-out]'

export function meta() {
  return [{ title: 'Write it out · Blueprint' }, { name: 'description', content: 'Write-it-out activity.' }]
}

/**
 * One unanswered journal prompt, or `null` for the prototype's line.
 *
 * **Never throws.** No BP AI session (an LTI launch), an empty catalogue or an
 * unreachable gateway all render the baked copy. If only the answered-list read
 * fails, the prompt is still drawn — a possible repeat beats a generic line.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { prompt: null }

  const { accessToken, userId } = session.session
  const [catalogue, answered] = await Promise.all([
    bpJournalPrompts(accessToken),
    bpAnsweredQuestionIds(accessToken, userId),
  ])
  if (!catalogue.ok) {
    console.error(`${TAG} listQuestions failed (${catalogue.error.kind}): ${catalogue.error.message}`)
    return { prompt: null }
  }
  if (!answered.ok) {
    console.error(`${TAG} listMiniSurveys failed (${answered.error.kind}): ${answered.error.message}`)
  }

  const now = new Date()
  const topicSeed = journalTopicSeed(userId, now)
  // The two prompts the journal home is showing today — same draw, same seed.
  const todaysTopics = new Set(pickPrompts(catalogue.data, topicSeed, 2).map((p) => p.id))
  const prompt = pickUnanswered(
    catalogue.data,
    answered.ok ? answered.data : new Set(),
    todaysTopics,
    `${topicSeed}|write`,
  )
  return { prompt }
}

/** Client loader — the server's prompt, plus the edit prefill via the adapter. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  const server = await serverLoader()
  return { ...server, writeText: studentStorage.getWriteText('local') }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Write it out" route="/student/write-it-out" source="write-it-out.html" />
}

/**
 * Record the note as a `journal` answer to the prompt it was written for.
 *
 * **Never fails the screen.** The shell has already moved on to the completed
 * screen and the note is in local storage; a refused or unreachable write is
 * logged and reported as `{ saved: false }`.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`${TAG} note arrived with no BP session (kind: ${session?.kind ?? 'none'}) — not recorded`)
    }
    return { saved: false }
  }

  const form = await request.formData()
  const questionId = String(form.get('questionId') ?? '').trim()
  const question = String(form.get('question') ?? '').trim()
  const answer = String(form.get('answer') ?? '').trim()
  if (!questionId || !question || !answer) return { saved: false }

  const result = await bpRecordAnswer(
    session.session.accessToken,
    session.session.userId,
    // OPEN takes no option ids — the gateway refuses an answer that carries any.
    { questionId, question, answer, optionIds: [] },
    new Date().toISOString(),
    JOURNAL_SURVEY_TYPE,
  )
  if (!result.ok) {
    console.error(`${TAG} recording ${questionId} failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentWriteItOutRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <WriteItOut prompt={loaderData?.prompt ?? null} />
}
