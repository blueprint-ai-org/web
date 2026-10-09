/**
 * Toolkit-cluster data model — ported from `my-toolkit.html`, `category.html`,
 * and `toolkit-video.html`'s inline JS. Pure constants: asset *filenames* (the
 * migrated kebab-case base names) rather than resolved URLs, so the screen
 * components resolve them through `studentAsset` at render (matching the
 * `journal-data` / `JournalHome` split).
 *
 * Copy-source note: my-toolkit is one of the 10 CMS pages, but Phase 8's
 * precedent (journal, also a CMS page) inlines the prototype's *hardcoded
 * fallback text* — what actually rendered offline — with `file:line` citations,
 * rather than wiring `copy.ts`. This module follows that precedent 1:1.
 */

// ── Toolkit video tiles (my-toolkit.html:692-699 VIDEOS map) ──────────────────

export type ToolkitVideoId = 'v1' | 'v2' | 'v3' | 'vwatch' | 'grades-v1' | 'grades-v2'

export interface ToolkitVideo {
  /** Tile background behind the (cover-fit) art. */
  readonly bg: string
  /** Migrated asset filename (resolved via `studentAsset`). */
  readonly img: string
  readonly title: string
}

/** `my-toolkit.html:692-699` — the six known tile ids and their art/titles. */
export const VIDEOS: Record<ToolkitVideoId, ToolkitVideo> = {
  v1: { bg: '#0d0d0d', img: 'youve-done-hard-things-cover.png', title: "You've Done Hard Things" },
  v2: { bg: '#030d1f', img: 'calming-breath-cover.png', title: 'Calming Breath' },
  v3: { bg: '#1a1a22', img: 'video-thumbnail.jpg', title: 'Building Resilience Every Day' },
  vwatch: { bg: '#1a1a1a', img: 'carousel-01.svg', title: 'Karl Anthony Tawns Overcoming Challenges' },
  'grades-v1': { bg: '#addbf2', img: 'cloud-grades-1.svg', title: 'The emotional side of grades' },
  'grades-v2': { bg: '#d6c0fe', img: 'mithosis.svg', title: 'How to catch up after missing school' },
}

export function isToolkitVideoId(id: string): id is ToolkitVideoId {
  return id in VIDEOS
}

/** Default hearted set (`my-toolkit.html:702`) — the min-1 seed. */
export const SAVED_DEFAULT: readonly string[] = ['v2']

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
  /** Heart id (`data-vid`); toggles `bp_saved`. */
  readonly vid: ToolkitVideoId
  readonly bg: string
  readonly img: string
  readonly title: string
  readonly duration: string
  readonly sparks: number
  /** `?video=` slug this tile opens (my-toolkit tiles all deep-link the player). */
  readonly videoSlug: string
  /** Optional soft gradient overlay (rec-pair / featured tiles). */
  readonly gradient?: string
}

const GRAD_SOFT = 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.20) 100%)'
const GRAD_FEATURED = 'linear-gradient(182deg,rgba(0,0,0,0) 44%,rgba(0,0,0,0.5) 84%)'

/** Simple-view featured tile (`my-toolkit.html:386-399`). */
export const FEATURED_TILE: TileSpec = {
  vid: 'v2',
  bg: '#030d1f',
  img: 'calming-breath-cover.png',
  title: 'Calming Breath',
  duration: '1:04',
  sparks: 1,
  videoSlug: 'calming-breath',
  gradient: GRAD_FEATURED,
}

/** RECOMMENDED hero (`my-toolkit.html:422-435`). */
export const REC_HERO: TileSpec = {
  vid: 'v1',
  bg: '#0d0d0d',
  img: 'youve-done-hard-things-cover.png',
  title: "You've Done Hard Things",
  duration: '1:16',
  sparks: 1,
  videoSlug: 'youve-done-hard-things',
}

/** RECOMMENDED pair (`my-toolkit.html:438-470`). */
export const REC_PAIR: readonly TileSpec[] = [
  {
    vid: 'v2',
    bg: '#030d1f',
    img: 'calming-breath-cover.png',
    title: 'Calming Breath',
    duration: '1:04',
    sparks: 1,
    videoSlug: 'calming-breath',
    gradient: GRAD_SOFT,
  },
  {
    vid: 'v3',
    bg: '#1a1a22',
    img: 'video-thumbnail.jpg',
    title: 'Building Resilience Every Day',
    duration: '1:07',
    sparks: 1,
    videoSlug: 'calming-breath',
    gradient: GRAD_SOFT,
  },
]

/** DO IT AGAIN row (`my-toolkit.html:475-506`). */
export const DO_IT_AGAIN: readonly TileSpec[] = [
  {
    vid: 'vwatch',
    bg: '#1a1a1a',
    img: 'carousel-01.svg',
    title: 'Karl Anthony Tawns Overcoming Challenges',
    duration: '1:07',
    sparks: 1,
    videoSlug: 'calming-breath',
  },
  {
    vid: 'v2',
    bg: '#030d1f',
    img: 'calming-breath-cover.png',
    title: 'Calming Breath',
    duration: '1:04',
    sparks: 1,
    videoSlug: 'calming-breath',
    gradient: GRAD_SOFT,
  },
]

// ── Browse categories (my-toolkit.html:518-551) ───────────────────────────────

export interface BrowseCategory {
  readonly slug: string
  readonly emoji: string
  readonly label: string
  readonly bg: string
}

