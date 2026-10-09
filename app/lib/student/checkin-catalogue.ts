/**
 * The join between the BP AI catalogue and the check-in's local dictionary.
 *
 * Client-safe on purpose: the loader does the server work (`~/lib/bp-ai/
 * moods.server`, `~/lib/bp-ai/questions.server`) and hands the rows here, and
 * the screen renders from the result. Nothing in this module touches the
 * gateway, so importing it from a component pulls no server code.
 *
 * ## What the gateway owns, and what it does not
 *
 * The catalogue row supplies the **id** — without which a pick cannot be
 * recorded — and the **label**, on the same principle the other four migrated
 * screens follow: *the catalogue owns the wording, the code owns the drawing.*
 * An admin rewording "Meh" renames that tile.
 *
 * Everything else stays in `~/lib/student/emotions`, and not for want of a
 * field to put it in:
 *
 *  - **The list of fifteen is local.** Each tile carries hand-placed blob art,
 *    per-key label padding nudges and its own full-screen shape geometry. A
 *    sixteenth row in the catalogue has no art and cannot be drawn, so the grid
 *    is driven by `EMOTION_GRID_ORDER` and the catalogue is looked up *into* it.
 *  - **The colour is local.** `Mood.color` exists, but the journal derives
 *    runtime shades from the hex by arithmetic and `gradDark` has no gateway
 *    field at all. A tenant that recoloured half the pair would produce
 *    gradients nobody designed. Per the 2026-07-19 decision the JS table is
 *    authoritative for the palette; `Mood.color` is seeded *from* it.
 *  - **The three level labels, the three faces and the reason chips are local.**
 *    `Mood` has no field for any of them.
 *
 * ## Unknown rows are dropped, not rendered
 *
 * A catalogue row whose identifier is not one of the fifteen (every one of the
 * 92 auto-seeded wheel moods, for instance) has no art and is skipped. A tile
 * with no catalogue row still renders — it just cannot be recorded, which is
 * exactly what happens when the gateway is unreachable and the screen falls
 * back to baked copy.
 */

import { EMOTION_KEYS, EMOTIONS, type EmotionKey } from './emotions'

/**
 * `Mood.identifier` is unique **per tenant**, not per category, and six of the
 * fifteen (`excited`, `hopeful`, `tired`, `lonely`, `stressed`, `anxious`)
 * collide with the 92 moods every tenant is auto-seeded with. Hence the prefix.
 * This is the only mapping between an `EmotionKey` and its catalogue row, and
 * `scripts/bp-ai-seed-moods.ts` writes what it names.
 */
export const CHECKIN_MOOD_PREFIX = 'checkin_'

/** The catalogue identifier for an emotion. */
export const moodIdentifier = (key: EmotionKey) => `${CHECKIN_MOOD_PREFIX}${key}`

/** The `EmotionKey` a catalogue identifier names, or `null` if it names none. */
export function emotionKeyFor(identifier: string): EmotionKey | null {
  if (!identifier.startsWith(CHECKIN_MOOD_PREFIX)) return null
  const key = identifier.slice(CHECKIN_MOOD_PREFIX.length) as EmotionKey
  return EMOTION_KEYS.includes(key) ? key : null
}

/** One catalogue row, as the loader serialises it. */
export interface CheckinMoodRow {
  id: string
  identifier: string
  label: string
}

/** One question row, as the loader serialises it. */
export interface CheckinQuestionRow {
  id: string
  label: string
  options: ReadonlyArray<{ id: string; label: string; value: string; emoji: string | null; order: number }>
}

/** Everything the screen needs from the gateway, already joined. */
export interface CheckinCatalogue {
  /** `EmotionKey` → catalogue row id. Absent for any tile with no row. */
  moodIdByKey: Partial<Record<EmotionKey, string>>
  /** `EmotionKey` → the catalogue's wording, where it differs from nothing. */
  labelByKey: Partial<Record<EmotionKey, string>>
  reasons: CheckinQuestionRow | null
  other: CheckinQuestionRow | null
  sleep: CheckinQuestionRow | null
}

/** An empty catalogue — what the screen renders against when the gateway said nothing. */
export const EMPTY_CHECKIN_CATALOGUE: CheckinCatalogue = {
  moodIdByKey: {},
  labelByKey: {},
  reasons: null,
  other: null,
  sleep: null,
}

/**
 * Fold catalogue rows into a lookup by `EmotionKey`.
 *
 * Rows that name no known emotion are dropped (see the module header). A row
 * whose label matches the local name contributes no override, so
 * {@link CheckinCatalogue.labelByKey} holds only genuine differences and a
 * reader can see at a glance what the tenant has reworded.
 */
export function joinMoodCatalogue(
  rows: readonly CheckinMoodRow[],
): Pick<CheckinCatalogue, 'moodIdByKey' | 'labelByKey'> {
  const moodIdByKey: Partial<Record<EmotionKey, string>> = {}
  const labelByKey: Partial<Record<EmotionKey, string>> = {}

  for (const row of rows) {
    const key = emotionKeyFor(row.identifier)
    if (!key) continue
    moodIdByKey[key] = row.id
    if (row.label && row.label !== EMOTIONS[key].name) labelByKey[key] = row.label
  }

  return { moodIdByKey, labelByKey }
}

/** The tile's wording — the tenant's, or the one this app ships. */
export function emotionLabel(catalogue: CheckinCatalogue, key: EmotionKey): string {
  return catalogue.labelByKey[key] ?? EMOTIONS[key].name
}
