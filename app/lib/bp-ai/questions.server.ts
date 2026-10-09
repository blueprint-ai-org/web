/**
 * Onboarding questions, read from the tenant's BP AI question catalogue.
 *
 * ```graphql
 * listQuestions(category: String, pageSize: Int, pageToken: String): ListQuestionsPayload!
 * ```
 *
 * **Student-readable, measured 2026-09-24.** Called with a student's own access
 * token it returns the same ten questions an owner admin sees — not `FORBIDDEN`
 * — so an onboarding screen can fetch its own question with nothing but the
 * session. **Options come embedded**; there is no second round trip per
 * question, and a screen that fetched them separately would be inventing a call
 * the API deliberately avoids.
 *
 * This module reads and never writes. Answering a question is a different
 * operation on a different screen, and no onboarding step submits one yet.
 *
 * ## Which row is "this screen's question"
 *
 * `Question` is `{ id, label, category, type, max_selections, order, status,
 * options }` — there is **no slug, key or code**. The id is minted per tenant,
 * so nothing an app ships can name a row directly, and every selector is a
 * heuristic. The one used here is `category` + `order`, because:
 *
 *  - **`order` is the question's place in its category**, and an onboarding
 *    screen *is* a fixed place in a sequence. An admin who reorders the
 *    category has reordered the questions, and the screens following suit is
 *    the behaviour that matches the field's meaning.
 *  - **Keying on `label` would defeat the point.** Rewording the question is
 *    the single most likely reason anyone opens this catalogue; a screen that
 *    stopped finding its row the moment somebody improved the wording would be
 *    worse than the baked copy it replaced.
 *
 * A missing `order` falls back to the first active question of the expected
 * type, and that failing, the caller's baked spec. Three layers, because a
 * student halfway through onboarding is the worst possible audience for an
 * error page.
 */

import { graphql } from './client.server'
import type { GqlResult } from './types'

/** One predefined answer. Ordered, and carrying the emoji the arc renders. */
export interface CatalogueOption {
  /** The row's id — what `option_ids` names when the answer is recorded. */
  id: string
  label: string
  value: string
  emoji: string | null
  order: number
}

/** One question and its answers, reduced to what a screen renders. */
export interface CatalogueQuestion {
  id: string
  label: string
  options: CatalogueOption[]
}

/**
 * The selection set is the whole question, because the whole question is what
 * gets rendered — label on the heading, options on the stops. `max_selections`
 * is omitted: it is *"only meaningful for MULTISELECT"* and nothing here is.
 */
