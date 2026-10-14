/**
 * Support request and the "did it help?" follow-up (plan 2026-10-06 step-16).
 *
 * `requestSupport` is the "Need to talk? → Save" screen. Its answer decides the
 * copy of the done screen: only `delivered: true` may say "someone at your
 * school will be in touch". Before step-16 nothing was sent and the screen said
 * it anyway.
 *
 * The follow-up pair reads the oldest pending "did it help?" for the student
 * (with the tool the session suggested) and records the answer.
 */

import { graphql } from './client.server'
import type { FollowupOutcome } from './gql/schema'
import type { GqlResult } from './types'

const REQUEST_SUPPORT = `mutation RequestSupport($message: String!, $requestId: ID!) {
  requestSupport(message: $message, requestId: $requestId) { requestId delivered }
}`

/** Ask the student's school for help. The student is the token's user. */
export async function bpRequestSupport(
  accessToken: string,
  message: string,
  requestId: string,
): Promise<GqlResult<{ delivered: boolean }>> {
  const result = await graphql<{ requestSupport?: { delivered?: unknown } }>(
    REQUEST_SUPPORT,
    { message, requestId },
    { accessToken },
  )
  if (!result.ok) return result

  const delivered = result.data.requestSupport?.delivered
  if (typeof delivered !== 'boolean') {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI requestSupport returned no delivered flag.' } }
  }
  return { ok: true, data: { delivered } }
}

export interface PendingFollowup {
  id: string
  /** Null when the session suggested no tool, or one the catalogue does not know. */
  toolName: string | null
}

const PENDING_FOLLOWUPS = `query PendingFollowups {
  pendingFollowups(page_size: 1) { schedules { id toolName } }
}`

/** The oldest follow-up still waiting for this student, or null. */
export async function bpPendingFollowup(accessToken: string): Promise<GqlResult<PendingFollowup | null>> {
  const result = await graphql<{ pendingFollowups?: { schedules?: { id?: unknown; toolName?: unknown }[] } }>(
    PENDING_FOLLOWUPS,
    {},
    { accessToken },
  )
  if (!result.ok) return result

  const first = result.data.pendingFollowups?.schedules?.[0]
  if (!first) return { ok: true, data: null }
  if (typeof first.id !== 'string' || !first.id) {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI pendingFollowups returned a schedule with no id.' } }
  }
  return {
    ok: true,
    data: { id: first.id, toolName: typeof first.toolName === 'string' && first.toolName ? first.toolName : null },
  }
}

const ACK_FOLLOWUP = `mutation AckFollowup($id: ID!, $outcome: FollowupOutcome) {
  ackFollowup(id: $id, outcome: $outcome) { delivered }
}`

/** Record the student's answer and consume the follow-up. */
export async function bpAckFollowup(
  accessToken: string,
  id: string,
  outcome: FollowupOutcome,
): Promise<GqlResult<null>> {
  const result = await graphql<Record<string, unknown>>(ACK_FOLLOWUP, { id, outcome }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: null }
}
