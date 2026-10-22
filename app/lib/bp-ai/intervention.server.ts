/**
 * The student's intervention session (plan 2026-10-21 step-14).
 *
 * One session walks the FSM `EXPRESSION → SUPPORT → ACTION → FOLLOW_UP`
 * (SAD §7.5), and this module is the only place the app talks to it.
 *
 * ## Why `createInterventionSession` and not the `intervention` query
 *
 * The step's spec says "`bpIntervention`", and the `intervention(studentId:)`
 * QUERY does return the same payload — but its `sessionId` is a **fresh uuid
 * minted per call** by notification's `InterventionEngine.composeForUser`
 * (`.../intervention_engine.ts:125`) and never written to
 * `<tenantID>.intervention_sessions`. Nothing can be transitioned on it: the
 * first `transitionInterventionState` would be a session the orchestrator has
 * never heard of. Only the `createInterventionSession` MUTATION creates the FSM
 * session and overrides the payload's `sessionId` with it
 * (`api/graph/intervention.resolvers.go:203-247`), so that is the entry point.
 * It is also one round trip instead of two.
 *
 * ## `success: false` is a result, not a failure
 *
 * Both `transitionInterventionState` and `continueSupport` answer HTTP 200 with
 * `success: false` when the FSM guard refuses — a replayed Continue, a
 * SUPPORT→ACTION before the support screen was acknowledged. That is the
 * guard working. It comes back as `{ ok: false, error: { kind: 'fsm' } }` so a
 * caller cannot mistake it for a success, and nothing throws.
 *
 * ## The guard this file exists to satisfy
 *
 * Since step-13 entering SUPPORT no longer unblocks ACTION: `continueSupport`
 * is the ONLY thing that sets `support_screen_viewed` (L5-R19). A front that
 * transitions straight to ACTION is refused and the student is stuck on the
 * support screen, so {@link bpContinueSupport} must run before
 * {@link bpTransition} to `ACTION`. `intervention.test.ts` pins that order.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { CreateInterventionSessionMutation } from './gql/graphql'
import type { InterventionState } from './gql/schema'
import type { GqlResult } from './types'

const CREATE_SESSION = gql(`mutation CreateInterventionSession($studentId: ID!) {
  createInterventionSession(studentId: $studentId) {
    sessionId
    pathway
    supportBlocks { type content order }
    actionPayload { tools { id name description toolType } }
    uiMode
    requiresAcknowledgment
    safetyMessage
    crisisResources { hotline textLine }
  }
}`)

/**
 * Everything the student's screens need, in the gateway's own shape.
 *
 * Derived from the document rather than re-declared, so a selection set that
 * stops matching the SDL is a `npm run codegen` failure and not an `undefined`
 * in a browser.
 */
export type StudentIntervention = CreateInterventionSessionMutation['createInterventionSession']

/** Open a session in `EXPRESSION` and get its payload. */
export async function bpStartIntervention(
  accessToken: string,
  studentId: string,
): Promise<GqlResult<StudentIntervention>> {
  const result = await graphql(CREATE_SESSION, { studentId }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.createInterventionSession }
}

const TRANSITION = gql(`mutation TransitionIntervention($sessionId: ID!, $toState: InterventionState!) {
  transitionInterventionState(sessionId: $sessionId, toState: $toState) { success error }
}`)

/** Advance the FSM one state. A refused guard is `kind: 'fsm'`, not a throw. */
export async function bpTransition(
  accessToken: string,
  sessionId: string,
  toState: InterventionState,
): Promise<GqlResult<null>> {
  const result = await graphql(TRANSITION, { sessionId, toState }, { accessToken })
  if (!result.ok) return result
  return fsmResult(result.data.transitionInterventionState, `transition to ${toState}`)
}

const CONTINUE_SUPPORT = gql(`mutation ContinueSupport($sessionId: ID!) {
  continueSupport(sessionId: $sessionId) { success error }
}`)

/**
 * The student pressed Continue on the support screen.
 *
 * It does **not** change state — it only satisfies `support_screen_viewed`, so
 * the caller still has to transition to `ACTION` afterwards.
 */
export async function bpContinueSupport(accessToken: string, sessionId: string): Promise<GqlResult<null>> {
  const result = await graphql(CONTINUE_SUPPORT, { sessionId }, { accessToken })
  if (!result.ok) return result
  return fsmResult(result.data.continueSupport, 'continueSupport')
}

function fsmResult(outcome: { success: boolean; error?: string | null }, what: string): GqlResult<null> {
  if (!outcome.success) {
    return { ok: false, error: { kind: 'fsm', message: `BP AI refused ${what}: ${outcome.error ?? 'no reason given'}` } }
  }
  return { ok: true, data: null }
}

const RECORD_OUTCOME = gql(`mutation RecordInterventionOutcome($input: RecordOutcomeInput!) {
  recordInterventionOutcome(input: $input) { success message }
}`)

/**
 * Close the learning loop for a finished session.
 *
 * `moodDelta`, `engagementRecovery` and `toolReuseRate` are `Float!` in the
 * schema and the browser measures **none** of them — they are computed from
 * behavioural data downstream. The caller sends `0` for the three and puts the
 * student's own answer in the optional `humanRating`, which is the one number
 * this screen actually knows.
 */
export async function bpRecordOutcome(
  accessToken: string,
  input: {
    sessionId: string
    studentId: string
    toolId: string
    moodDelta: number
    engagementRecovery: number
    toolReuseRate: number
    humanRating?: number
  },
): Promise<GqlResult<null>> {
  const result = await graphql(RECORD_OUTCOME, { input }, { accessToken })
  if (!result.ok) return result
  return fsmResult(result.data.recordInterventionOutcome, 'recordInterventionOutcome')
}
