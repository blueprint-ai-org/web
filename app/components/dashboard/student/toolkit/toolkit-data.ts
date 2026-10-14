/**
 * Toolkit-cluster presentation constants — ported from `my-toolkit.html`,
 * `category.html`, and `toolkit-video.html`.
 *
 * What is left here is layout and copy. The catalogue that lived here — six
 * video ids, five categories of four hand-titled videos, two playable mp4s and
 * a fixed "1 spark" per tile — is the tenant's `Lesson`s and
 * `ContentCategory`s now (`~/lib/bp-ai/content.server`).
 */

import type { LessonTile } from '~/lib/bp-ai/content.server'

// ── Filter tabs (my-toolkit.html:674-679 tabMap) ──────────────────────────────

export type ToolkitTab = 'recommended' | 'browse' | 'doitagain' | 'saved'

export interface FilterPill {
  readonly tab: ToolkitTab
  readonly label: string
}

/** `my-toolkit.html:413-416` filter pills, in render order. */
export const FILTER_PILLS: readonly FilterPill[] = [
  { tab: 'recommended', label: 'Recommended' },
  { tab: 'browse', label: 'Browse' },
  { tab: 'doitagain', label: 'Do it again' },
  { tab: 'saved', label: 'Saved' },
]

export function isToolkitTab(tab: string): tab is ToolkitTab {
  return FILTER_PILLS.some((p) => p.tab === tab)
}

// ── A tile as rendered in a tab panel ────────────────────────────────────────

export interface TileSpec {
  /** The lesson it opens and hearts. */
  readonly lessonId: string
  /** Tile background behind the (cover-fit) art. */
  readonly bg: string
  /** The cover image, or null: drawn as the bare background. */
  readonly cover: string | null
  readonly title: string
  readonly duration: string
  /** What completing it pays; null hides the figure. */
  readonly sparks: number | null
  /** Optional soft gradient overlay (rec-pair / featured tiles). */
  readonly gradient?: string
}

/** Behind every cover; what shows while it loads, or when it has none. */
export const TILE_BG = '#1a1a22'
export const GRAD_SOFT = 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.20) 100%)'
export const GRAD_FEATURED = 'linear-gradient(182deg,rgba(0,0,0,0) 44%,rgba(0,0,0,0.5) 84%)'

/** Default thumbnail when the lesson has no cover (`toolkit-video.html:292`). */
export const VIDEO_DEFAULT_THUMB = 'video-thumbnail.jpg'

// ── Copy (hardcoded fallbacks) ────────────────────────────────────────────────

export const TOOLKIT_COPY = {
  title: 'My toolkit',
  exploreTitle: 'Explore',
  desc: 'Content for how you feel.',
  exploreBtn: 'More',
  savedEmpty: 'Save your favourite exercises!',
} as const

/** A lesson as a tile. */
export function lessonTileSpec(lesson: LessonTile, gradient?: string): TileSpec {
  return {
    lessonId: lesson.id,
    bg: TILE_BG,
    cover: lesson.cover,
    title: lesson.title,
    duration: lesson.duration,
    sparks: lesson.sparks,
    ...(gradient ? { gradient } : {}),
  }
}
