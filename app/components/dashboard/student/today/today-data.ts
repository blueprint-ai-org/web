/**
 * Today-hub data — the card queue config + mood/wins overlay content the
 * prototype kept as inline JS consts (`today.html`).
 *
 *  - {@link TODAY_CARDS} — the 4 hub cards in DOM order (`today:550-602`,
 *    `CARD_CFG` :847-851). `mood` is baked done; the other three start sleepy.
 *  - {@link EYE_GEOMETRY} — the identical googly-eye geometry every sleepy card
 *    uses (`today:555-595`, `EYE_REST` :1067-1071).
 *  - {@link COMPLETED_CARDS} — the completed-route flying-card art + drawer slot
 *    (`completed.html:195-219`), plus the shared drawer slot geometry.
 *  - {@link MOOD_CHIPS} / {@link REASON_EMOJI} — mood-overlay chip + reason maps
 *    (`today:756-776`).
 */

import type { EmotionKey } from '~/lib/student/emotions'

/** Card queue ids (also the storage-section keys, minus the `card-` prefix). */
export type CardId = 'card-mood' | 'card-wins' | 'card-write' | 'card-about'
export type CardState = 'sleepy' | 'hero' | 'done'

/** Done-card interaction: an in-page overlay, the journal hand-off, or re-open the flow. */
export type DoneAction = 'mood-overlay' | 'wins-overlay' | 'journal' | 'flow'

export interface CardDef {
  id: CardId
  /** Storage section key appended to `bp_today_sections`. */
  section: string
  /** Migrated sleepy art (`sleepy-N.svg`); undefined for the always-done mood card. */
  sleepySvg?: string
  /** Migrated done art (`*-04.svg`). */
  doneSvg: string
  /** Sleepy-click destination (mount-relative segment), e.g. `notice-wins`. */
  flow?: string
  /** What a *done* card does when clicked. */
  doneAction: DoneAction
  /** Whether the card seeds as done (mood only). */
  bakedDone?: boolean
}

/**
 * Cards in DOM order (`today:550-602`): write is the initial hero, mood is baked
 * done. The one-shot `bp_<section>_done` flags key off `card-<section>`.
 */
export const TODAY_CARDS: readonly CardDef[] = [
  { id: 'card-write', section: 'write', sleepySvg: 'sleepy-2.svg', doneSvg: 'write-i-o-04.svg', flow: 'write-it-out', doneAction: 'journal' },
  { id: 'card-wins', section: 'wins', sleepySvg: 'sleepy-1.svg', doneSvg: 'notice-y-w-04.svg', flow: 'notice-wins', doneAction: 'wins-overlay' },
  { id: 'card-about', section: 'about', sleepySvg: 'sleepy-3.svg', doneSvg: 'all-a-y-04.svg', flow: 'all-about-you', doneAction: 'flow' },
  { id: 'card-mood', section: 'mood', doneSvg: 'mood-checkin-04.svg', doneAction: 'mood-overlay', bakedDone: true },
]

/** All four section keys — "all done" when every one is present in `bp_today_sections`. */
export const ALL_SECTIONS = ['mood', 'wins', 'write', 'about'] as const

/** `card-<section>` → the one-shot done flag consumer (see storage adapter). */
export const DONE_FLAG_SECTIONS = ['wins', 'write', 'about'] as const

/** The eye slug (`card-write` → `write`). */
export function cardSlug(id: CardId): string {
  return id.replace('card-', '')
}

// ── Googly-eye geometry (identical across sleepy cards, `today:555-595`) ───────

export const EYE_GEOMETRY = {
  viewBox: '0 0 237 353',
  /** White ellipse + pupil rest centres, per side. */
  left: { wcx: 101, wcy: 112.801, pcx: 101, pcy: 119.8 },
  right: { wcx: 137, wcy: 112.801, pcx: 137, pcy: 119.8 },
  /** Ellipse radii. `ryOpen` is the fully-open eyelid height. */
  rx: 13.4,
  ryOpen: 17.866,
  /** Pupil radius when open. */
  pupilR: 9.38,
  whiteFill: '#F2F3E5',
  pupilFill: '#2B2B32',
} as const

/** Eyelid tween durations/easing (`openEyes`/`closeEyes`, `today:1191-1215`). */
export const EYE_TWEEN = { openMs: 480, closeMs: 320 } as const

