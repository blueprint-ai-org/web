/**
 * `POST /api/mood-checkin` — the daily check-in's single write.
 *
 * ## Why a resource route and not the screen's `action`
 *
 * `/student/mood-checkin` renders a client-only imperative orchestrator
 * (`MoodCheckin.tsx`): it owns stable `.mc-screen` wrappers and mutates them by
 * hand precisely so React never re-renders a wrapper mid-transition, and the
 * route declares a `HydrateFallback`. A form post to the route's own `action`
 * would revalidate its loader and re-render the tree underneath a running
 * animation. So the write is a `fetch` to here, per `CLAUDE.md` §1b layer 2 —
 * anything the browser must call after hydration belongs in `app/routes/api.*`.
 *
 * ## It never fails the student
 *
 * The check-in ends in a reward and an exit animation. A refused or unreachable
 * write is logged and reported in the response; it never throws, never
 * 4xx/5xxs, and never blocks the flow. Losing one datum beats stranding a child
 * on a dead end at the end of a check-in they completed.
 *
 * ## One request, and no partial result
 *
 * The emotions, the two questions beside them and the night's sleep are
 * written by ONE `submitCheckIn`, in one transaction (step-10; the sleep
 * became a `sleep_profile` in step-29). It used to be up to seven
 * round trips — a mood-history create plus, per answer, a list and a
 * create-or-update — each able to fail on its own, so the response was a
 * per-part `{moods, reasons, other, sleep}` and a check-in could be stored with
 * its moods and without its reasons. There is no partial state to report any
 * more: `saved` is one boolean.
 *
 * The body carries ids the loader already handed the client — no lookup by
 * label or identifier happens here. A part the screen has no ids for (the
 * gateway was unreachable at load) is simply absent from the request.
 */

import type { ActionFunctionArgs } from 'react-router'

import { bpSubmitCheckIn, type CheckinAnswer, type MoodPick } from '~/lib/bp-ai/moods.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

/**
 * Up to three picked moods.
 *
 * **No intensity.** Each arc stop is a real mood with a triad `level`, and the
 * SERVER derives the stored intensity from it (step-8). The client used to send
 * a number from a local `[2,5,8]` table, so the scale lived in a browser.
 */
interface MoodPayload {
  moodId: string
}

/**
 * What the client sends.
 *
 * The question label and the joined answer text used to come too, and are gone
 * with the client-side upsert (step-10): the server derives both from the
 * catalogue, so a browser can no longer disagree with it about what an answer
 * says.
 */
interface CheckinPayload {
  moods?: MoodPayload[]
  /** The `mood_reason` MULTISELECT — its row id and the chosen option ids. */
  reasons?: { questionId: string; optionIds: string[] }
  /** The "Add other" OPEN companion — free text, emoji included. */
  other?: { questionId: string; answer: string }
  /**
   * The chosen stop of the `checkin.sleep` scale. Sent as `sleepOptionId`, which
   * the server stores as `sleep_profile.quality` — not as an answer.
   */
  sleep?: { optionId: string }
}

function readMoods(value: unknown): MoodPick[] {
  if (!Array.isArray(value)) return []
  const entries: MoodPick[] = []
  for (const row of value) {
    if (row === null || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const moodId = typeof record.moodId === 'string' ? record.moodId.trim() : ''
    if (!moodId) continue
    entries.push({ moodId })
  }
  // No cap here. The picker limits the UI to three because that is design, and
  // the SERVER enforces it: a forged body with four moods is refused as a whole
  // request, which is the honest outcome. Trimming it silently was this route
  // deciding a product rule it does not own.
  return entries
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** The two questions, in the order the student answered them. */
function readAnswers(payload: CheckinPayload): CheckinAnswer[] {
  const answers: CheckinAnswer[] = []

  if (payload.reasons) {
    const optionIds = Array.isArray(payload.reasons.optionIds)
      ? payload.reasons.optionIds.map(str).filter(Boolean)
      : []
    const questionId = str(payload.reasons.questionId)
    // A MULTISELECT answer with no options is refused by the server as a whole
    // request, which would now take the moods down with it — so an empty
    // selection is simply not an answer.
    if (questionId && optionIds.length > 0) {
      answers.push({ questionId, optionIds })
    }
  }

  if (payload.other) {
    const questionId = str(payload.other.questionId)
    const answer = str(payload.other.answer)
    // OPEN takes no option ids and refuses an empty body.
    if (questionId && answer) answers.push({ questionId, answer })
  }

  return answers
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 })
  }

  const bp = await bpSessionOf(await getAppSession(request))
  // No BP AI session (or a launch the gateway would not exchange). Not an error — but
  // it looks exactly like a broken save, so say so in dev rather than leave it
  // to be guessed at.
  if (!bp) {
    if (import.meta.env.DEV) {
      console.log(`[api/mood-checkin] no BP session — nothing recorded`)
    }
    return Response.json({ ok: false, reason: 'no-session' })
  }

  let payload: CheckinPayload
  try {
    payload = (await request.json()) as CheckinPayload
  } catch {
    return Response.json({ ok: false, reason: 'bad-json' }, { status: 400 })
  }

  const { accessToken, userId } = bp
  const entries = readMoods(payload.moods)
  if (entries.length === 0) {
    // No moods is not a check-in. It was reported as `moods: false` beside
    // three answers that may have been written, which is the half-state this
    // route no longer has.
    return Response.json({ ok: false, reason: 'no-moods' })
  }

  const sleepOptionId = str(payload.sleep?.optionId)
  const result = await bpSubmitCheckIn(accessToken, userId, entries, readAnswers(payload), {
    ...(sleepOptionId ? { sleepOptionId } : {}),
  })
  if (!result.ok) {
    console.error(`[api/mood-checkin] submitCheckIn failed (${result.error.kind}): ${result.error.message}`)
    return Response.json({ ok: false, reason: 'write-failed' })
  }

  return Response.json({ ok: true, saved: result.data !== null, answers: result.data?.answers ?? 0 })
}

/**
 * A GET here is a mistake, not a page. The check-in reads through its own
 * route's loader; this endpoint exists only to be posted to.
 */
export function loader() {
  return Response.json({ ok: false, reason: 'method' }, { status: 405 })
}
