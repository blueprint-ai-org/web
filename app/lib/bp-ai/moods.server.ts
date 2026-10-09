/**
 * The daily check-in's mood catalogue and its writes.
 *
 * ```graphql
 * listMoodCategories: ListMoodCategoriesResponse!
 * listMoods(category: String): ListMoodsResponse!
 * createMoodHistory(input: CreateMoodHistoryInput!): MoodHistory!
 * ```
 *
 * All three are `USER_OR_API`, so **the student's own token does the whole
 * check-in** — measured 2026-09-29. Authoring the catalogue is a different
 * matter (`createMood` is `USER` + `ADMIN`, so an API key cannot do it and a
 * student is refused); that lives in `scripts/bp-ai-seed-moods.ts` and never
 * here.
 *
 * Sibling of `questions.server.ts`, and the same three-layer contract: this
 * module reads and writes, returns a `GqlResult` so a failure is a value rather
 * than a throw, and treats an unseeded tenant as a *state* — empty data, `ok:
 * true` — rather than an error a student mid-check-in has to look at.
 *
 * ## Four gateway behaviours encoded here
 *
 * Every one of them is a silent `INTERNAL_ERROR` rather than a validation
 * failure, so none is discoverable from the schema alone.
 *
 *  1. **Never select `cover`, `video` or `category` from `listMoods`.** All
 *     three are non-null on read and unset on the 92 auto-seeded wheel moods, so
 *     selecting any one of them fails the query **for the whole tenant**, not
 *     just for the offending row. {@link LIST_MOODS} is deliberately narrow.
 *  2. **`listMoods(category:)` filters by the category's UUID, not its
 *     identifier**, despite `Mood.category` being an object on read. Hence
 *     {@link categoryId} resolving the identifier first.
 *  3. **`MoodEntryInput.intensity` is `0..10`.** `-1` and `11` are refused.
 *     {@link clampIntensity} keeps a UI bug from becoming a failed write.
 *  4. **`createMoodHistory` echoes `note: ""` while storing the note.** The
 *     write response is not evidence; read back with `getMoodHistory` if you
 *     need to see it. This module returns the id and does not pretend otherwise.
 */

import { graphql } from './client.server'
import type { GqlResult } from './types'

/**
 * The category holding the check-in's fifteen, seeded by
 * `scripts/bp-ai-seed-moods.ts`. Its identifier is effectively permanent —
 * `updateMoodCategory` refuses to rename one while any mood references it.
 */
export const CHECKIN_MOOD_CATEGORY = 'daily_checkin'

/** One mood from the catalogue, reduced to what the check-in renders. */
export interface CatalogueMood {
  /** The row's id — what `MoodEntryInput.id` names when the check-in is written. */
  id: string
  /** `checkin_<EmotionKey>` — the join back to `~/lib/student/emotions`. */
  identifier: string
  label: string
  color: string | null
  order: number
}

/** One picked emotion and where its arc sat. */
export interface MoodEntry {
  moodId: string
  /** `0..10`; the check-in's three stops are 2 / 5 / 8. */
  intensity: number
}

const LIST_CATEGORIES = `query ListMoodCategories {
  listMoodCategories { categories { id identifier } }
}`

/**
 * Narrow on purpose — see behaviour 1 in the module header. `cover`, `video`
 * and `category` are each enough to fail this query for every row in the
 * tenant, and the check-in needs none of them: the art is local, keyed by
 * `identifier`.
 */
const LIST_MOODS = `query ListCheckinMoods($category: String) {
  listMoods(category: $category) {
    moods { id identifier label order color text_color description }
  }
}`

const CREATE_MOOD_HISTORY = `mutation CreateMoodHistory($input: CreateMoodHistoryInput!) {
  createMoodHistory(input: $input) { id }
}`

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** `0..10`, the measured range. Rounds, because `intensity` is `Int!`. */
export function clampIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(10, Math.max(0, Math.round(value)))
}

function readMood(value: unknown, index: number): CatalogueMood | null {
  if (value === null || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = str(row.id)
  const identifier = str(row.identifier)
  const label = str(row.label)
  // A row with no id cannot be named in a `MoodEntryInput`, so it is not a
  // mood the check-in can offer — dropping it beats rendering a tile whose
  // selection silently fails to record.
  if (!id || !identifier || !label) return null
  return {
    id,
    identifier,
    label,
    color: str(row.color),
    // A row with no `order` sorts where the gateway put it rather than at 0,
    // which would jump it to the front of the picker.
    order: num(row.order) ?? index + 1,
  }
}

/**
 * The check-in category's UUID.
 *
 * `null` data means the tenant has no such category — an unseeded tenant, not a
 * failure. A transport or gateway error still comes back as `ok: false`.
 */
async function categoryId(accessToken: string): Promise<GqlResult<string | null>> {
  const result = await graphql<Record<string, unknown>>(LIST_CATEGORIES, {}, { accessToken })
  if (!result.ok) return result

  const payload = result.data.listMoodCategories
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).categories)
      ? ((payload as Record<string, unknown>).categories as unknown[])
      : []

  for (const row of rows) {
    if (row === null || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    if (str(record.identifier) === CHECKIN_MOOD_CATEGORY) {
      const id = str(record.id)
      if (id) return { ok: true, data: id }
    }
  }
  return { ok: true, data: null }
}

/**
 * The fifteen the check-in offers, in picker order.
 *
 * Returns an **empty array** rather than an error when the tenant has no
 * `daily_checkin` category or no moods in it. The screen falls back to its baked
 * `EMOTIONS` table either way, and an unseeded tenant must not be the thing a
 * student sees.
 */
export async function bpMoodCatalogue(accessToken: string): Promise<GqlResult<CatalogueMood[]>> {
  const category = await categoryId(accessToken)
  if (!category.ok) return category
  if (!category.data) return { ok: true, data: [] }

  const result = await graphql<Record<string, unknown>>(LIST_MOODS, { category: category.data }, { accessToken })
  if (!result.ok) return result

  const payload = result.data.listMoods
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).moods)
      ? ((payload as Record<string, unknown>).moods as unknown[])
      : []

  const moods = rows.map(readMood).filter((m): m is CatalogueMood => m !== null)
  moods.sort((a, b) => a.order - b.order)
  return { ok: true, data: moods }
}

/**
 * Record one check-in: every picked emotion and its intensity, in **one**
 * `MoodHistory` row.
 *
 * One row, not one per emotion — `CreateMoodHistoryInput.moods` is a list, and a
 * check-in is a single moment. Splitting it would make three separate moments
 * out of one and break `moodCounts` and the metrics engine's reading of it.
 *
 * An empty `entries` is refused locally rather than sent: a check-in with no
 * emotion is a UI bug, and the gateway's answer to it is an `INTERNAL_ERROR`
 * nobody could act on.
 */
export async function bpRecordMoodCheckin(
  accessToken: string,
  userId: string,
  entries: readonly MoodEntry[],
  note?: string,
): Promise<GqlResult<{ id: string } | null>> {
  if (entries.length === 0) return { ok: true, data: null }

  const result = await graphql<Record<string, unknown>>(
    CREATE_MOOD_HISTORY,
    {
      input: {
        user: userId,
        moods: entries.map((e) => ({ id: e.moodId, intensity: clampIntensity(e.intensity) })),
        ...(note === undefined ? {} : { note }),
      },
    },
    { accessToken },
  )
  if (!result.ok) return result

  const payload = result.data.createMoodHistory
  const id =
    payload !== null && typeof payload === 'object' ? str((payload as Record<string, unknown>).id) : null
  return { ok: true, data: id ? { id } : null }
}