/** Hover-pupil wander (`today:1124-1130`, lerp 0.04). */
export const WANDER_HOVER = { lerp: 0.04, radiusMin: 0, radiusMax: 4, repickMin: 1000, repickMax: 3200 } as const
/** Hero-pupil wander (`today:1133-1139`, lerp 0.09). */
export const WANDER_HERO = { lerp: 0.09, radiusMin: 2.5, radiusMax: 4, repickMin: 500, repickMax: 1700 } as const

// ── Entry / success / card timings (exact, from spec) ─────────────────────────

export const ENTRY = {
  delayMs: 300,
  durationMs: 800,
  easing: 'cubic-bezier(0.73,-0.01,0.2,0.98)',
} as const

export const SUCCESS = {
  ellipseEasing: 'cubic-bezier(0.81,0,0.26,0.98)',
  ellipseMs: 800,
  contentDelayMs: 700,
  contentFadeMs: 400,
} as const

// ── Completed route (flying card + drawer, `completed.html:195-219`) ──────────

export interface CompletedCardDef {
  svg: string
  col: number
  section: string
}
export const COMPLETED_CARDS: Record<string, CompletedCardDef> = {
  mood: { svg: 'mood-checkin-04.svg', col: 0, section: 'mood' },
  wins: { svg: 'notice-y-w-04.svg', col: 1, section: 'wins' },
  write: { svg: 'write-i-o-04.svg', col: 2, section: 'write' },
  about: { svg: 'all-a-y-04.svg', col: 3, section: 'about' },
}

/** Drawer slot geometry (`completed:204-219`, `today:982-989`). */
export const DRAWER = {
  colX: [16, 138.136, 260.271, 382.408, 504.544],
  rowY: [16, 194, 372, 550],
  left: 280,
  topIn: 96,
  topOut: 900,
  miniScale: 114.136 / 237, // ≈ 0.4815
  miniW: 114.136,
  miniH: 170,
  cardW: 237,
  cardH: 353,
  /** Flying card centred in the 1194×834 device (`completed:212-213`). */
  cardLeft: (1194 - 237) / 2, // 478.5
  cardTop: (834 - 353) / 2, // 240.5
} as const

/** Completed-route stage timings in ms from load (`completed:248-288`). */
export const COMPLETED_TIMELINE = {
  cardIn: 60,
  sparkIn: 120,
  textIn: 350,
  drawerUp: 900,
  flyToSlot: 1600,
  slideOut: 3020,
  redirect: 3900,
} as const

// ── Mood / wins overlay content (`today:756-776`) ─────────────────────────────

/** Mood chips keyed by uppercase emotion name (`today:756-770`). */
export const MOOD_CHIPS: Record<string, readonly string[]> = {
  HAPPY: ['Grateful', 'Loved', 'Content', 'Proud'],
  EXCITED: ['Energetic', 'Inspired', 'Motivated', 'Eager'],
  ANXIOUS: ['Nervous', 'Worried', 'Overwhelmed'],
  SAD: ['Lonely', 'Disappointed', 'Hurt'],
  TIRED: ['Drained', 'Exhausted', 'Unfocused'],
  OKAY: ['Balanced', 'Calm', 'Neutral'],
  MEH: ['Flat', 'Bored', 'Restless'],
  GRATEFUL: ['Thankful', 'Warm', 'Connected'],
  CURIOUS: ['Engaged', 'Interested', 'Open'],
  STRESSED: ['Tense', 'Pressured', 'Overwhelmed'],
  LONELY: ['Isolated', 'Left out', 'Disconnected'],
  ANGRY: ['Frustrated', 'Irritated', 'Annoyed'],
  HOPEFUL: ['Optimistic', 'Looking forward', 'Motivated'],
}

/** Reason label → emoji (`ALL_REASONS`, `today:771-776`). */
export const REASON_EMOJI: Record<string, string> = {
  'School life': '📚',
  Exams: '✍️',
  'Home life': '🏠',
  Activities: '🤸',
  'Saw something online': '📱',
  Friends: '👫',
  'No friends': '🚶',
  Hungry: '😩',
}

export const WINS_DEFAULT_QUESTION =
  "What's one small thing that happened today that made you smile — even briefly?"

/** Mood-overlay chips for the selected emotions, deduped, capped at 6 (`today` overlay build). */
export function moodChipsFor(emotionKeys: readonly string[]): string[] {
  const out: string[] = []
  for (const k of emotionKeys) {
    const chips = MOOD_CHIPS[k.toUpperCase()]
    if (!chips) continue
    for (const c of chips) if (!out.includes(c)) out.push(c)
  }
  return out.slice(0, 6)
}

/** Emotion tile label — uppercased display name for the mood overlay. */
export function emotionTileLabel(key: EmotionKey): string {
  return key.toUpperCase()
}
