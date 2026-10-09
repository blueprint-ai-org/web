/**
 * Recording a student's answer to a catalogue question.
 *
 * ```graphql
 * createMiniSurvey(input: CreateMiniSurveyInput!): MiniSurvey!
 * updateMiniSurvey(input: UpdateMiniSurveyInput!): MiniSurvey!
 * listMiniSurveys(user: String, page_size: Int, page_token: String): ListMiniSurveysResponse!
 * ```
 *
 * This is the write half of the question catalogue, and it is deliberately
 * generic: every onboarding screen that asks something answers through here.
 * `baseline-mood` is the first; `helpers` and `trusted-person` are multi-select
 * versions of the same shape.
 *
 * ## Why mini-surveys and not moods
 *
 * `createMoodHistory` takes `MoodEntryInput { id, intensity }`, whose ids come
 * from the **Mood catalogue** — a rich emotion vocabulary (`bored`, `stressed`,
 * `envious`, `awed`…) with an intensity per entry. That is the daily check-in
 * taxonomy. Our screens ask catalogue **questions** with **options**, and
 * `SurveyResponseInput` is the only input in the whole schema carrying
 * `question_id` and `option_ids`.
 *
 * ## A student may write their own, measured 2026-09-28
 *
 * `createMiniSurvey`, `updateMiniSurvey` and `deleteMiniSurvey` carry no
 * `description`, so their access gate is undocumented and had to be probed:
 * a student's own token creates a survey for themselves, reads it back with
 * `responses` intact, and deletes it. `scripts/bp-ai-survey-write-probe.ts`
 * is that probe, kept so the finding can be re-measured.
 *
 * This does **not** contradict `setMyAvatar` being *"el único cambio que un
 * no-admin puede hacerse"*. That describes writes to a student's own **user
 * record**; a mini-survey is a separate document about them, not a field on
 * them.
 *
 * ## One survey per question, updated rather than duplicated
 *
 * Onboarding lets a student go back and change an answer, and a screen that
 * created a row per visit would leave a wellbeing dataset full of near-
 * duplicate records that anything aggregating moods would have to guess its
 * way through. So a write looks for this student's existing survey for the
 * same `question_id` and updates it; only a genuinely new question creates.
 * The extra `listMiniSurveys` costs one read on a path that runs when somebody
 * presses Next, which is not a hot path.
 */

import { graphql } from './client.server'
import type { GqlResult } from './types'

/**
 * `survey_type` and `category` for everything answered during onboarding.
 *
 * The tenant had **zero** mini-surveys before this shipped, so these values are
 * a convention being set rather than one being followed — whatever goes in the
 * first row is what every later row and every aggregate keys on. `onboarding`
 * matches the question catalogue's own category, which is the only existing
 * vocabulary on this data, so it is the least inventive choice available.
 * Worth confirming with the backend before there is enough data to make it
 * expensive to change.
 */
export const ONBOARDING_SURVEY_TYPE = 'onboarding'

/**
 * `survey_type` and `category` for a journal topic answer — the question
 * catalogue's own category name again, for the same reason as above.
 */
export const JOURNAL_SURVEY_TYPE = 'journal'

/** `survey_type` and `category` for an all-about-you answer — its catalogue category. */
export const ABOUT_YOU_SURVEY_TYPE = 'about_you'

/** One answered question. */
export interface AnswerInput {
  /** The catalogue row's id — what links this answer to the question. */
  questionId: string
  /** The question's text, stored alongside so a reader needs no join. */
  question: string
  /** Human-readable answer, for a reader that does not resolve options. */
  answer: string
  /**
   * Chosen option ids. The gateway validates the count against the question's
   * type: *"exactly one for SELECT_ONE, one to `max_selections` for
   * MULTISELECT, none for OPEN"*.
   */
  optionIds: string[]
  /** Optional numeric value, for a scale that has one. */
  score?: number
}

const MINI_SURVEY_FIELDS = 'id survey_type category completed_at'

