/**
 * `/student/notice-wins` — notice-wins activity (ports `notice-wins.html`).
 *
 * Full-bleed page (no sidebar): the monster asks today's wins question (the
 * server's `dailyQuestions(category: "gratitude", topic: "wins")`) over a
 * textarea, prefilled with today's win when there is one; Save records it as a
 * `win_gratitude` and hands off to `/student/completed?card=wins` (Phase 7).
 * Client-only render (see `HydrateFallback`). Mirrored at
 * `/preview/student/notice-wins`.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { NoticeWins } from '~/components/dashboard/student/activities'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpNoticeWins, bpSaveWin, EMPTY_NOTICE_WINS, type NoticeWinsData } from '~/lib/bp-ai/wins.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor, timeZoneFor } from '~/lib/student/time-zone'

const TAG = '[notice-wins]'

export function meta() {
  return [{ title: 'Notice wins · Blueprint' }, { name: 'description', content: 'Notice-wins activity.' }]
}

const PREVIEW: NoticeWinsData = {
  question: { id: 'preview-wins', label: 'What went well today, even a little?' },
  today: null,
  reward: 1,
}

function today(request: Request): string {
  return localDateFor(request) ?? new Date().toISOString().slice(0, 10)
}

/**
 * Today's question, today's win and what a win pays, in one request. No BP
 * session or a failed read ⇒ nothing to ask, never the prototype's question or
 * `localStorage`.
 *
 * Also read by the hub's wins overlay (`useFetcher().load`), so the overlay and
 * this screen cannot disagree about what today's win says.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<NoticeWinsData> {
  if (isPreviewRequest(request)) return PREVIEW

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return EMPTY_NOTICE_WINS

  const result = await bpNoticeWins(session.session.accessToken, today(request), timeZoneFor(request))
  if (!result.ok) {
    console.error(`${TAG} read failed (${result.error.kind}): ${result.error.message}`)
    return EMPTY_NOTICE_WINS
  }
  return result.data
}

/** Keeps the render client-only. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<NoticeWinsData> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Notice wins" route="/student/notice-wins" source="notice-wins.html" />
}

/**
 * Save the win. **Today's win is looked up here**, not trusted from the page: a
 * second tab, or a save after midnight on a page loaded before it, must still
 * update the right day's row or create a new one.
 *
 * **Never fails the screen** — the shell has already moved on to the completed
 * screen; a refused or unreachable write is logged and reported as
 * `{ saved: false }`.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { saved: false, sparksAwarded: null }

  const form = await request.formData()
  const questionId = String(form.get('questionId') ?? '').trim()
  const question = String(form.get('question') ?? '').trim()
  const note = String(form.get('note') ?? '').trim()
  if (!questionId || !question || !note) return { saved: false, sparksAwarded: null }

  const { accessToken, userId } = session.session
  const current = await bpNoticeWins(accessToken, today(request), timeZoneFor(request))
  if (!current.ok) {
    console.error(`${TAG} reading today's win failed (${current.error.kind}): ${current.error.message}`)
    return { saved: false, sparksAwarded: null }
  }

  const result = await bpSaveWin(accessToken, userId, {
    todayWinId: current.data.today?.id ?? null,
    questionId,
    question,
    note,
  })
  if (!result.ok) {
    console.error(`${TAG} saving the win failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false, sparksAwarded: null }
  }
  return { saved: true, sparksAwarded: result.data.sparksAwarded }
}

export default function StudentNoticeWinsRoute({ loaderData }: { loaderData: NoticeWinsData }) {
  return <NoticeWins data={loaderData} />
}
