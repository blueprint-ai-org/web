/**
 * Journal-home data model — ported from `journal.html`'s inline JS.
 *
 *  - {@link resolveSlots} — today's topics (the server's `dailyQuestions(category: "journal")`)
 *    as the two circles, recoloured from today's check-in via the emotion
 *    palette + the runtime hex-shade math (`initEmotionCircles`,
 *    `journal.html:1068-1100`). The prototype's baked circle copy and the
 *    per-emotion questions are gone: with nothing drawn there are no circles.
 *  - {@link DEMO_WRITE} / {@link ADD_NOTE_QUESTION} — the demo write-it-out body
 *    (`journal.html:788`) and the recurring "add note" prompt (`ADD_QS`,
 *    `journal.html:1111-1115`).
 *
 * The hex-shade helpers (`_hexDarken`/`_hexLighten`/`_circleColor`) live here
 * rather than in `emotions.ts` because they are journal-specific runtime maths;
 * `emotions.ts` stays the raw-hex source of truth they consume.
 */

import { EMOTION_COLORS, type EmotionKey } from '~/lib/student/emotions'
import { promptScale, type JournalPrompt } from '~/lib/student/journal-prompts'

// ── Hex-shade helpers (journal.html:1068-1078) ───────────────────────────────

function _channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function _toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  )
}

/** Multiply each channel by `f` (`journal.html:1068-1071`). */
export function hexDarken(hex: string, f: number): string {
  const [r, g, b] = _channels(hex)
  return _toHex(r * f, g * f, b * f)
}

/** Blend each channel toward white by `f` (`journal.html:1072-1075`). */
export function hexLighten(hex: string, f: number): string {
  const [r, g, b] = _channels(hex)
  return _toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
}

/** Darken bright hues (luminance > 140) so text stays legible (`journal.html:1076-1079`). */
export function circleColor(hex: string): string {
  const [r, g, b] = _channels(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? hexDarken(hex, 0.55) : hex
}

// ── Question slots ───────────────────────────────────────────────────────────

export type SlotColorClass = 'blue' | 'coral'

export interface QuestionSlot {
  /** 1-based circle number. */
  readonly qnum: 1 | 2
  readonly answerIndex: 0 | 1
  /** The prompt, painted on the circle and in the overlay. */
  readonly circleText: string
  readonly overlayText: string
  /** Circle + overlay background colour. */
  readonly color: string
  /** Overlay message-bubble colour. */
  readonly bubbleColor: string
  /** `null` once recoloured inline from an emotion. */
  readonly colorClass: SlotColorClass | null
  /** The catalogue row behind the prompt. */
  readonly questionId: string
  /** The `/journal/prompt/:questionId` segment that opens this slot. */
  readonly routeKey: string
  /** Type scale for the prompt's length — see `promptScale`. */
  readonly scale: number
}

/** The circles' default colours (`Q_DATA`, `journal.html:1103-1106`). */
const SLOT_DEFAULTS: readonly {
  qnum: 1 | 2
  answerIndex: 0 | 1
  color: string
  bubbleColor: string
  colorClass: SlotColorClass
}[] = [
  { qnum: 1, answerIndex: 0, color: '#3f50b8', bubbleColor: '#49aee1', colorClass: 'blue' },
  { qnum: 2, answerIndex: 1, color: '#e65800', bubbleColor: '#f08b31', colorClass: 'coral' },
]

function isEmotionKey(k: string): k is EmotionKey {
  return k in EMOTION_COLORS
}

/**
 * Today's topics as the circles (`initEmotionCircles`, `journal.html:1080-1101`).
 * Slot `i` shows topic `i`, coloured by emotion `i` of today's check-in when
 * there is one, else by its default.
 *
 * **No topic, no slot.** An unseeded catalogue (or no BP session) draws no
 * circles: the prototype's baked questions were a second catalogue living in
 * the browser, and they are not shown in its place.
 */
export function resolveSlots(moodKeys: readonly string[], topics: readonly JournalPrompt[]): QuestionSlot[] {
  return SLOT_DEFAULTS.slice(0, topics.length).map((d, i) => {
    const topic = topics[i]
    const emo = moodKeys[i]
    const emotion = emo && isEmotionKey(emo) ? emo : null
    const colors = emotion
      ? {
          color: circleColor(EMOTION_COLORS[emotion]),
          bubbleColor: hexLighten(EMOTION_COLORS[emotion], 0.28),
          colorClass: null,
        }
      : { color: d.color, bubbleColor: d.bubbleColor, colorClass: d.colorClass }

    return {
      qnum: d.qnum,
      answerIndex: d.answerIndex,
      circleText: topic.label,
      overlayText: topic.label,
      ...colors,
      questionId: topic.id,
      routeKey: topic.id,
      // Sized by the circle's text: the FLIP hands the circle's type to the
      // overlay, so both read the one factor.
      scale: promptScale(topic.label),
    }
  })
}

/** What the topic overlay paints — a slot, minus its place on the home. */
export type OverlaySlot = Pick<QuestionSlot, 'overlayText' | 'color' | 'bubbleColor' | 'scale'>

// ── Demo / copy constants ────────────────────────────────────────────────────

/** `?demo=2|3` write-it-out body (`journal.html:788`). */
export const DEMO_WRITE =
  'Today my mood was okay. I felt a bit low on energy and not very motivated at times, but nothing too overwhelming. There were small moments when I felt calm and a bit more present, which helped. Overall, it was a pretty average day — not bad, just a bit slow.'

/** `?demo=3` seeds q2 with this answer (`journal.html:799`). */
export const DEMO_Q2_ANSWER = 'Weekend trip.'

/** The recurring add-note prompt (`ADD_QS`, all three identical, `journal.html:1111-1115`). */
export const ADD_NOTE_QUESTION = 'What else is on your mind?'

/** Default write-overlay bubble copy (`journal.html:630`, fallback-only text). */
export const WRITE_BUBBLE_DEFAULT = 'Journaling can help you understand your feelings.'

/** Journal page description (`journal.html:525`, fallback-only text). */
export const JOURNAL_PAGE_DESC = 'Journaling can help you understand your feelings.'