const LIST_MINE = `query ListMyMiniSurveys($user: String, $pageSize: Int) {
  listMiniSurveys(user: $user, page_size: $pageSize) {
    mini_surveys { ${MINI_SURVEY_FIELDS} responses { question_id } }
  }
}`

const CREATE = `mutation CreateMiniSurvey($input: CreateMiniSurveyInput!) {
  createMiniSurvey(input: $input) { ${MINI_SURVEY_FIELDS} }
}`

const UPDATE = `mutation UpdateMiniSurvey($input: UpdateMiniSurveyInput!) {
  updateMiniSurvey(input: $input) { ${MINI_SURVEY_FIELDS} }
}`

function responseInput(answer: AnswerInput) {
  return {
    question: answer.question,
    answer: answer.answer,
    question_id: answer.questionId,
    option_ids: answer.optionIds,
    ...(answer.score === undefined ? {} : { score: answer.score }),
  }
}

/** The id of this student's existing survey for `questionId`, if any. */
async function existingSurveyId(
  accessToken: string,
  userId: string,
  questionId: string,
): Promise<GqlResult<string | null>> {
  const result = await graphql<Record<string, unknown>>(
    LIST_MINE,
    { user: userId, pageSize: 100 },
    { accessToken },
  )
  if (!result.ok) return result

  const payload = result.data.listMiniSurveys
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).mini_surveys)
      ? ((payload as Record<string, unknown>).mini_surveys as unknown[])
      : []

  for (const row of rows) {
    if (row === null || typeof row !== 'object') continue
    const survey = row as Record<string, unknown>
    const responses = Array.isArray(survey.responses) ? survey.responses : []
    const hit = responses.some(
      (r) => r !== null && typeof r === 'object' && (r as Record<string, unknown>).question_id === questionId,
    )
    if (hit && typeof survey.id === 'string') return { ok: true, data: survey.id }
  }
  return { ok: true, data: null }
}

/**
 * Record an answer, replacing this student's previous one for the same
 * question.
 *
 * `completedAt` is passed in rather than read from the clock here so a caller
 * can keep one timestamp across a multi-question screen, and so tests are not
 * at the mercy of `Date.now()`. `surveyType` tags the row with where it was
 * answered; it defaults to onboarding, which every caller before the journal
 * relied on.
 */
export async function bpRecordAnswer(
  accessToken: string,
  userId: string,
  answer: AnswerInput,
  completedAt: string,
  surveyType: string = ONBOARDING_SURVEY_TYPE,
): Promise<GqlResult<{ id: string; updated: boolean }>> {
  const existing = await existingSurveyId(accessToken, userId, answer.questionId)
  if (!existing.ok) return existing

  const responses = [responseInput(answer)]

  if (existing.data) {
    // `survey_type` is `String!` on `UpdateMiniSurveyInput` — **required on an
    // update**, unlike every other field on it. Omitting it does not fail
    // validation at the client; the gateway answers `must be defined`, which
    // names no field and reads like a bug in the caller's own code. Measured
    // 2026-09-28, and it cost a debugging round.
    const result = await graphql<Record<string, unknown>>(
      UPDATE,
      {
        input: {
          id: existing.data,
          survey_type: surveyType,
          category: surveyType,
          responses,
          completed_at: completedAt,
        },
      },
      { accessToken },
    )
    if (!result.ok) return result
    const survey = result.data.updateMiniSurvey
    if (survey === null || typeof survey !== 'object') {
      return { ok: false, error: { kind: 'unknown', message: 'BP AI updateMiniSurvey returned no record.' } }
    }
    return { ok: true, data: { id: String((survey as Record<string, unknown>).id), updated: true } }
  }

  const result = await graphql<Record<string, unknown>>(
    CREATE,
    {
      input: {
        user: userId,
        survey_type: surveyType,
        category: surveyType,
        completed_at: completedAt,
        responses,
      },
    },
    { accessToken },
  )
  if (!result.ok) return result
  const survey = result.data.createMiniSurvey
  if (survey === null || typeof survey !== 'object') {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI createMiniSurvey returned no record.' } }
  }
  return { ok: true, data: { id: String((survey as Record<string, unknown>).id), updated: false } }
}
