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
import { FollowupOutcome } from '~/lib/bp-ai/gql/schema'
import { bpAckFollowup, bpPendingFollowup } from '~/lib/bp-ai/support.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

const TAG = '[session-feedback]'

/** The three answers, in the gateway's vocabulary (step-16). */
export const OUTCOME_BY_ANSWER: Record<ResponseKey, FollowupOutcome> = {
  yes: FollowupOutcome.Helped,
  'not-really': FollowupOutcome.NotHelped,
  didnt: FollowupOutcome.NotDone,
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

  const result = await bpPendingFollowup(bp.accessToken)
  if (!result.ok) {
    console.error(`${TAG} pendingFollowups failed (${result.error.kind}): ${result.error.message}`)
    throw redirect('/student/mood-checkin')
  }
  if (!result.data) throw redirect('/student/mood-checkin')
  return { followup: result.data }
}

/** Record the answer. Never fails the screen: it has already moved on. */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { saved: false }

  const form = await request.formData()
  const id = String(form.get('id') ?? '')
  const outcome = OUTCOME_BY_ANSWER[String(form.get('answer') ?? '') as ResponseKey]
  if (!id || !outcome) return { saved: false }

  const result = await bpAckFollowup(bp.accessToken, id, outcome)
  if (!result.ok) {
    console.error(`${TAG} ackFollowup failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
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