/** `my-toolkit.html:518-551` — five category circles across two rows. */
export const BROWSE_CATEGORIES: readonly BrowseCategory[] = [
  { slug: 'calm-down', emoji: '😮‍💨', label: 'Calm down', bg: '#3f50b8' },
  { slug: 'boost-energy', emoji: '⚡', label: 'Boost energy', bg: '#e65800' },
  { slug: 'feel-good', emoji: '🌈', label: 'Feel good', bg: '#219653' },
  { slug: 'focus', emoji: '🧠', label: 'Focus', bg: '#49aee1' },
  { slug: 'wind-down', emoji: '😴', label: 'Wind down', bg: '#7040c8' },
]

// ── Category page (category.html:158-204 CATEGORIES) ──────────────────────────

export interface CategoryVideo {
  readonly bg: string
  readonly art: string
  readonly title: string
  readonly duration: string
  readonly sparks: number
}

export interface CategoryDef {
  readonly title: string
  readonly videos: readonly CategoryVideo[]
}

/** `category.html:158-204` — hardcoded 5-category listing (4 videos each). */
export const CATEGORIES: Record<string, CategoryDef> = {
  'calm-down': {
    title: 'Calm down',
    videos: [
      { bg: '#d0e8f5', art: 'carousel-01.svg', title: 'Aurora Strauss: Calm in the crash', duration: '2:14', sparks: 1 },
      { bg: '#b8ddd0', art: 'carousel-02.svg', title: 'Box breathing with Dr. Sarah Lin', duration: '3:00', sparks: 1 },
      { bg: '#c8d8e8', art: 'carousel-04.svg', title: 'Cold water reset: 60 seconds', duration: '1:00', sparks: 1 },
      { bg: '#a0c8d8', art: 'carousel-05.svg', title: 'Progressive muscle release', duration: '4:30', sparks: 2 },
    ],
  },
  'boost-energy': {
    title: 'Boost energy',
    videos: [
      { bg: '#fff9dd', art: 'carousel-02.svg', title: 'Zalia: Daring to be uniquely you', duration: '1:07', sparks: 1 },
      { bg: '#f8d9d0', art: 'carousel-03.svg', title: 'Karl Anthony Tawns: Morning fire', duration: '1:07', sparks: 1 },
      { bg: '#c4a3ff', art: 'carousel-04.svg', title: 'Jim Kwik: Power your brain', duration: '2:00', sparks: 1 },
      { bg: '#fce3bb', art: 'carousel-05.svg', title: 'Wim Hof: The ice man breathes', duration: '3:15', sparks: 2 },
    ],
  },
  'feel-good': {
    title: 'Feel good',
    videos: [
      { bg: '#f8b3b8', art: 'carousel-01.svg', title: 'Gratitude unlock: 3 minutes', duration: '3:00', sparks: 1 },
      { bg: '#c8efd8', art: 'carousel-03.svg', title: 'Mel Robbins: The high five habit', duration: '1:30', sparks: 1 },
      { bg: '#fde8d0', art: 'carousel-04.svg', title: 'Body scan for self-compassion', duration: '5:00', sparks: 2 },
      { bg: '#f4c0d0', art: 'carousel-05.svg', title: 'Dance break: just 2 minutes', duration: '2:00', sparks: 1 },
    ],
  },
  focus: {
    title: 'Focus',
    videos: [
      { bg: '#b8c0ed', art: 'carousel-02.svg', title: 'Deep work: single task flow', duration: '2:00', sparks: 1 },
      { bg: '#8898d8', art: 'carousel-03.svg', title: 'Huberman: Eye focus drill', duration: '1:45', sparks: 1 },
      { bg: '#6878b8', art: 'carousel-04.svg', title: 'Pomodoro intro with Ali Abdaal', duration: '3:00', sparks: 2 },
      { bg: '#98a8c8', art: 'carousel-01.svg', title: '4-7-8 breath for mental clarity', duration: '2:30', sparks: 1 },
    ],
  },
  'wind-down': {
    title: 'Wind down',
    videos: [
      { bg: '#c4a3ff', art: 'carousel-01.svg', title: 'Sleep story: forest at dusk', duration: '5:00', sparks: 2 },
      { bg: '#d8b8f0', art: 'carousel-02.svg', title: 'Matthew Walker: Wind-down ritual', duration: '2:30', sparks: 1 },
      { bg: '#a880e8', art: 'carousel-03.svg', title: 'Yoga nidra: full body let go', duration: '8:00', sparks: 3 },
      { bg: '#8060c0', art: 'carousel-05.svg', title: 'Phone-free evening: 10 tips', duration: '1:30', sparks: 1 },
    ],
  },
}

/** `category.html:207` default category. */
export const CATEGORY_DEFAULT = 'boost-energy'

// ── Video player (toolkit-video.html:430-439 VIDEO_CFG) ───────────────────────

export interface VideoCfg {
  /** Statically-served mp4 (moved to `public/student/videos/` in Phase 1). */
  readonly src: string
  /** Migrated cover-image filename. */
  readonly thumb: string
}

/** `toolkit-video.html:430-439` — the two playable clips. */
export const VIDEO_CFG: Record<string, VideoCfg> = {
  'calming-breath': {
    src: '/student/videos/calming-breath.mp4',
    thumb: 'calming-breath-cover.png',
  },
  'youve-done-hard-things': {
    src: '/student/videos/youve-done-hard-things.mp4',
    thumb: 'youve-done-hard-things-cover.png',
  },
}

/** Default thumbnail when `?video=` is unknown (`toolkit-video.html:292`). */
export const VIDEO_DEFAULT_THUMB = 'video-thumbnail.jpg'

// ── Copy (hardcoded fallbacks) ────────────────────────────────────────────────

export const TOOLKIT_COPY = {
  title: 'My toolkit',
  exploreTitle: 'Explore',
  desc: 'Content for how you feel.',
  exploreBtn: 'More',
  savedEmpty: 'Save your favourite exercises!',
} as const
