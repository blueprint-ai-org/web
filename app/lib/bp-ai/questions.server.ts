/**
 * Questions, read from the tenant's BP AI question catalogue.
 *
 * ```graphql
 * listQuestions(
 *   category: String, keys: [String!], ids: [ID!],
 *   status: CatalogueStatus, type: QuestionType, unansweredBy: ID,
 *   pageSize: Int, pageToken: String
 * ): ListQuestionsPayload!
 * ```
 *
 * **Student-readable**: called with a student's own access token it returns the
 * tenant's catalogue, so a screen fetches its own question with nothing but the
 * session. **Options come embedded**; there is no second round trip per
 * question.
 *
 * This module reads and never writes.
 *
 * ## One function, because the selector stopped being a guess
 *
 * There were two functions — one per screen shape — and a heuristic under
 * them. `Question` had no slug, key or code and the ids are minted per
 * tenant, so nothing an app shipped could name a row: the selector was
 * `(category, order, type)`, with two fallbacks under it, and a comment
 * admitting that *"every selector is a heuristic"*. It was already wrong —
 * `onboarding` order 1 is an archived row, so the screens carried an offset
 * around it.
 *
 * `Question.key` is the answer (step-9): `keys: ["onboarding.helpers"]` asks for
 * the question the screen means. What is left here is one call with the filters
 * the server now applies — `status: ACTIVE` always, because an archived
 * question must not render and this app used to drop it after receiving it, in
 * four places.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import { CatalogueStatus, QuestionDisplay, QuestionType } from './gql/schema'
import type { GqlResult } from './types'

export { QuestionDisplay, QuestionType }

/** One predefined answer. Ordered, and carrying the emoji the arc renders. */
export interface CatalogueOption {
  /** The row's id — what `option_ids` names when the answer is recorded. */
  id: string
  label: string
  value: string
  emoji: string | null
  /** Illustration for an option drawn as a card. */
  imageUrl: string | null
  order: number
}

/** One question, reduced to what a screen renders and what it answers with. */
export interface CatalogueQuestion {
  id: string
  /** The stable name, when it has one. */
  key: string | null
  label: string
  category: string
  type: QuestionType
  /** Which widget draws it. Null ⇒ the screen's own default. */
  display: QuestionDisplay | null
  /** Only meaningful for MULTISELECT; the gateway refuses an answer above it. */
  maxSelections: number | null
  options: CatalogueOption[]
}

const LIST_QUESTIONS = gql(`query ListQuestions(
  $category: String
  $keys: [String!]
  $type: QuestionType
  $unansweredBy: ID
  $pageSize: Int
) {
  listQuestions(
    category: $category
    keys: $keys
    type: $type
    unansweredBy: $unansweredBy
    status: ACTIVE
    pageSize: $pageSize
  ) {
    questions {
      id key label category type display max_selections
      options { id label value emoji imageUrl order }
    }
  }
}`)

export interface QuestionsQuery {
  /** The stable keys of the questions this screen means. */
  keys?: string[]
  /** A whole category, for a screen that draws one OF many. */
  category?: string
  /** Only what this user has not answered. The server subtracts. */
  unansweredBy?: string
  type?: QuestionType
  pageSize?: number
}

/**
 * Fetch questions.
 *
 * An **empty array is data, not a failure**: an unseeded tenant is a state, and
 * the caller decides what to render. A transport or gateway failure still comes
 * back as `ok: false` so it can be logged and distinguished.
 *
 * Options arrive ordered from the server. They are re-sorted here for the same
 * reason the catalogue is: `order` on a scale IS the direction, and a scale
 * drawn backwards is worse than one drawn late.
 */
export async function bpQuestions(
  accessToken: string,
  query: QuestionsQuery,
): Promise<GqlResult<CatalogueQuestion[]>> {
  const result = await graphql(
    LIST_QUESTIONS,
    {
      ...(query.keys ? { keys: query.keys } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.unansweredBy ? { unansweredBy: query.unansweredBy } : {}),
      ...(query.type ? { type: query.type } : {}),
      pageSize: query.pageSize ?? 100,
    },
    { accessToken },
  )
  if (!result.ok) return result

  const questions = result.data.listQuestions.questions.map((q): CatalogueQuestion => {
    const options = q.options
      .map((o) => ({
        id: o.id,
        label: o.label,
        value: o.value,
        emoji: o.emoji ?? null,
        imageUrl: o.imageUrl ?? null,
        order: o.order,
      }))
      .sort((a, b) => a.order - b.order)

    return {
      id: q.id,
      key: q.key ?? null,
      label: q.label,
      category: q.category,
      type: q.type,
      display: q.display ?? null,
      maxSelections: q.max_selections > 0 ? q.max_selections : null,
      options,
    }
  })

  return { ok: true, data: questions }
}

/**
 * One question by key, or `null`.
 *
 * The shape every onboarding screen wants: it asks for exactly one, and a
 * tenant that has not been seeded has none. Two rows with the same key cannot
 * happen — it is unique among live questions — so taking the first is not a
 * tie-break, it is the only one.
 */
export async function bpQuestion(
  accessToken: string,
  key: string,
): Promise<GqlResult<CatalogueQuestion | null>> {
  const result = await bpQuestions(accessToken, { keys: [key], pageSize: 1 })
  if (!result.ok) return result
  return { ok: true, data: result.data[0] ?? null }
}
