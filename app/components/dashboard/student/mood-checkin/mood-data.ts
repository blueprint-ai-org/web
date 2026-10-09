/**
 * Mood check-in flow data — the non-emotion config the prototype kept as inline
 * JS consts (`mood-checkin.html`). Emotion data (colors, emojis, levels, shape
 * geometry) lives in `~/lib/student/emotions.ts`; this module holds only the
 * bits specific to the check-in wizard:
 *
 *  - {@link EMOTION_GRID_ORDER} — the 5×3 picker layout order (`:669-739`),
 *    which differs from the `EMOTION_KEYS` declaration order.
 *  - {@link WHY_BLOCKS} / {@link WHY_DECO_POS} — the "What's going on?" reason
 *    chips and per-count background-deco placement (`:1197-1213`).
 *  - {@link PICKER_EMOJI} — the add-other emoji picker grid (`:1299-1322`).
 *  - {@link SLEEP_LEVELS} — the 7-stop sleep slider stops (`:1490-1498`).
 *  - {@link SPARK_FRAMES} — the +10 reward badge crossfade frames (`:602-617`).
 */

import type { EmotionKey } from '~/lib/student/emotions'

/**
 * Emotion picker grid order, row-major over 5 columns (`mood-checkin.html:669-739`).
 * Distinct from `EMOTION_KEYS` (which is intensity-ordered for the journal).
 */
export const EMOTION_GRID_ORDER: readonly EmotionKey[] = [
  'curious', 'okay', 'meh', 'sad', 'angry',
  'happy', 'grateful', 'neutral', 'tired', 'stressed',
  'excited', 'hopeful', 'idontknow', 'lonely', 'anxious',
]

/** Max emotions selectable in the picker (`mood-checkin.html:1010`). */
export const MAX_EMOTIONS = 3

/**
 * Per-key label nudges baked into the prototype grid CSS (`:99-104`) — the
 * uppercase display-font labels overlap the blob art differently per shape.
 */
export const EMOTION_LABEL_PADDING: Partial<Record<EmotionKey, string>> = {
  curious: 'paddingBottom: 5',
  angry: 'paddingTop: 10',
  sad: 'paddingBottom: 5',
  grateful: 'paddingBottom: 5',
  stressed: 'paddingBottom: 40',
  tired: 'paddingTop: 10',
}

export interface WhyBlock {
  readonly emoji: string
  readonly label: string
}

/** Reason chips on the "What's going on?" screen (`mood-checkin.html:1197-1206`). */
export const WHY_BLOCKS: readonly WhyBlock[] = [
  { emoji: '📚', label: 'School life' },
  { emoji: '📝', label: 'Exams' },
  { emoji: '🏠', label: 'Home life' },
  { emoji: '🤸', label: 'Activities' },
  { emoji: '📱', label: 'Saw something online' },
  { emoji: '👫', label: 'Friends' },
  { emoji: '🫥', label: 'No friends' },
  { emoji: '😩', label: 'Hungry' },
]

/**
 * Which background-deco slots the selected emotions occupy on the why screen,
 * keyed by selection count (`mood-checkin.html:1209-1213`). Index i → slot for
 * the i-th selected emotion.
 */
export type WhyDecoSlot = 'tl' | 'mr' | 'bl' | 'br'
export const WHY_DECO_POS: Record<1 | 2 | 3, readonly WhyDecoSlot[]> = {
  1: ['bl'],
  2: ['tl', 'br'],
  3: ['tl', 'mr', 'bl'],
}

export interface SleepLevel {
  readonly emoji: string
  readonly label: string
}

/** 7-stop sleep-quality slider stops, worst → best (`mood-checkin.html:1490-1498`). */
export const SLEEP_LEVELS: readonly SleepLevel[] = [
  { emoji: '😩', label: 'Terrible' },
  { emoji: '😔', label: 'Hard to fall asleep' },
  { emoji: '😕', label: 'Not great' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😌', label: 'Pretty good' },
  { emoji: '🙂', label: 'Slept well' },
  { emoji: '😄', label: 'Woke up feeling great' },
]

/** Default sleep-slider stop index (`mood-checkin.html:1548`, `arcSnap(3)`). */
export const SLEEP_DEFAULT_INDEX = 3

/** Sleep-slider fill gradient (`mood-checkin.html:768-769`). */
export const SLEEP_GRADIENT = [
  { offset: 0, color: '#2A315D' },
  { offset: 100, color: '#3F50B8' },
] as const

/** Sleep screen background + thumb fill (`mood-checkin.html:532`, `:777`). */
export const SLEEP_BG = '#3f50b8'

/**
 * Spark-badge crossfade frames for the +10 reward (`mood-checkin.html:803-807`,
 * DOM order = animation order via `spark-c1..c4`). Migrated asset stems.
 */
export const SPARK_FRAMES = ['spark-4.svg', 'spark-01.svg', 'spark-02.svg', 'spark-03.svg'] as const

/**
 * Add-other emoji picker grid (`mood-checkin.html:1299-1322`), verbatim order.
 */
export const PICKER_EMOJI: readonly string[] = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶',
  '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤧', '🥵',
  '🥶', '🥴', '😵', '🤯', '🤠', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲',
  '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
  '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '☝️',
  '👇', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '🙏', '✍️', '💪', '🦾',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
  '🙉', '🙊', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌',
  '🐞', '🐜', '🐢', '🐍', '🦎', '🐙', '🦑', '🐠', '🐟', '🐬', '🐳', '🦈', '🦒', '🐘', '🦏', '🐪',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
  '🥕', '🌽', '🌶️', '🍔', '🍟', '🍕', '🌭', '🌮', '🌯', '🍜', '🍛', '🍣', '🍱', '🍤', '🎂', '🍰',
  '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🍿', '☕', '🍵', '🧋', '🍺', '🍷', '🥂',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏆', '🥇', '🎮', '🕹️', '🎲', '♟️',
  '🧩', '🎯', '🎨', '🎭', '🎬', '🎤', '🎧', '🎹', '🥁', '🎸', '🎺', '🎻',
  '🚗', '🚙', '🚌', '✈️', '🚀', '🛸', '🛶', '⛵', '🚤', '🏠', '🏢', '🌆', '🌇', '🌌', '🌠', '🏔️',
  '🌋', '🏕️', '🏖️',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
  '✨', '⭐', '🌟', '💫', '🌈', '🔥', '💥', '❄️', '🌊', '💧', '🌸', '🌺', '🌻', '🌹', '🌷', '🌼',
  '🍀', '🍁', '🌿', '🌱', '💡', '🔦', '💎', '🔮', '🪄', '🎩', '📱', '💻', '📷', '📸', '📹', '🎥',
  '💰', '💵', '💳', '✉️', '📝', '📚', '📖', '💼', '🎁', '🎀', '🏅', '🎟️', '🎪',
]
