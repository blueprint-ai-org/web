/**
 * The questions the daily check-in asks — one source of truth for the screens
 * *and* for what gets seeded into the BP AI question catalogue.
 *
 * Sibling of `~/lib/student/onboarding-questions`, sharing its types and its
 * reasoning: the gateway owns the canonical row, the app owns the rendering,
 * and a single module keeps a seeded row from drifting from the copy on screen.
 * It is also the **fallback** — a student mid-check-in is the worst possible
 * audience for an error page, so an unreachable gateway or an unseeded tenant
 * renders this text rather than failing.
 *
 * ## Why these are questions at all
 *
 * The check-in's five stages split across two gateway domains. The emotions and
 * their intensities are a first-class domain with their own history and counts
 * (`MoodHistory`, seeded by `scripts/bp-ai-seed-moods.ts`). The two stages after
 * them are *questions* — a `MULTISELECT` and a `SELECT_ONE`, and
 * `QuestionOption.emoji` carries the 📚/😩 art both screens already draw.
 *
 * ## `Question.category` is a closed set
 *
 * Measured 2026-09-29: `createQuestion` refuses any category the tenant does not
 * already hold. `checkin` was rejected for every question type; the six that
 * exist are `about_you`, `gratitude`, `journal`, `mood_reason`, `onboarding` and
 * `sleep`. **Questions may be added to an existing category at a new `order`** —
 * that is what {@link CHECKIN_OTHER_QUESTION} and {@link CHECKIN_SLEEP_QUESTION}
 * do. There is no lane in which the check-in gets a category of its own.
 *
 * **A category holding n questions is the intended shape, not a workaround**
 * (confirmed with Sergio, 2026-09-29). So `sleep` carrying both the platform's
 * duration question and ours is not a duplicate to be reconciled later, and a
 * future screen that needs a question adds one to the category that fits rather
 * than asking the backend for a new category.
 *
 * ## Two rows, two different decisions
 *
 * The platform seeds a question for *both* of these screens, and they were
 * settled separately (2026-09-29):
 *
 *  - **Reasons: adopt the platform's row.** Its eight options are equivalent to
 *    the prototype's and its grid is the same eight cells, so the screen reads
 *    the seeded question and this module mirrors it. See
 *    {@link CHECKIN_REASONS_QUESTION}.
 *  - **Sleep: the frontend is the source of truth.** The platform asks *how many
 *    hours*; the screen asks *how it felt*. Those are different measurements, and
 *    the arc with its seven faces is the product. Ours is seeded alongside the
 *    duration row rather than replacing it. See {@link CHECKIN_SLEEP_QUESTION}.
 *
 * ## Conventions
 *
 * Inherited from `onboarding-questions` and the rows already in Blueprint Media:
 * `category` is snake_case, `order` is 1-based **within** a category, option
 * `value` is a snake_case slug, option `order` is 1-based, and `emoji` is
 * populated wherever the UI shows one. `maxSelections` is only meaningful for
 * `MULTISELECT`.
 */

import type { OnboardingQuestionSpec } from './onboarding-questions'

/**
 * The "What's going on?" reasons screen (`WhyScreen`), shown once after the last
 * picked emotion's detail screen.
 *
 * **This mirrors a row the platform already seeds — the app does not create it.**
 * The seeder matches on `(category, label)`, finds it, and writes nothing; this
 * spec exists so the screen has a fallback when the gateway is unreachable, and
 * so a drift between the seeded row and the rendered copy is visible in review.
 *
 * Two consequences for the screen, both real changes from the prototype:
 *
 *  - The chips are the platform's wording, not `WHY_BLOCKS`'. The grid is still
 *    eight cells, so the 4-column layout and its deco slots are untouched.
 *  - **`max_selections` is 3.** The prototype capped nothing. The screen has to
 *    stop a fourth selection, or the gateway refuses the whole answer — it
 *    validates an answer's option count against this field.
 */
export const CHECKIN_REASONS_QUESTION: OnboardingQuestionSpec = {
  label: "What's behind how you're feeling?",
  category: 'mood_reason',
  type: 'MULTISELECT',
  order: 1,
  status: 'active',
  maxSelections: 3,
  options: [
    { emoji: '📚', label: 'School', value: 'school', order: 1 },
    { emoji: '👥', label: 'Friends', value: 'friends', order: 2 },
    { emoji: '🏡', label: 'Family', value: 'family', order: 3 },
    { emoji: '😴', label: 'Sleep', value: 'sleep', order: 4 },
    { emoji: '🫀', label: 'Health', value: 'health', order: 5 },
    { emoji: '⚽', label: 'Sports or activities', value: 'activities', order: 6 },
    { emoji: '🪞', label: 'Something about me', value: 'myself', order: 7 },
    { emoji: '🤔', label: "I'm not sure", value: 'not_sure', order: 8 },
  ],
}

/**
 * The "Add other" cell on the reasons screen — a text field with its own emoji
 * picker, which a `MULTISELECT` has no way to hold. Added at `mood_reason`
 * order 2, beside the question it belongs to.
 *
 * **This label is operator-facing only.** The student never reads it; they see a
 * tile that says "Add other". It exists so the row is legible in the admin
 * console next to the question it extends.
 *
 * The chosen emoji is stored **with** the text (`"🎮 Gaming"`) rather than
 * dropped or given a field of its own: an `OPEN` answer is a single string, and
 * the emoji is the student's, not ours to discard.
 */
export const CHECKIN_OTHER_QUESTION: OnboardingQuestionSpec = {
  label: "Something else that's behind it",
  category: 'mood_reason',
  type: 'OPEN',
  order: 2,
  status: 'active',
  options: [],
}

/**
 * The sleep screen (`SleepScreen`) — *"Almost done! Last question for today."*
 *
 * Seven stops, worst → best (`mood-checkin.html:1490-1498`). Their order is the
 * arc's, which is what makes `order` load-bearing here: this is a scale, not a
 * menu, so a client sorting by `order` gets the slider back pointing the right
 * way. Same reasoning as `baseline-mood`'s five stops.
 *
 * Seeded at `sleep` order 2, **alongside** the platform's *"How much did you
 * sleep last night?"* at order 1. The two are not alternatives: that one asks
 * duration in hour bands and carries no emoji, this one asks how the night felt
 * and carries a face per stop. The screen reads this one. Nothing persisted the
 * answer before — the port matched the prototype and threw the value away.
 */
export const CHECKIN_SLEEP_QUESTION: OnboardingQuestionSpec = {
  label: 'How was your sleep?',
  category: 'sleep',
  type: 'SELECT_ONE',
  order: 2,
  status: 'active',
  options: [
    { emoji: '😩', label: 'Terrible', value: 'terrible', order: 1 },
    { emoji: '😔', label: 'Hard to fall asleep', value: 'hard_to_fall_asleep', order: 2 },
    { emoji: '😕', label: 'Not great', value: 'not_great', order: 3 },
    { emoji: '😐', label: 'Okay', value: 'okay', order: 4 },
    { emoji: '😌', label: 'Pretty good', value: 'pretty_good', order: 5 },
    { emoji: '🙂', label: 'Slept well', value: 'slept_well', order: 6 },
    { emoji: '😄', label: 'Woke up feeling great', value: 'woke_up_feeling_great', order: 7 },
  ],
}

/** Every check-in question, in the order the flow asks them. */
export const CHECKIN_QUESTIONS: readonly OnboardingQuestionSpec[] = [
  CHECKIN_REASONS_QUESTION,
  CHECKIN_OTHER_QUESTION,
  CHECKIN_SLEEP_QUESTION,
]
