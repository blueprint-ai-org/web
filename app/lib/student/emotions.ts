/**
 * Emotion configuration — the single source of truth for the mood check-in and
 * journal emotion model.
 *
 * Ported verbatim from the prototype:
 *  - `EMOTIONS` table — `mood-checkin.html:844-860` (name, color, gradDark,
 *    emoji, per-level emojis, level labels, reason chips, background-blob shape
 *    geometry, and the migrated `${key}-shape.svg` asset).
 *  - `EMOTION_QUESTIONS` — `journal.html:1051-1067` (two contextual journal
 *    prompts per emotion).
 *
 * Colors are stored as **raw hex** (not `var(--…)`) because the journal derives
 * runtime shades from them (`_hexDarken`/`_hexLighten`, `journal.html:1068-1078`,
 * ported in the journal phase) and hex math needs the literal value. The
 * `--color-student-emotion-*` tokens in `app/app.css` mirror these same values;
 * this module is authoritative (per the 2026-07-19 decision to source the
 * palette from the JS `EMOTIONS` constant, not the prototype `--mood-*` tokens).
 */

import { emotionShapeUrl } from '~/assets/student-app'

export const EMOTION_KEYS = [
  'curious',
  'happy',
  'excited',
  'okay',
  'grateful',
  'hopeful',
  'meh',
  'neutral',
  'idontknow',
  'sad',
  'tired',
  'lonely',
  'angry',
  'stressed',
  'anxious',
] as const

export type EmotionKey = (typeof EMOTION_KEYS)[number]

export interface Emotion {
  /** Stable emotion key (also the storage token and shape-asset stem). */
  readonly key: EmotionKey
  /** Display name. */
  readonly name: string
  /** Primary hex — source of truth; mirrored by `--color-student-emotion-{key}`. */
  readonly color: string
  /** Darker gradient stop hex; mirrored by `--color-student-emotion-{key}-grad`. */
  readonly gradDark: string
  /** Default grid emoji. */
  readonly emoji: string
  /** Per-intensity emojis (low → high), indexed by the 3-stop arc slider. */
  readonly emojis: readonly [string, string, string]
  /** Per-intensity level labels (low → high). */
  readonly levels: readonly [string, string, string]
  /** Reason chips shown on the detail screen. */
  readonly chips: readonly string[]
  /** Full-screen background-blob geometry (device coords). */
  readonly shape: { readonly size: number; readonly left: number; readonly top: number }
  /** Migrated background-blob asset, relative to `app/assets/student-app/`. */
  readonly shapeAsset: `${EmotionKey}-shape.svg`
}

/**
 * What the three arc stops are worth on the gateway, low → high.
 *
 * `MoodEntryInput.intensity` is an `Int` the gateway accepts in `0..10`
 * (measured 2026-09-29; `-1` and `11` are refused). `2 / 5 / 8` was chosen over
 * `1 / 5 / 10` so the three stops sit symmetrically about the midpoint — the
 * metrics engine averages this field into `mood_baseline`, and a scale whose
 * mean drifts off-centre would bias every aggregate built on it.
 *
 * Indexed by the same 0-based stop as {@link Emotion.levels} and
 * {@link Emotion.emojis}, so the label, the face and the number never disagree.
 */
export const INTENSITY_BY_LEVEL: readonly [number, number, number] = [2, 5, 8]