const LIST_QUESTIONS = `query ListOnboardingQuestions($category: String!, $pageSize: Int) {
  listQuestions(category: $category, pageSize: $pageSize) {
    questions {
      id label category type order status
      options { id label value emoji order }
    }
  }
}`

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readOption(value: unknown, index: number): CatalogueOption | null {
  if (value === null || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = str(row.id)
  const label = str(row.label)
  const optionValue = str(row.value)
  // An option with no id cannot be submitted as an answer, so it is not an
  // option — dropping it is better than rendering a stop that silently fails
  // to record.
  if (!id || !label || !optionValue) return null
  return {
    id,
    label,
    value: optionValue,
    emoji: str(row.emoji),
    // A row with no `order` sorts where the gateway put it rather than at 0,
    // which would silently jump it to the front of a scale.
    order: num(row.order) ?? index + 1,
  }
}

interface RawQuestion {
  id: string
  label: string
  type: string | null
  order: number | null
  status: string | null
  options: CatalogueOption[]
}

function readQuestion(value: unknown): RawQuestion | null {
  if (value === null || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = str(row.id)
  const label = str(row.label)
  if (!id || !label) return null
  const options = Array.isArray(row.options)
    ? row.options.map(readOption).filter((o): o is CatalogueOption => o !== null)
    : []
  options.sort((a, b) => a.order - b.order)
  return { id, label, type: str(row.type), order: num(row.order), status: str(row.status), options }
}

export interface QuestionSelector {
  category: string
  /** Its place in the category — see the module header on why not the label. */
  order: number
  /** Guards the fallback: only a question of this type can stand in. */
  type: string
}

/**
 * Fetch one onboarding question.
 *
 * Returns `null` **data** rather than an error when the catalogue simply has no
 * such row — an unseeded tenant is a state, not a failure, and the caller
 * renders its baked copy either way. A transport or gateway failure still comes
 * back as `ok: false`, so it can be logged and distinguished.
 */
export async function bpOnboardingQuestion(
  accessToken: string,
  selector: QuestionSelector,
): Promise<GqlResult<CatalogueQuestion | null>> {
  const result = await graphql<Record<string, unknown>>(
    LIST_QUESTIONS,
    { category: selector.category, pageSize: 100 },
    { accessToken },
  )
  if (!result.ok) return result

  const payload = result.data.listQuestions
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).questions)
      ? ((payload as Record<string, unknown>).questions as unknown[])
      : []

  const questions = rows.map(readQuestion).filter((q): q is RawQuestion => q !== null)
  // An archived question must not render. `status` is a free string; anything
  // that is not explicitly active is treated as not active, so a value nobody
  // has seen yet fails closed.
  const active = questions.filter((q) => (q.status ?? 'active') === 'active')

  const match =
    active.find((q) => q.order === selector.order && q.type === selector.type) ??
    active.find((q) => q.type === selector.type) ??
    null

  return { ok: true, data: match ? { id: match.id, label: match.label, options: match.options } : null }
}

/** A question with everything a screen needs to *answer* it, not just draw it. */
export interface AnswerableQuestion extends CatalogueQuestion {
  type: 'OPEN' | 'SELECT_ONE' | 'MULTISELECT'
  /** Only meaningful for `MULTISELECT`; the gateway refuses an answer above it. */
  maxSelections: number | null
}

const LIST_ANSWERABLE = `query ListAnswerableQuestions($category: String!, $pageSize: Int) {
  listQuestions(category: $category, pageSize: $pageSize) {
    questions {
      id label category type order status max_selections
      options { id label value emoji order }
    }
  }
}`

const ANSWERABLE_TYPES = new Set(['OPEN', 'SELECT_ONE', 'MULTISELECT'])

/**
 * Every active question in `category`, in catalogue order, with its type,
 * options and selection cap.
 *
 * For screens that draw *from* a category rather than keying one row by
 * `(category, order)` — all-about-you asks one of ~70. Fails closed the same way
 * as {@link bpOnboardingQuestion}: anything not explicitly `active` is dropped,
 * and so is a pick question whose options did not survive {@link readOption}
 * (it could not be answered) or a type this module does not know.
 */
export async function bpQuestionsInCategory(
  accessToken: string,
  category: string,
): Promise<GqlResult<AnswerableQuestion[]>> {
  const result = await graphql<Record<string, unknown>>(
    LIST_ANSWERABLE,
    { category, pageSize: 500 },
    { accessToken },
  )
  if (!result.ok) return result

  const payload = result.data.listQuestions
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).questions)
      ? ((payload as Record<string, unknown>).questions as unknown[])
      : []

  const questions: (AnswerableQuestion & { order: number })[] = []
  rows.forEach((value, index) => {
    const q = readQuestion(value)
    if (!q || (q.status ?? 'active') !== 'active' || !q.type || !ANSWERABLE_TYPES.has(q.type)) return
    if (q.type !== 'OPEN' && q.options.length === 0) return
    const raw = (value as Record<string, unknown>).max_selections
    questions.push({
      id: q.id,
      label: q.label,
      options: q.options,
      type: q.type as AnswerableQuestion['type'],
      maxSelections: typeof raw === 'number' && raw > 0 ? raw : null,
      order: q.order ?? index + 1,
    })
  })
  questions.sort((a, b) => a.order - b.order)
  return { ok: true, data: questions.map(({ order: _order, ...q }) => q) }
}
