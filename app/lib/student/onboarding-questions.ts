/**
 * The onboarding questions this app asks — one source of truth for the screen
 * *and* for what gets seeded into the BP AI question catalogue.
 *
 * Same shape of decision as `~/lib/student/avatars`: the gateway owns the
 * canonical row, the app owns the rendering, and a single module keeps a seeded
 * row from drifting from the copy on screen.
 *
 * ## Why this is also the fallback
 *
 * `listQuestions` is readable with the student's own token (measured
 * 2026-09-24), so the screen fetches its own question in a loader. But an
 * onboarding screen must render even when the gateway is unreachable, when the
 * tenant was never seeded, or when somebody archives the row — a student
 * halfway through onboarding is the worst possible audience for an error page.
 * So this spec is what the screen falls back to, and the fallback is the same
 * text the catalogue holds rather than a second, drifting copy.
 *
 * ## Conventions, read off the ten questions already in Blueprint Media
 *
 *  - `category` is snake_case; `onboarding` already exists, holding
 *    *"What do you want to be called?"* at order 1 — archived on 2026-09-28
 *    (no student can answer it), but still occupying the slot.
 *  - `order` is 1-based **within** a category.
 *  - option `value` is a snake_case slug, option `order` is 1-based, and
 *    `emoji` is populated wherever the UI shows one.
 *  - `SELECT_ONE` is the type for pick-exactly-one; `max_selections` is only
 *    meaningful for `MULTISELECT`, and is set only on the questions that are.
 */

/** `QuestionType { OPEN SELECT_ONE MULTISELECT }`. */
export type QuestionType = 'OPEN' | 'SELECT_ONE' | 'MULTISELECT'

export interface OnboardingQuestionOption {
  /**
   * Shown next to the option where the screen has room for one — the arc's
   * stops do, the feel-good cards (which carry illustrations instead) do not.
   * Left unset rather than invented: the catalogue's own convention is that
   * `emoji` is populated only where the UI shows one.
   */
  readonly emoji?: string
  readonly label: string
  /** Stored answer value — snake_case, stable, never shown. */
  readonly value: string
  /** 1-based, left to right. */
  readonly order: number
}

export interface OnboardingQuestionSpec {
  readonly label: string
  readonly category: string
  readonly type: QuestionType
  readonly order: number
  readonly status: string
  /** `MULTISELECT` only — the gateway validates the answer's count against it. */
  readonly maxSelections?: number
  readonly options: readonly OnboardingQuestionOption[]
}

/**
 * `/student/onboarding/baseline-mood`.
 *
 * The five stops are the prototype's (`onboarding.html#s4`) and their order is
 * the arc's, worst to best — which is also what makes `order` meaningful here:
 * this is a scale, not a menu, so a client that sorts by `order` gets the arc
 * back in the right direction.
 */
export const BASELINE_MOOD_QUESTION: OnboardingQuestionSpec = {
  label: 'How do you feel most days?',
  category: 'onboarding',
  type: 'SELECT_ONE',
  // 1 is "What do you want to be called?" — the question behind the name screen
  // deleted on 2026-09-23, and archived in the catalogue on 2026-09-28 once a
  // re-measure confirmed no self-service name write exists. Archived, not
  // deleted: the slot stays taken so these orders never have to shift.
  order: 2,
  status: 'active',
  options: [
    { emoji: '😞', label: 'Bad', value: 'bad', order: 1 },
    { emoji: '😕', label: 'Ugh', value: 'ugh', order: 2 },
    { emoji: '😐', label: 'Okay', value: 'okay', order: 3 },
    { emoji: '🙂', label: 'Good', value: 'good', order: 4 },
    { emoji: '😄', label: 'Great', value: 'great', order: 5 },
  ],
}

/**
 * `/student/onboarding/helpers`.
 *
 * Six feel-good cards, any number of them. The prototype caps nothing, so
 * `maxSelections` is the number of cards — the field has to say something, and
 * "all of them" is the honest value. The gateway refuses an answer with more
 * option ids than this, and refuses an empty one, which is why the screen only
 * records once at least one card is chosen.
 *
 * The **art** is not in here and never will be: each card carries a hand-placed
 * illustration and, on five of six, its own googly-eye geometry. The catalogue
 * owns the wording; the code owns the drawing. `order` is what pairs the two,
 * so an admin rewording "Talk" renames the sixth card rather than shuffling the
 * art.
 */
export const HELPERS_QUESTION: OnboardingQuestionSpec = {
  label: 'What helps you feel good?',
  category: 'onboarding',
  type: 'MULTISELECT',
  order: 3,
  status: 'active',
  maxSelections: 6,
  options: [
    { label: 'Good Sleep', value: 'good_sleep', order: 1 },
    { label: 'Friends', value: 'friends', order: 2 },
    { label: 'Good Food', value: 'good_food', order: 3 },
    { label: 'Sports', value: 'sports', order: 4 },
    { label: 'Art & Music', value: 'art_music', order: 5 },
    { label: 'Talk', value: 'talk', order: 6 },
  ],
}

/**
 * `/student/onboarding/trusted-person`.
 *
 * Seven people, any number of them — and unlike the other two screens, **the
 * catalogue owns the whole list here, not just its wording.** The chips are
 * 179×94 buttons in a wrapping flex row carrying an emoji and a label and
 * nothing else: no illustration, no per-option geometry, nothing a code change
 * has to keep in step. Add an eighth person in the catalogue and the row wraps
 * to fit it; drop one and the row closes up.
 *
 * `maxSelections` is the number of options for the same reason as `helpers` —
 * the prototype caps nothing, and the field must say something.
 *
 * "No One Right Now" is the prototype's, and it is a real answer: a student who
 * has nobody has told us the most important thing on this screen.
 */
export const TRUSTED_PERSON_QUESTION: OnboardingQuestionSpec = {
  label: 'Who helps you when things are hard?',
  category: 'onboarding',
  type: 'MULTISELECT',
  order: 4,
  status: 'active',
  maxSelections: 7,
  options: [
    { emoji: '👥', label: 'Friend', value: 'friend', order: 1 },
    { emoji: '👨‍👩‍👦', label: 'Parent or Guardian', value: 'parent_or_guardian', order: 2 },
    { emoji: '🏠', label: 'Family Member', value: 'family_member', order: 3 },
    { emoji: '🍎', label: 'Teacher', value: 'teacher', order: 4 },
    { emoji: '💬', label: 'Counselor', value: 'counselor', order: 5 },
    { emoji: '😶', label: 'No One Right Now', value: 'no_one_right_now', order: 6 },
    { emoji: '📱', label: 'AI', value: 'ai', order: 7 },
  ],
}
