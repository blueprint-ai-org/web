/**
 * Recording a student's answer to a catalogue question.
 *
 * ```graphql
 * answerQuestion(input: AnswerQuestionInput!): AnswerQuestionPayload!
 * ```
 *
 * This is the write half of the question catalogue, and it is deliberately
 * generic: every screen that asks something answers through here.
 *
 * ## One mutation, because the upsert was the bug
 *
 * This module used to do the upsert itself: `listMiniSurveys(user, pageSize:
 * 100)`, scan every survey's `responses[].question_id` for the question, then
 * `updateMiniSurvey` or `createMiniSurvey`. Three things were wrong with it, and
 * step-10 removed all three.
 *
 *  1. **The read only ever saw the first page, oldest first** (the cursor sorts
 *     by `_id`). Past a hundred answers it never found the existing row, so it
 *     CREATED a second one. With ~170 answers per student it was producing
 *     duplicates in `test`.
 *  2. **Re-answering went through `update`, which skipped validation.** The
 *     gateway checked options against the question on create and not on update.
 *  3. **The answer's meaning lived here**: the question's label copied out of
 *     the catalogue, the option labels joined with `", "`, the score computed
 *     from the option's position, and `survey_type` as a literal — which is why
 *     every check-in answer was filed as `onboarding`.
 *
 * `answerQuestion` is one write against a unique index on `(user, question)`,
 * and it derives all of (3) from the catalogue. What a caller sends now is only
 * what the student chose.
 *
 * ## A student may write their own, measured 2026-09-28
 *
 * `answerQuestion` is `@auth(type: USER_OR_API)` and resolves the owner with
 * `resolveOwner`: a student answers for themselves and cannot name anybody
 * else. `scripts/bp-ai-survey-write-probe.ts` is the probe that first measured
 * the write path, kept so the finding can be re-measured.
 */

import { graphql } from './client.server'
import type { GqlResult } from './types'

/** One answered question — what the student chose, and nothing derived. */
export interface AnswerInput {
  /** The catalogue row's id. */
  questionId: string
  /**
   * Chosen option ids. The gateway validates the count against the question's
   * type: *"exactly one for SELECT_ONE, one to `max_selections` for
   * MULTISELECT, none for OPEN"*.
   */
  optionIds?: string[]
  /** The free text. Required for an OPEN question, refused for the other two. */
  answer?: string
}

const ANSWER_QUESTION = `mutation AnswerQuestion($input: AnswerQuestionInput!) {
  answerQuestion(input: $input) {
    created
    survey { id survey_type category completed_at }
  }
}`

/**
 * Record an answer, replacing this student's previous one for the same question.
 *
 * `completedAt` is passed in rather than read from the clock here so a caller
 * can keep one timestamp across a multi-question screen, and so tests are not
 * at the mercy of `Date.now()`.
 *
 * `created: false` means an answer was replaced — which is also what tells the
 * caller no sparks were awarded for it. It is returned as `updated` because
 * that is the question the screens ask.
 */
export async function bpAnswerQuestion(
  accessToken: string,
  userId: string,
  answer: AnswerInput,
  completedAt: string,
): Promise<GqlResult<{ id: string; updated: boolean }>> {
  const result = await graphql<Record<string, unknown>>(
    ANSWER_QUESTION,
    {
      input: {
        user: userId,
        questionId: answer.questionId,
        ...(answer.optionIds ? { optionIds: answer.optionIds } : {}),
        ...(answer.answer === undefined ? {} : { answer: answer.answer }),
        completedAt,
      },
    },
    { accessToken },
  )
  if (!result.ok) return result

  const payload = result.data.answerQuestion
  if (payload === null || typeof payload !== 'object') {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI answerQuestion returned no payload.' } }
  }
  const { created, survey } = payload as Record<string, unknown>
  if (survey === null || typeof survey !== 'object') {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI answerQuestion returned no record.' } }
  }
  const id = (survey as Record<string, unknown>).id
  if (typeof id !== 'string' || !id) {
    // Same rule as `bpCreateJournal`: reporting "saved" for a write that did
    // not happen is the one answer the student must never get, because the
    // screen has already moved on and nothing retries.
    return { ok: false, error: { kind: 'unknown', message: 'BP AI answerQuestion returned a record with no id.' } }
  }

  return { ok: true, data: { id, updated: created === false } }
}