export const EMOTIONS: Record<EmotionKey, Emotion> = {
  curious: {
    key: 'curious',
    name: 'Curious',
    color: '#FDDA3C',
    gradDark: '#5A4518',
    emoji: '🤔',
    emojis: ['🤔', '🧐', '😲'],
    levels: ['Interested', 'Curious', 'Have to know!'],
    chips: ['Interested', 'Intrigued', 'Fascinated', 'Nosy', 'Wonder-Filled'],
    shape: { size: 1454, left: -130, top: -460 },
    shapeAsset: 'curious-shape.svg',
  },
  happy: {
    key: 'happy',
    name: 'Happy',
    color: '#FFAF25',
    gradDark: '#5A4518',
    emoji: '😊',
    emojis: ['🙂', '😊', '😄'],
    levels: ['Good', 'Happy', 'Joyful'],
    chips: ['Joyful', 'Content', 'Pleased', 'Cheerful', 'Elated'],
    shape: { size: 1495, left: -151, top: -331 },
    shapeAsset: 'happy-shape.svg',
  },
  excited: {
    key: 'excited',
    name: 'Excited',
    color: '#E65800',
    gradDark: '#633315',
    emoji: '🤩',
    emojis: ['😌', '🤩', '🎉'],
    levels: ['Looking forward to it', 'Excited', 'Pumped'],
    chips: ['Enthusiastic', 'Eager', 'Thrilled', 'Energised', 'Pumped'],
    shape: { size: 1495, left: -151, top: -331 },
    shapeAsset: 'excited-shape.svg',
  },
  okay: {
    key: 'okay',
    name: 'Okay',
    color: '#68DCC6',
    gradDark: '#284B44',
    emoji: '🙂',
    emojis: ['😌', '🙂', '😀'],
    levels: ['Fine', 'Okay', 'Pretty good'],
    chips: ['Fine', 'Comfortable', 'Satisfied', 'Steady', 'Relieved'],
    shape: { size: 1511, left: -159, top: -339 },
    shapeAsset: 'okay-shape.svg',
  },
  grateful: {
    key: 'grateful',
    name: 'Grateful',
    color: '#2CD573',
    gradDark: '#295D3F',
    emoji: '🙏',
    emojis: ['🥰', '🙏', '💝'],
    levels: ['Warm inside', 'Grateful', 'Thankful'],
    chips: ['Appreciative', 'Thankful', 'Touched', 'Lucky', 'Warm Inside'],
    shape: { size: 1405, left: -106, top: -286 },
    shapeAsset: 'grateful-shape.svg',
  },
  hopeful: {
    key: 'hopeful',
    name: 'Hopeful',
    color: '#D1F00B',
    gradDark: '#414815',
    emoji: '😇',
    emojis: ['🌱', '😇', '✨'],
    levels: ['A little hopeful', 'Hopeful', 'Optimistic'],
    chips: ['Optimistic', 'Encouraged', 'Wishing', 'Inspired', 'Looking forward'],
    shape: { size: 1495, left: -151, top: -331 },
    shapeAsset: 'hopeful-shape.svg',
  },
  meh: {
    key: 'meh',
    name: 'Meh',
    color: '#F2F3E5',
    gradDark: '#828282',
    emoji: '😑',
    emojis: ['😑', '🙄', '😒'],
    levels: ['Blah', 'Meh', 'Over it'],
    chips: ['Unimpressed', 'Bored', 'Flat', 'Disengaged', 'Apathetic'],
    shape: { size: 1108, left: 43, top: -262 },
    shapeAsset: 'meh-shape.svg',
  },
  neutral: {
    key: 'neutral',
    name: 'Neutral',
    color: '#BFBFBF',
    gradDark: '#555555',
    emoji: '😐',
    emojis: ['😐', '😶', '🫤'],
    levels: ['Just okay', 'Neutral', 'Normal'],
    chips: ['Indifferent', 'Detached', 'Composed', 'Shoulder Shrug', 'Neither'],
    shape: { size: 1244, left: -25, top: -205 },
    shapeAsset: 'neutral-shape.svg',
  },
  idontknow: {
    key: 'idontknow',
    name: "I Don't Know",
    color: '#8C8C8C',
    gradDark: '#404040',
    emoji: '🤷',
    emojis: ['😕', '🤷', '😵'],
    levels: ['Unsure', 'Not sure', 'Confused'],
    chips: ['Confused', 'Uncertain', 'Overwhelmed', 'Numb', 'Conflicted'],
    shape: { size: 1555, left: -181, top: -361 },
    shapeAsset: 'idontknow-shape.svg',
  },
  sad: {
    key: 'sad',
    name: 'Sad',
    color: '#56CCF2',
    gradDark: '#1C4958',
    emoji: '😢',
    emojis: ['😔', '😢', '💔'],
    levels: ['Down', 'Sad', 'Hurt'],
    chips: ['Sorrowful', 'Left Out', 'Let Down', 'Disappointed', 'Heartbroken'],
    shape: { size: 1281, left: -44, top: -74 },
    shapeAsset: 'sad-shape.svg',
  },
  tired: {
    key: 'tired',
    name: 'Tired',
    color: '#6A7EFF',
    gradDark: '#2A315D',
    emoji: '😴',
    emojis: ['🥱', '😴', '😪'],
    levels: ['Low energy', 'Tired', 'Exhausted'],
    chips: ['Exhausted', 'Drained', 'Fatigued', 'Sleepy', 'Checked Out'],
    shape: { size: 1495, left: -151, top: -286 },
    shapeAsset: 'tired-shape.svg',
  },
  lonely: {
    key: 'lonely',
    name: 'Lonely',
    color: '#C4A3FF',
    gradDark: '#645387',
    emoji: '😔',
    emojis: ['😔', '🥺', '😿'],
    levels: ['A little alone', 'Lonely', 'Isolated'],
    chips: ['Isolated', 'Disconnected', 'Left Out', 'Longing', 'Forgotten'],
    shape: { size: 1495, left: -151, top: -331 },
    shapeAsset: 'lonely-shape.svg',
  },
  angry: {
    key: 'angry',
    name: 'Angry',
    color: '#EC3E23',
    gradDark: '#6A251A',
    emoji: '😠',
    emojis: ['😒', '😠', '🤬'],
    levels: ['Annoyed', 'Angry', 'Furious'],
    chips: ['Frustrated', 'Irritated', 'Furious', 'Annoyed', 'Jealous'],
    shape: { size: 1615, left: -211, top: -591 },
    shapeAsset: 'angry-shape.svg',
  },
  stressed: {
    key: 'stressed',
    name: 'Stressed',
    color: '#C12A67',
    gradDark: '#5A253B',
    emoji: '😤',
    emojis: ['😬', '😤', '🤯'],
    levels: ['Tense', 'Stressed', 'Overwhelmed'],
    chips: ['Overwhelmed', 'Pressured', 'Tense', 'Rushed', 'Snappy'],
    shape: { size: 1495, left: -151, top: -131 },
    shapeAsset: 'stressed-shape.svg',
  },
  anxious: {
    key: 'anxious',
    name: 'Anxious',
    color: '#BD67FF',
    gradDark: '#3B1B54',
    emoji: '😰',
    emojis: ['😟', '😰', '😱'],
    levels: ['Uneasy', 'Anxious', 'Panicked'],
    chips: ['Worried', 'Nervous', 'Scared', 'Fearful', 'Panicked'],
    shape: { size: 1495, left: -151, top: -331 },
    shapeAsset: 'anxious-shape.svg',
  },
}

