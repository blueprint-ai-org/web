/**
 * `/student/write-it-out` — write-it-out activity (ports `write-it-out.html`).
 *
 * Full-bleed page (no sidebar): a monster prompt + textarea; Save records a
 * journal entry and hands off to `/student/completed?card=write` (Phase 7).
 * Client-only render (see `HydrateFallback`). Mirrored at
 * `/preview/student/write-it-out`.
 *
 * **The monster asks a journal prompt** the server drew for today
 * (`dailyJournalPrompts`), and the answer is recorded against it. Without a BP
 * AI session, or with nothing to draw, the monster asks nothing and Save
 * records nothing.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { WriteItOut } from '~/components/dashboard/student/activities'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpCreateJournal, bpDailyJournalPrompts } from '~/lib/bp-ai/journal.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor } from '~/lib/student/time-zone'

const TAG = '[write-it-out]'

export function meta() {
  return [{ title: 'Write it out · Blueprint' }, { name: 'description', content: 'Write-it-out activity.' }]
}

/**
 * Today's write-it-out prompt, or `null`.
 *
 * The server's draw for the day, third in line: the journal home shows the
 * first two as its topic circles, and offering one of those here reads as the
 * app having run out. Fewer than three left ⇒ the last one there is.
 *
 * **Never throws.** No BP AI session (an LTI launch), an empty catalogue or an
 * unreachable gateway all come back as `null`.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  if (isPreviewRequest(request)) return { prompt: { id: 'preview-1', label: 'What made today feel different?' } }

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { prompt: null }

  const today = localDateFor(request) ?? new Date().toISOString().slice(0, 10)
  const result = await bpDailyJournalPrompts(session.session.accessToken, today, 3)
  if (!result.ok) {
    console.error(`${TAG} dailyJournalPrompts failed (${result.error.kind}): ${result.error.message}`)
    return { prompt: null }
  }
  return { prompt: result.data[2] ?? result.data.at(-1) ?? null }
}

/** Keeps the render client-only. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Write it out" route="/student/write-it-out" source="write-it-out.html" />
}

/**
 * Save the note as a Journal entry against the prompt it was written for.
 *
 * **A Journal, not a mini-survey.** `createJournal` publishes
 * `journal-created`, which is the only thing `agent` subscribes to: a note
 * recorded as a mini-survey never reaches the analysis or the mental health
 * safety stack. That is the whole point of this write.
 *
 * **Never fails the screen.** The shell has already moved on to the completed
 * screen; a refused or unreachable write is logged and reported as
 * `{ saved: false }`.
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
  // No `questionId` is a free note: nothing was drawn to answer.
  if (!question || !answer) return { saved: false }

  const result = await bpCreateJournal(session.session.accessToken, session.session.userId, {
    ...(questionId ? { questionId } : {}),
    prompt: question,
    note: answer,
  })
  if (!result.ok) {
    console.error(`${TAG} journaling ${questionId || '(free note)'} failed (${result.error.kind}): ${result.error.message}`)
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
