/**
 * The daily check-in's mood catalogue and its writes.
 *
 * ```graphql
 * listMoods(category: String, curatedOnly: Boolean): ListMoodsResponse!
 * createMoodHistory(input: CreateMoodHistoryInput!): MoodHistory!
 * ```
 *
 * Both are `USER_OR_API`, so **the student's own token does the whole
 * check-in**. Authoring the catalogue is a different matter (`createMood` is
 * ADMIN) and never happens here — nor in a script any more: the catalogue is
 * seeded by `manager.CreatorService/CreateMigration`.
 *
 * ## What step-8 changed, and why this file is half its old size
 *
 * The four "gateway behaviours" this module used to document and work around
 * are gone, because each was a backend bug:
 *
 *  1. `cover`, `video` and `category` were non-null on read while the seeded
 *     rows had none, so selecting any of them failed the query **for the whole
 *     tenant**. They are nullable now and the selection below asks for the
 *     category, which is what groups the grid.
 *  2. `listMoods(category:)` took a UUID and not an identifier, so this module
 *     resolved the identifier first — a second round trip. `curatedOnly` asks
 *     the real question in ONE call: every mood of every curated category.
 *  3. The intensity was clamped here because `0..10` was enforced only by a
 *     Mongo validator. **The client no longer sends an intensity at all**: the
 *     server derives it from the mood's triad `level`, so the meaning of "a bit
 *     sad" stopped living in a browser.
 *  4. `createMoodHistory` echoed `note: ""` while storing the note. It echoes
 *     the note now, so the write response is evidence.
 *
 * Sibling of `questions.server.ts`, and the same three-layer contract: this
 * module reads and writes, returns a `GqlResult` so a failure is a value rather
 * than a throw, and treats an unseeded tenant as a *state* — empty data, `ok:
 * true` — rather than an error a student mid-check-in has to look at.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { GqlResult } from './types'

/**
 * One mood of a triad, as the check-in renders it.
 *
 * Everything here comes from the catalogue. Until step-8 only the id and the
 * label did: the emoji, the colours, the three level labels and the chips lived
 * in `~/lib/student/emotions.ts`, which also SEEDED this collection from
 * itself — the app was both the source and the consumer.
 */
export interface CatalogueMood {
  /** The row's id — what `MoodEntryInput.id` names when the check-in is written. */
  id: string
  identifier: string
  label: string
  /** 1, 2 or 3. The server derives the stored intensity from it. */
  level: number
  emoji: string | null
  color: string | null
  secondaryColor: string | null
  chips: readonly string[]
}

/** One grid tile: a curated category and its triad, low → high. */
export interface CatalogueTile {
  categoryId: string
  /** `checkin_<key>` — the join to the tile's art. See `lib/student/tile-art`. */
  identifier: string
  label: string
  /** Place in the grid, 1..15. */
  order: number
  /** Exactly three in a well-formed catalogue, ordered by level. */
  moods: readonly CatalogueMood[]
}

/** One picked mood. No intensity: the server derives it from the level. */
export interface MoodPick {
  moodId: string
}

/**
 * The whole check-in in one request.
 *
 * `category { … }` is selected because it is what groups the grid — and
 * selecting it was impossible until step-8 made the field nullable.
 */
const LIST_CHECKIN_MOODS = gql(`query ListCheckinMoods {
  listMoods(curatedOnly: true) {
    moods {
      id
      identifier
      label
      level
      emoji
      color
      secondaryColor
      chips
      order
      category { id identifier label order }
    }
  }
}`)

const SUBMIT_CHECKIN = gql(`mutation SubmitCheckIn($input: SubmitCheckInInput!) {
  submitCheckIn(input: $input) {
    moodHistory { id note }
    answers { id questionId }
  }
}`)

/**
 * The fifteen tiles, in grid order, each with its triad.
 *
 * Returns an **empty array** rather than an error when the tenant has no
 * curated categories — an unseeded tenant is a state. The screen renders its
 * "check-in unavailable" copy, which is the deliberate change from the baked
 * fallback: a student used to be shown fifteen tiles whose picks could not be
 * recorded.
 *
 * A tile with no complete triad is still returned. The detail screen clamps to
 * whatever stops exist, because a half-seeded category is a tenant's problem to
 * fix and not a reason to hide the rest of the grid.
 */