/**
 * Emotion → primary hex, derived from `EMOTIONS` so the two never drift.
 * Mirrors the prototype's `EMOTION_COLORS` (`journal.html:1044-1050`), which
 * carried the same values.
 */
export const EMOTION_COLORS: Record<EmotionKey, string> = Object.fromEntries(
  EMOTION_KEYS.map((k) => [k, EMOTIONS[k].color]),
) as Record<EmotionKey, string>

/**
 * Two contextual journal prompts per emotion (`journal.html:1051-1067`). The
 * journal picks index 0 or 1 by circle position.
 */
export const EMOTION_QUESTIONS: Record<EmotionKey, readonly [string, string]> = {
  curious: [
    "What's been sparking your curiosity today?",
    'What would you love to find out or explore right now?',
  ],
  happy: [
    'What made you feel good today?',
    'What small thing brought a smile to your face?',
  ],
  excited: [
    'What are you most excited about right now?',
    "What's making you feel so pumped today?",
  ],
  okay: [
    "What's keeping you feeling steady today?",
    'What would make today even a little bit better?',
  ],
  grateful: [
    'What are you grateful for right now?',
    'Who or what made you feel warm and appreciated today?',
  ],
  hopeful: [
    'What are you hoping for right now?',
    "What feels possible today that maybe didn't before?",
  ],
  meh: [
    'What would you change about today if you could?',
    "What usually helps when you're feeling a bit flat?",
  ],
  neutral: [
    "What's been on your mind today — even if it feels small?",
    "Is there something you've been thinking about but haven't said out loud?",
  ],
  idontknow: [
    'Sometimes feelings are hard to name — what do you notice in your body right now?',
    "What's been going on lately that might explain your mood?",
  ],
  sad: [
    "What's been weighing on you lately?",
    'What would help you feel even a little better right now?',
  ],
  tired: [
    "What's been draining your energy lately?",
    'What would a real rest look like for you today?',
  ],
  lonely: [
    'Is there someone you wish you could talk to right now?',
    'What would help you feel more connected today?',
  ],
  angry: [
    'What happened that got under your skin today?',
    'What would help you feel less frustrated right now?',
  ],
  stressed: [
    "What's the biggest thing on your mind right now?",
    "What's one thing that would help you feel less overwhelmed?",
  ],
  anxious: [
    "What's your mind racing about right now?",
    "What's one small thing that might help you feel calmer?",
  ],
}

/** Resolves an emotion's migrated background-blob asset URL. */
export function emotionShape(key: EmotionKey): string | undefined {
  return emotionShapeUrl(key)
}
