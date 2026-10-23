/**
 * The art for a check-in tile: its blob geometry, its assets and its label
 * nudge.
 *
 * ## Why anything is left on this side
 *
 * The catalogue now owns the tile's *wording, emoji, colours, chips and the
 * three levels of its triad* — everything the gateway has a field for. What
 * stays here is **geometry**, which it does not: each tile's full-screen blob is
 * hand-placed per shape (`size`, `left`, `top` in device coordinates), its
 * uppercase display-font label overlaps that blob differently, and the SVGs are
 * build-time imports, not URLs a tenant could supply.
 *
 * This is the file `~/lib/student/emotions.ts`'s `EMOTIONS` table turned into
 * what it should always have been: art, keyed by the catalogue, with a fallback.
 *
 * ## A tile with no art still renders
 *
 * `fallbackArt` is the generic blob, and it is the point of this module's
 * shape: the previous code DROPPED any catalogue row it had no local entry for
 * (`checkin-catalogue.ts`'s "unknown rows are dropped, not rendered"), so a
 * sixteenth tile an admin added simply vanished. Now it is drawn with the
 * default blob in its own colour.
 */

import { studentAsset } from '~/assets/student-app'

/** The art key of a curated category: its identifier without the `checkin_` prefix. */
const TILE_PREFIX = 'checkin_'

/**
 * The one place the prefix is known.
 *
 * `mood_category.identifier` is unique per tenant on its own, and three of the
 * fifteen grid tiles (`happy`, `sad`, `angry`) share a name with a family of
 * the 92-mood wheel that every tenant is seeded with — with a different order
 * and different contents. They are therefore different rows, and the grid ones
 * carry the prefix. The stems of the art assets (`emotion-happy.svg`,
 * `happy-shape.svg`) and the `bp_mood_emotions` storage token are the unprefixed
 * key, which is why this function exists rather than the prefix being spread
 * around.
 */
export function tileArtKey(categoryIdentifier: string): string {
  return categoryIdentifier.startsWith(TILE_PREFIX)
    ? categoryIdentifier.slice(TILE_PREFIX.length)
    : categoryIdentifier
}

export interface TileArt {
  /** Full-screen background-blob geometry (device coords). */
  readonly shape: { readonly size: number; readonly left: number; readonly top: number }
  /** The blob asset, or `undefined` when this tile has none. */
  readonly shapeUrl: string | undefined
  /** The grid icon. */
  readonly iconUrl: string | undefined
  /** Label nudge baked into the prototype grid CSS (`mood-checkin.html:99-104`). */
  readonly labelStyle: React.CSSProperties | undefined
}

/**
 * Blob geometry per art key, verbatim from the prototype.
 *
 * Only `shape` lives here: the asset URLs are derived from the key, so adding a
 * tile means adding an SVG and a row, not three.
 */
const SHAPES: Record<string, { size: number; left: number; top: number }> = {
  curious: { size: 1454, left: -130, top: -460 },
  happy: { size: 1495, left: -151, top: -331 },
  excited: { size: 1495, left: -151, top: -331 },
  okay: { size: 1511, left: -159, top: -339 },
  grateful: { size: 1405, left: -106, top: -286 },
  hopeful: { size: 1441, left: -124, top: -304 },
  meh: { size: 1467, left: -137, top: -317 },
  neutral: { size: 1467, left: -137, top: -317 },
  idontknow: { size: 1555, left: -181, top: -361 },
  sad: { size: 1467, left: -137, top: -317 },
  tired: { size: 1495, left: -151, top: -331 },
  lonely: { size: 1441, left: -124, top: -304 },
  angry: { size: 1495, left: -151, top: -331 },
  stressed: { size: 1441, left: -124, top: -304 },
  anxious: { size: 1495, left: -151, top: -331 },
}

/**
 * The generic blob, for a tile this app has no art for.
 *
 * It uses `okay`'s geometry — the most neutral of the fifteen — and no shape
 * asset, so the screen draws the tile's own colour behind it.
 */
const FALLBACK_SHAPE = SHAPES.okay as { size: number; left: number; top: number }

/**
 * Per-key label nudges baked into the prototype grid CSS (`:99-104`): the
 * uppercase display-font labels overlap the blob art differently per shape.
 */
const LABEL_NUDGE: Record<string, React.CSSProperties> = {
  curious: { paddingBottom: 5 },
  angry: { paddingTop: 10 },
  sad: { paddingBottom: 5 },
  grateful: { paddingBottom: 5 },
  stressed: { paddingBottom: 40 },
  tired: { paddingTop: 10 },
}

/** The art for a tile, named by its CATEGORY identifier. */
export function tileArt(categoryIdentifier: string): TileArt {
  const key = tileArtKey(categoryIdentifier)
  const known = SHAPES[key]
  return {
    shape: known ?? FALLBACK_SHAPE,
    shapeUrl: known ? studentAsset(`${key}-shape.svg`) : undefined,
    iconUrl: known ? studentAsset(`emotion-${key}.svg`) : undefined,
    labelStyle: LABEL_NUDGE[key],
  }
}
