/**
 * Journal topic prompts — how big their text can be, and (until step-30) the
 * all-about-you question's daily draw.
 *
 * The journal's own draw moved to the server in step-24
 * (`dailyJournalPrompts`): stable for the student's LOCAL day, unanswered
 * first. Only all-about-you still draws here, and step-30 moves it too.
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

/** FNV-1a — a stable 32-bit hash, so a seed string becomes a PRNG state. */
function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — small, seedable, and good enough to shuffle a list. */
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The seed behind a student's draw for a (UTC) day. */
export function journalTopicSeed(userId: string, now: Date): string {
  return `${userId}|${now.toISOString().slice(0, 10)}`
}

/**
 * One prompt the student has not answered yet — the write-it-out question, and
 * the all-about-you question (any catalogue row with an `id`).
 *
 * - **Never a repeat while there is anything left.** `answeredIds` is every
 *   catalogue question this student has a recorded answer to, wherever it was
 *   answered (write-it-out or a journal topic).
 * - **Not one of `avoidIds`, if it can help it.**
 * - **Stable until answered.** Seeded like the topics, so a reload or a trip
 *   back to Today shows the same question; answering it takes it out of the
 *   pool — the SERVER's pool, since step-9: the caller passes an already
 *   unanswered catalogue (`listQuestions(unansweredBy:)`), where it used to
 *   hand over every prompt plus a set of ~170 answered ids it had paged for.
 *
 * Returns `null` only for an empty catalogue, which now also means "everything
 * is answered" — and a student who has answered all 167 prompts gets the
 * screen's own empty state rather than a repeat.
 *
 * What it still decides is WHICH of the unanswered prompts is today's; step-30
 * takes even that over (`dailyQuestions`).
 */
export function pickDaily<T extends { id: string }>(
  prompts: readonly T[],
  avoidIds: ReadonlySet<string>,
  seed: string,
): T | null {
  const preferred = prompts.filter((p) => !avoidIds.has(p.id))
  const pool = (preferred.length > 0 ? preferred : prompts).slice()
  if (pool.length === 0) return null
  // Sorted by id so the draw does not depend on the order the gateway listed them in.
  pool.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return pool[Math.floor(rng(hash(seed))() * pool.length)]
}
