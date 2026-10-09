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
 * write is logged and reported per-part in the response; it never throws, never
 * 4xx/5xxs, and never blocks the flow. Losing one datum beats stranding a child
 * on a dead end at the end of a check-in they completed.
 *
 * ## One request, two domains
 *
 * The emotions and their intensities are a first-class domain with their own
 * history and counts, written as **one** `MoodHistory` row. The reasons, the
 * free-text "Add other" and the sleep answer are *questions*, written as
 * mini-survey answers through the same `bpRecordAnswer` the onboarding screens
 * use. Both happen here so the client makes one call at the end of the flow.
 *
 * The body carries ids the loader already handed the client — no lookup by
 * label or identifier happens here. When the gateway was unreachable at load,
 * the screen rendered baked copy and has no ids to send; the corresponding part
 * is simply absent and reported as unsaved.
 */

import type { ActionFunctionArgs } from 'react-router'

import { bpRecordAnswer } from '~/lib/bp-ai/answers.server'
import { bpRecordMoodCheckin, clampIntensity, type MoodEntry } from '~/lib/bp-ai/moods.server'
import { getAppSession } from '~/lib/session.server'

/** Up to three picked emotions, each with the arc stop it was left on. */
interface MoodPayload {
  moodId: string
  intensity: number
}

interface CheckinPayload {
  moods?: MoodPayload[]
  /** The `mood_reason` MULTISELECT — its row id and the chosen option ids. */
  reasons?: { questionId: string; question: string; optionIds: string[]; answer: string }
  /** The "Add other" OPEN companion — free text, emoji included. */
  other?: { questionId: string; question: string; answer: string }
  /** The sleep SELECT_ONE — exactly one option id. */
  sleep?: { questionId: string; question: string; optionId: string; answer: string }
}

/** What each part of the write did, so the client can log a partial save. */
interface CheckinResult {
  moods: boolean
  reasons: boolean
  other: boolean
  sleep: boolean
}

function readMoods(value: unknown): MoodEntry[] {
  if (!Array.isArray(value)) return []
  const entries: MoodEntry[] = []
  for (const row of value) {
    if (row === null || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const moodId = typeof record.moodId === 'string' ? record.moodId.trim() : ''
    const intensity = typeof record.intensity === 'number' ? record.intensity : NaN
    if (!moodId || !Number.isFinite(intensity)) continue
    entries.push({ moodId, intensity: clampIntensity(intensity) })
  }
  // The picker caps at three; a longer list is a bug or a forged body, and the
  // extra entries are dropped rather than sent.
  return entries.slice(0, 3)
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 })
  }

  const session = await getAppSession(request)
  // An LTI launch carries Canvas claims and no BP AI token. Not an error — but
  // it looks exactly like a broken save, so say so in dev rather than leave it
  // to be guessed at.
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`[api/mood-checkin] no BP session (kind: ${session?.kind ?? 'none'}) — nothing recorded`)
    }
    return Response.json({ ok: false, reason: 'no-session' })
  }

  let payload: CheckinPayload
  try {
    payload = (await request.json()) as CheckinPayload
  } catch {
    return Response.json({ ok: false, reason: 'bad-json' }, { status: 400 })
  }

  const { accessToken, userId } = session.session
  const completedAt = new Date().toISOString()
  const saved: CheckinResult = { moods: false, reasons: false, other: false, sleep: false }

  const entries = readMoods(payload.moods)
  if (entries.length > 0) {
    const result = await bpRecordMoodCheckin(accessToken, userId, entries)
    if (result.ok) {
      saved.moods = result.data !== null
    } else {
      console.error(`[api/mood-checkin] createMoodHistory failed (${result.error.kind}): ${result.error.message}`)
    }
  }

  /** One answer, logged and shrugged off on failure. */
  const record = async (
    part: keyof CheckinResult,
    input: { questionId: string; question: string; answer: string; optionIds: string[] },
  ) => {
    if (!input.questionId || !input.answer) return
    const result = await bpRecordAnswer(accessToken, userId, input, completedAt)
    if (result.ok) saved[part] = true
    else console.error(`[api/mood-checkin] recording ${part} failed (${result.error.kind}): ${result.error.message}`)
  }

  if (payload.reasons) {
    const optionIds = Array.isArray(payload.reasons.optionIds)
      ? payload.reasons.optionIds.map(str).filter(Boolean)
      : []
    // The gateway validates a MULTISELECT answer as one to `max_selections`,
    // which is 3 on this question — an over-long list is refused outright, so
    // it is trimmed rather than sent to fail.
    if (optionIds.length > 0) {
      await record('reasons', {
        questionId: str(payload.reasons.questionId),
        question: str(payload.reasons.question),
        answer: str(payload.reasons.answer),
        optionIds: optionIds.slice(0, 3),
      })
    }
  }

  if (payload.other) {
    // OPEN takes no option ids — the gateway refuses an answer that carries any.
    await record('other', {
      questionId: str(payload.other.questionId),
      question: str(payload.other.question),
      answer: str(payload.other.answer),
      optionIds: [],
    })
  }

  if (payload.sleep) {
    const optionId = str(payload.sleep.optionId)
    if (optionId) {
      await record('sleep', {
        questionId: str(payload.sleep.questionId),
        question: str(payload.sleep.question),
        answer: str(payload.sleep.answer),
        optionIds: [optionId],
      })
    }
  }

  return Response.json({ ok: true, saved })
}

/**
 * A GET here is a mistake, not a page. The check-in reads through its own
 * route's loader; this endpoint exists only to be posted to.
 */
export function loader() {
  return Response.json({ ok: false, reason: 'method' }, { status: 405 })
}
