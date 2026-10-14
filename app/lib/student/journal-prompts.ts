/**
 * Journal topic prompts — how big their text can be.
 *
 * Which prompts are today's is the server's (`dailyQuestions`, step-24/30):
 * stable for the student's LOCAL day, unanswered first. The seeded hash that
 * drew them here, on the UTC day, is gone.
 *
 * ## Why the text needs a fit
 *
 * The prototype's circle copy ran 30–70 characters. The catalogue's runs 33–159
 * (median 84), and a 220 px circle with 36 px of padding leaves a 148 px square
 * that 20 px type overflows from about 90 characters. {@link promptScale}
 * steps the type down for long prompts only; short ones keep the design's size.
 */

/** One catalogue prompt, reduced to what the journal renders. */
export interface JournalPrompt {
  id: string
  label: string
}

/**
 * Type scale for a prompt of this length, as a factor of the design's size.
 *
 * One factor drives both the circle (20 px) and the overlay (48 px), because
 * the circle→overlay FLIP counter-scales the circle's text into the overlay's:
 * the two sizes have to move together or the text jumps at the hand-off.
 */
export function promptScale(text: string): number {
  const length = text.trim().length
  if (length <= 80) return 1
  if (length <= 115) return 0.85
  return 0.75
}
