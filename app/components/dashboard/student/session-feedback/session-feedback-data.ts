/**
 * Session-feedback data model — ported 1:1 from `session-feedback.html`'s inline
 * markup + JS.
 *
 * The page is entirely demo/hardcoded in the prototype: nothing touches storage
 * (the "+1 spark" reward is decorative only — no `bp_sparks` write). This module
 * carries the baked copy so {@link SessionFeedback} stays declarative:
 *
 *  - {@link SF_COPY} — the question-screen chrome copy (`session-feedback.html:251-272`).
 *  - {@link SF_ANSWERS} — the three answer blocks and the response they select
 *    (`:255-267`).
 *  - {@link SF_RESPONSES} — the three terminal response screens
 *    (`:275-315`), each with its per-screen `.r-content` top offset (`:153-155`).
 */

/** The three answer paths, keyed by the prototype's `#s-*` response-screen id. */
export type ResponseKey = 'yes' | 'not-really' | 'didnt'

// ── Question-screen copy (session-feedback.html:251-272) ──────────────────────

export const SF_COPY = {
  /** Two lines — the prototype's `<br>` in `.q-subtitle`. */
  subtitle: ['Yesterday was a little tough —', 'we suggested Calming Breath'],
  title: 'Did it help?',
  save: 'Save',
  /** Shared across all three response screens (`.r-btn`). */
  startButton: 'Start with how you feel',
} as const

// ── Answer blocks (session-feedback.html:255-267) ─────────────────────────────

export interface AnswerOption {
  readonly key: ResponseKey
  /** Emoji shown in the block's circular icon. */
  readonly icon: string
  readonly label: string
}

/** The three answer blocks, in DOM order. */
export const SF_ANSWERS: readonly AnswerOption[] = [
  { key: 'yes', icon: '😊', label: 'Yes, it helped' },
  { key: 'not-really', icon: '😕', label: 'Not really' },
  { key: 'didnt', icon: '🤷', label: "I didn't do that" },
] as const

// ── Response screens (session-feedback.html:275-315) ──────────────────────────

export interface ResponseScreen {
  /** Spark reward label (`.r-plus`) — always `+1` in the prototype. */
  readonly reward: string
  readonly text: string
  /** Per-screen `.r-content` top offset in stage px (`session-feedback.html:153-155`). */
  readonly contentTop: number
}

export const SF_RESPONSES: Record<ResponseKey, ResponseScreen> = {
  yes: { reward: '+1', text: "Good to know! We'll keep that in mind.", contentTop: 295 },
  'not-really': {
    reward: '+1',
    text: "Thanks for telling us — we'll try something different next time.",
    contentTop: 231,
  },
  didnt: { reward: '+1', text: "No worries — it'll be there if you ever want it.", contentTop: 265 },
}
