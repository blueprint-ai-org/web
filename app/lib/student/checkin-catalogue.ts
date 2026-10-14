/**
 * What the check-in screen gets from the gateway, already shaped.
 *
 * Client-safe on purpose: the loader does the server work (`~/lib/bp-ai/
 * moods.server`, `~/lib/bp-ai/questions.server`) and hands the rows here, and
 * the screen renders from the result. Nothing in this module touches the
 * gateway, so importing it from a component pulls no server code.
 *
 * ## What step-8 removed from it
 *
 * Five things, and they were all one idea: that the fifteen tiles were a LOCAL
 * list the catalogue was looked up *into*.
 *
 *   - `CHECKIN_MOOD_PREFIX` / `moodIdentifier` / `emotionKeyFor` — the
 *     `checkin_` prefix every mood identifier carried, because
 *     `mood.identifier` was unique per TENANT and six of the fifteen collided
 *     with the 92-mood wheel. The uniqueness scope is `(category, identifier)`
 *     now, so the moods need no prefix. (The tile's CATEGORY still has one, for
 *     a different reason — see `tile-art.ts`.)
 *   - `joinMoodCatalogue` / `labelByKey` — the fold that matched catalogue rows
 *     onto `EMOTION_KEYS` and **dropped any row it did not recognise**, so a
 *     sixteenth tile an admin added simply vanished.
 *
 * The grid is now the catalogue's fifteen curated categories, in its order,
 * each with its triad. What is left on this side is geometry (`tile-art.ts`)
 * and the three question rows below, which have their own catalogue.
 */

import type { CatalogueTile } from '~/lib/bp-ai/moods.server'
import type { CatalogueQuestion } from '~/lib/bp-ai/questions.server'

export type { CatalogueMood, CatalogueTile } from '~/lib/bp-ai/moods.server'

/**
 * One question row, as the loader serialises it.
 *
 * It IS the catalogue's shape now (step-9): the loader asks for the three
 * questions by key and hands them over. `maxSelections` is the reason this is
 * no longer a narrower projection — the reasons screen used to hard-code the
 * cap of three that the row already carries.
 */
export type CheckinQuestionRow = CatalogueQuestion

/** Everything the screen needs from the gateway. */
export interface CheckinCatalogue {
  /** The grid, in order. **Empty means the check-in cannot record anything.** */
  tiles: readonly CatalogueTile[]
  reasons: CheckinQuestionRow | null
  other: CheckinQuestionRow | null
  sleep: CheckinQuestionRow | null
}

/**
 * An empty catalogue — what the screen renders against when the gateway said
 * nothing.
 *
 * **This is no longer "render the baked fifteen".** It used to be: the screen
 * carried its own copy of the catalogue and drew the full picker whatever
 * happened, so a student could complete a check-in that recorded nothing. With
 * no tiles the screen says the check-in is unavailable, which is the same
 * treatment every other gateway-backed screen in this app gives a failure.
 */
export const EMPTY_CHECKIN_CATALOGUE: CheckinCatalogue = {
  tiles: [],
  reasons: null,
  other: null,
  sleep: null,
}
