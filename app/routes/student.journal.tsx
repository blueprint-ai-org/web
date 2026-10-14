/**
 * `/student/journal` — journal home (ports `journal.html`). Query: `?demo`.
 *
 * Sidebar-bearing stage page: the emotion-circle topic viz + the write-it-out /
 * topic-question overlays with the circle→overlay FLIP expansion (Phase 8).
 * Shared module — also mounted at `/preview/student/journal` (explicit id in
 * `routes.ts`). Client-only render (see `HydrateFallback`).
 *
 * The topic overlay is the child route `prompt/:questionId`
 * (`student.journal.prompt.tsx`), rendered into the home's `<Outlet/>`.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from 'react-router'

import { JournalHome, type JournalHomeProps } from '~/components/dashboard/student/journal/JournalHome'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { moodArtKeys } from '~/lib/bp-ai/activity.server'
import { bpCreateJournal, bpJournalHome } from '~/lib/bp-ai/journal.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor, timeZoneFor } from '~/lib/student/time-zone'

const TAG = '[journal]'

export function meta() {
  return [{ title: 'Journal · Blueprint' }, { name: 'description', content: 'Student journal.' }]
}

/** No BP session (an LTI launch), or a failed read: no topics, no notes. */
const EMPTY: JournalHomeProps = { topics: [], today: [], counts: { thisMonth: 0, total: 0, more: false }, moodKeys: [] }

/** `/preview` has no session; two fixed topics so the circles and the FLIP can be seen. */
const PREVIEW: JournalHomeProps = {
  ...EMPTY,
  topics: [
    { id: 'preview-1', label: 'What makes you feel excited?' },
    { id: 'preview-2', label: 'What was the best thing that happened yesterday?' },
  ],
}

/**
 * Today's two topics (`dailyQuestions(category: "journal")`, drawn by the server in the
 * student's day), today's notes and the archive figures (`listJournals`), and
 * the moods of today's check-in for the circles' colours — one request, plus
 * the mood catalogue only when there was a check-in to colour from.
 *
 * **Never throws.** A cosmetic read must not take the page down; a failure is
 * the empty state, never `localStorage` or the prototype's copy.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<JournalHomeProps> {
  if (isPreviewRequest(request)) return PREVIEW

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return EMPTY

  const { accessToken, userId } = session.session
  const timeZone = timeZoneFor(request)
  const today = localDateFor(request) ?? new Date().toISOString().slice(0, 10)
  const result = await bpJournalHome(accessToken, userId, today, timeZone)
  if (!result.ok) {
    console.error(`${TAG} journal home read failed (${result.error.kind}): ${result.error.message}`)
    return EMPTY
  }

  const { topics, counts, moodIds } = result.data
  const artKeys = moodIds.length > 0 ? await moodArtKeys(accessToken) : new Map<string, string>()
  return {
    topics,
    counts,
    today: result.data.today.map(({ id, questionId, prompt, text }) => ({ id, questionId, prompt, text })),
    moodKeys: moodIds.flatMap((id) => artKeys.get(id) ?? []),
  }
}

/** Keeps the render client-only (the FLIP runs on refs). */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<JournalHomeProps> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

/**
 * Opening, saving and closing a topic all happen under this route, and none of
 * them changes what it loaded. Re-running would re-read the gateway on every
 * circle tap and every Save — and the gateway rate-limits.
 */
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  const inJournal = (path: string) => /\/student\/journal(\/prompt\/[^/]+)?\/?$/.test(path)
  if (inJournal(currentUrl.pathname) && inJournal(nextUrl.pathname)) return false
  if (formMethod && inJournal(currentUrl.pathname)) return false
  return defaultShouldRevalidate
}

export function HydrateFallback() {
  return <StagePlaceholder page="Journal" route="/student/journal" source="journal.html" chrome />
}

/**
 * Save a note written on the home (the write CTA, "+", or an edit) as a
 * Journal entry — `createJournal` publishes `journal-created`, which is what
 * the analysis reads. Filed under the prompt it was written to, and linked to
 * a catalogue question when it answers one.
 *
 * **Never fails the screen**: the card is already drawn; a refused or
 * unreachable write is logged and reported as `{ saved: false }`.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { saved: false }

  const form = await request.formData()
  const prompt = String(form.get('prompt') ?? '').trim()
  const note = String(form.get('note') ?? '').trim()
  const questionId = String(form.get('questionId') ?? '').trim()
  if (!prompt || !note) return { saved: false }

  const result = await bpCreateJournal(session.session.accessToken, session.session.userId, {
    prompt,
    note,
    ...(questionId ? { questionId } : {}),
  })
  if (!result.ok) {
    console.error(`${TAG} note failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentJournalRoute({ loaderData }: { loaderData: JournalHomeProps }) {
  return <JournalHome {...loaderData} />
}
