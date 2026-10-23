/**
 * `/student/session-feedback` — session feedback (ports `session-feedback.html`).
 *
 * Full-bleed page (no sidebar): a "Did it help?" question screen + three
 * terminal response screens, all rendered by {@link SessionFeedback}. Exit →
 * `/student/mood-checkin`. No inbound link in the prototype — direct-URL
 * scenario. Mirrored at `/preview/student/session-feedback`.
 */

import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'

import { SessionFeedback } from '~/components/dashboard/student/session-feedback'
import type { ResponseKey } from '~/components/dashboard/student/session-feedback/session-feedback-data'
import { FollowupOutcome, InterventionEventType, InterventionState } from '~/lib/bp-ai/gql/schema'
import { bpRecordOutcome, bpReportInterventionEvent, bpTransition } from '~/lib/bp-ai/intervention.server'
import { bpAckFollowup, bpPendingFollowup } from '~/lib/bp-ai/support.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

const TAG = '[session-feedback]'

/** The three answers, in the gateway's vocabulary (step-16). */
export const OUTCOME_BY_ANSWER: Record<ResponseKey, FollowupOutcome> = {
  yes: FollowupOutcome.Helped,
  'not-really': FollowupOutcome.NotHelped,
  didnt: FollowupOutcome.NotDone,
}

/**
 * The same three answers as a `human_rating` for `recordInterventionOutcome`
 * (step-14).
 *
 * The agent normalises the rating to `[0, 1]` and reads **0.0 as absent**
 * (`apps/agent/infra/grpc/outcome_servicer.py:118`), so "not really" is 0.25
 * and not 0 — a zero would be recorded as no rating at all. "I didn't do that"
 * sends none: there is nothing to rate.
 */
const RATING_BY_ANSWER: Record<ResponseKey, number | null> = {
  yes: 1,
  'not-really': 0.25,
  didnt: null,
}

export function meta() {
  return [{ title: 'Session feedback · Blueprint' }, { name: 'description', content: 'Session feedback.' }]
}

/**
 * The oldest pending "did it help?" (step-16). With a BP session and nothing
 * pending there is nothing to ask, so the student goes on to the check-in.
 * Without a BP session (preview) the screen renders with no follow-up.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { followup: null }

  // `?session=` means the student arrived from an intervention's Action screen
  // (step-14), so this is that session's closing screen and NOT the daily
  // follow-up prompt. Without the marker the redirect below would bounce a
  // child who has no pending follow-up straight back into a check-in.
  if (new URL(request.url).searchParams.has('session')) return { followup: null }

  const result = await bpPendingFollowup(bp.accessToken)
  if (!result.ok) {
    console.error(`${TAG} pendingFollowups failed (${result.error.kind}): ${result.error.message}`)
    throw redirect('/student/mood-checkin')
  }
  if (!result.data) throw redirect('/student/mood-checkin')
  return { followup: result.data }
}

/**
 * Record the answer. Never fails the screen: it has already moved on.
 *
 * Two shapes, told apart by which id the form carries:
 *
 *  - `sessionId` — the end of an intervention (step-14): record the outcome,
 *    which closes the learning loop and schedules the follow-up modal, then
 *    move the FSM to `FOLLOW_UP`.
 *  - `id` — the daily follow-up prompt (step-16): consume it.
 */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { saved: false }

  const form = await request.formData()
  const answer = String(form.get('answer') ?? '') as ResponseKey

  const sessionId = String(form.get('sessionId') ?? '')
  if (sessionId) return recordOutcome(bp.accessToken, bp.userId, sessionId, String(form.get('toolId') ?? ''), answer)

  const id = String(form.get('id') ?? '')
  const outcome = OUTCOME_BY_ANSWER[answer]
  if (!id || !outcome) return { saved: false }

  const result = await bpAckFollowup(bp.accessToken, id, outcome)
  if (!result.ok) {
    console.error(`${TAG} ackFollowup failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

async function recordOutcome(
  accessToken: string,
  studentId: string,
  sessionId: string,
  toolId: string,
  answer: ResponseKey,
): Promise<{ saved: boolean }> {
  const rating = RATING_BY_ANSWER[answer]
  if (rating === undefined) return { saved: false }

  const result = await bpRecordOutcome(accessToken, {
    sessionId,
    studentId,
    toolId,
    // The browser measures none of the three. They are derived from
    // behavioural data downstream; `0` is "no signal from here", and the one
    // number this screen does know travels as `humanRating`.
    moodDelta: 0,
    engagementRecovery: 0,
    toolReuseRate: 0,
    ...(rating === null ? {} : { humanRating: rating }),
  })
  if (!result.ok) {
    console.error(`${TAG} recordInterventionOutcome failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }

  // Step-28: the student finished the loop. Reported after the outcome
  // landed, for the same reason the transition is: a session whose outcome
  // was refused did not complete.
  const reported = await bpReportInterventionEvent(
    accessToken,
    sessionId,
    InterventionEventType.Completed,
    toolId || undefined,
  )
  if (!reported.ok) {
    console.error(`${TAG} reportInterventionEvent COMPLETED failed (${reported.error.kind}): ${reported.error.message}`)
  }

  // FOLLOW_UP last: the outcome is what the state means, so a session marked
  // closed without one would claim a loop that never closed.
  const closed = await bpTransition(accessToken, sessionId, InterventionState.FollowUp)
  if (!closed.ok) {
    console.error(`${TAG} ACTION→FOLLOW_UP failed (${closed.error.kind}): ${closed.error.message}`)
  }
  return { saved: true }
}

export default function StudentSessionFeedbackRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>
}) {
  return <SessionFeedback followup={loaderData?.followup ?? null} />
}
