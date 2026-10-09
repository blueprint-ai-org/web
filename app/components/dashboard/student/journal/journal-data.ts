/**
 * Journal-home data model — ported from `journal.html`'s inline JS.
 *
 *  - {@link QUESTION_SLOTS} — the two topic circles' defaults (`Q_DATA`,
 *    `journal.html:1103-1106`) plus the circles' hard-coded markup text
 *    (`journal.html:589,592`). The prototype only overwrites a slot's *data*
 *    text when a matching mood emotion exists, so the circle and the overlay can
 *    legitimately show different copy for an un-recoloured slot — modelled 1:1.
 *  - {@link resolveSlots} — recolours the slots from `bp_mood_emotions` via the
 *    emotion palette + the runtime hex-shade math (`initEmotionCircles`,
 *    `journal.html:1068-1100`).
 *  - {@link DEMO_WRITE} / {@link ADD_NOTE_QUESTION} — the demo write-it-out body
 *    (`journal.html:788`) and the recurring "add note" prompt (`ADD_QS`,
 *    `journal.html:1111-1115`).
 *
 * The hex-shade helpers (`_hexDarken`/`_hexLighten`/`_circleColor`) live here
 * rather than in `emotions.ts` because they are journal-specific runtime maths;
 * `emotions.ts` stays the raw-hex source of truth they consume.
 */

import { EMOTION_COLORS, EMOTION_QUESTIONS, type EmotionKey } from '~/lib/student/emotions'
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
  /** 1-based question number (also the storage-key suffix). */
  readonly qnum: 1 | 2
  /** Storage key half (`bp_journal_q1` / `q2`). */
  readonly answerIndex: 0 | 1
  /** Text painted on the topic circle. */
  readonly circleText: string
  /** Text used inside the write/prompt overlay (`Q_DATA[i].text`). */
  readonly overlayText: string
  /** Circle + overlay background colour. */
  readonly color: string
  /** Overlay message-bubble colour. */
  readonly bubbleColor: string
  /** `null` once recoloured inline from an emotion. */
  readonly colorClass: SlotColorClass | null
  /** The catalogue row behind the text, or `null` for baked copy. */
  readonly questionId: string | null
  /**
   * The `/journal/prompt/:questionId` segment that opens this slot — the
   * catalogue id, or `topic-<qnum>` when the text is baked (an LTI launch has
   * no BP AI token to read the catalogue with).
   */
  readonly routeKey: string
  /** Type scale for the prompt's length — see `promptScale`. */
  readonly scale: number
}

/** The route segment for a baked slot. */
export function bakedRouteKey(qnum: 1 | 2): string {
  return `topic-${qnum}`
}

/** Slot defaults — `Q_DATA` values + the circles' hard-coded markup text. */
const SLOT_DEFAULTS: readonly {
  qnum: 1 | 2
  answerIndex: 0 | 1
  circleText: string
  dataText: string
  color: string
  bubbleColor: string
  colorClass: SlotColorClass
}[] = [
  {
    qnum: 1,
    answerIndex: 0,
    circleText: 'What makes you feel excited?',
    dataText: 'What kinds of moments or things tend to lift your mood — even a little?',
    color: '#3f50b8',
    bubbleColor: '#49aee1',
    colorClass: 'blue',
  },
  {
    qnum: 2,
    answerIndex: 1,
    circleText: 'What was the best thing that happened yesterday?',
    dataText: "What's making you feel this excited?",
    color: '#e65800',
    bubbleColor: '#f08b31',
    colorClass: 'coral',
  },
]

function isEmotionKey(k: string): k is EmotionKey {
  return k in EMOTION_COLORS
}

/**
 * Recolour the two topic slots from the saved mood emotions
 * (`initEmotionCircles`, `journal.html:1080-1101`). Slot `i` uses emotion `i`;
 * a slot with no matching emotion keeps its default colours.
 *
 * **The text comes from the catalogue when there is one.** `topics` is the
 * route loader's draw from the `journal` category; slot `i` shows topic `i`,
 * on both the circle and the overlay. Only when there is no draw — an LTI
 * launch, an unseeded tenant, an unreachable gateway — does a slot fall back to
 * the prototype's copy: the emotion's question when recoloured, else the
 * markup default on the circle and the `Q_DATA` default in the overlay.
 */
export function resolveSlots(
  moodEmotions: readonly string[],
  topics: readonly JournalPrompt[] | null = null,
): QuestionSlot[] {
  return SLOT_DEFAULTS.map((d, i) => {
    const topic = topics?.[i] ?? null
    const emo = moodEmotions[i]
    const emotion = emo && isEmotionKey(emo) ? emo : null

    const colors = emotion
      ? {
          color: circleColor(EMOTION_COLORS[emotion]),
          bubbleColor: hexLighten(EMOTION_COLORS[emotion], 0.28),
          colorClass: null,
        }
      : { color: d.color, bubbleColor: d.bubbleColor, colorClass: d.colorClass }

    let circleText: string
    let overlayText: string
    if (topic) {
      circleText = topic.label
      overlayText = topic.label
    } else if (emotion) {
      const qs = EMOTION_QUESTIONS[emotion]
      circleText = overlayText = qs[d.answerIndex] ?? qs[0] ?? d.dataText
    } else {
      circleText = d.circleText
      overlayText = d.dataText
    }

    return {
      qnum: d.qnum,
      answerIndex: d.answerIndex,
      circleText,
      overlayText,
      ...colors,
      questionId: topic?.id ?? null,
      routeKey: topic?.id ?? bakedRouteKey(d.qnum),
      // Sized by the circle's text: the FLIP hands the circle's type to the
      // overlay, so both read the one factor.
      scale: promptScale(circleText),
    }
  })
}

/** What the topic overlay paints — a slot, minus its place on the home. */
export type OverlaySlot = Pick<QuestionSlot, 'overlayText' | 'color' | 'bubbleColor' | 'scale'>

/**
 * The overlay for a prompt that is not one of today's two — a link straight to
 * `/journal/prompt/<id>`. It borrows the first slot's default colours; it has no
 * place on the home, so its answer is recorded but never drawn as a card there.
 */
export function standaloneSlot(prompt: JournalPrompt): OverlaySlot {
  const d = SLOT_DEFAULTS[0]
  return {
    overlayText: prompt.label,
    color: d.color,
    bubbleColor: d.bubbleColor,
    scale: promptScale(prompt.label),
  }
}

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