export async function bpCheckinCatalogue(accessToken: string): Promise<GqlResult<CatalogueTile[]>> {
  const result = await graphql(LIST_CHECKIN_MOODS, {}, { accessToken })
  if (!result.ok) return result

  const byCategory = new Map<string, CatalogueTile>()
  for (const m of result.data.listMoods.moods) {
    const category = m.category
    // A curated mood with no category cannot be a grid tile; and `level` is
    // what the arc slider is, so a mood without one has no stop to sit on.
    if (!category || m.level === null || m.level === undefined) continue

    let tile = byCategory.get(category.id)
    if (!tile) {
      tile = {
        categoryId: category.id,
        identifier: category.identifier,
        label: category.label,
        order: category.order,
        moods: [],
      }
      byCategory.set(category.id, tile)
    }
    ;(tile.moods as CatalogueMood[]).push({
      id: m.id,
      identifier: m.identifier,
      label: m.label,
      level: m.level,
      emoji: m.emoji ?? null,
      color: m.color,
      secondaryColor: m.secondaryColor ?? null,
      chips: m.chips,
    })
  }

  const tiles = [...byCategory.values()]
  // The gateway already orders by (category.order, level) — this re-sort is
  // the cheap guarantee that the grid and the arc are right even if a tenant
  // ends up with two categories sharing an order.
  tiles.sort((a, b) => a.order - b.order || a.identifier.localeCompare(b.identifier))
  for (const tile of tiles) {
    ;(tile.moods as CatalogueMood[]).sort((a, b) => a.level - b.level)
  }
  return { ok: true, data: tiles }
}

/** One answer written with the check-in that carried it. */
export interface CheckinAnswer {
  questionId: string
  optionIds?: string[]
  /** Free text, for the OPEN companion. */
  answer?: string
}

/**
 * Record one check-in: the moods AND the answers beside them, in ONE request.
 *
 * One `MoodHistory` row, not one per mood — a check-in is a single moment, and
 * splitting it would make three moments out of one and break `moodCounts` and
 * the metrics engine's reading of it.
 *
 * **No intensity travels.** The picked mood IS the intensity: the server maps
 * its triad level to 2 / 5 / 8.
 *
 * ## It used to be up to seven requests, and it could half-save
 *
 * The flow wrote `createMoodHistory` and then one answer per question, each of
 * which was itself a list plus a create-or-update. Every one could fail on its
 * own, so the response was a per-part `{moods, reasons, other, sleep}` and a
 * check-in could end up with its moods stored and its reasons not — which reads
 * later as a student who felt something for no reason at all.
 *
 * `submitCheckIn` is atomic: all of it or none of it. The answers also come back
 * carrying the mood history's id, so they can be read beside the moods instead
 * of matched up by timestamp.
 */
export async function bpSubmitCheckIn(
  accessToken: string,
  userId: string,
  picks: readonly MoodPick[],
  answers: readonly CheckinAnswer[] = [],
  extra: {
    note?: string
    /**
     * The chosen option of `checkin.sleep`. The server turns it into a
     * `sleep_profile` with that quality in the same write (step-29) — it is
     * NOT also an answer, or the night would be stored twice.
     */
    sleepOptionId?: string
  } = {},
): Promise<GqlResult<{ id: string; answers: number } | null>> {
  // An empty check-in is a UI bug, refused here rather than sent: the gateway
  // refuses it too, and there is nothing to report to the student either way.
  if (picks.length === 0) return { ok: true, data: null }

  const result = await graphql(
    SUBMIT_CHECKIN,
    {
      input: {
        user: userId,
        moods: picks.map((p) => ({ id: p.moodId })),
        ...(extra.note === undefined ? {} : { note: extra.note }),
        ...(extra.sleepOptionId ? { sleepOptionId: extra.sleepOptionId } : {}),
        answers: answers.map((a) => ({
          questionId: a.questionId,
          ...(a.optionIds ? { optionIds: a.optionIds } : {}),
          ...(a.answer === undefined ? {} : { answer: a.answer }),
        })),
      },
    },
    { accessToken },
  )
  if (!result.ok) return result

  const payload = result.data.submitCheckIn
  const id = payload.moodHistory.id
  return { ok: true, data: id ? { id, answers: payload.answers.length } : null }
}
