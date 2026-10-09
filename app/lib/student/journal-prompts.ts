/**
 * Journal topic prompts — which two of the `journal` catalogue the home shows
 * today, and how big their text can be.
 *
 * Pure and isomorphic: the route loader picks on the server, the components
 * size on the client, and neither half touches the gateway.
 *
 * ## Random, but stable for the day
 *
 * There is no recommendation yet, so the two topics are a random draw from the
 * catalogue. A draw *per request* would be wrong: an answered topic shows as a
 * card under its question, and a reload that re-rolled the circles would leave
 * that answer under a question the student never saw. So the draw is seeded by
 * the student and the UTC date — a different pair each day, the same pair all
 * day, and a different pair for each student on the same day.
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

/** `YYYY-MM-DD` in UTC — the day a draw is stable for. */
export function journalDay(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/**
 * The seed behind a student's journal topics for a day — shared so that
 * write-it-out can tell which two prompts the home is showing and avoid them.
 */
export function journalTopicSeed(userId: string, now: Date): string {
  return `${userId}|${journalDay(now)}`
}

/**
 * Draw `count` distinct prompts, deterministic in `seed`.
 *
 * Sorts by id first so the draw does not depend on the order the gateway
 * happened to list the catalogue in.
 */
export function pickPrompts<T extends { id: string }>(prompts: readonly T[], seed: string, count: number): T[] {
  const pool = [...prompts].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const next = rng(hash(seed))
  // Partial Fisher–Yates: only the first `count` slots need settling.
  const n = Math.min(count, pool.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(next() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
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

/**
 * One prompt the student has not answered yet — the write-it-out question, and
 * the all-about-you question (any catalogue row with an `id`).
 *
 * - **Never a repeat while there is anything left.** `answeredIds` is every
 *   catalogue question this student has a recorded answer to, wherever it was
 *   answered (write-it-out or a journal topic).
 * - **Not one of today's journal topics, if it can help it.** The home shows two
 *   prompts; offering the same one here reads as the app having run out.
 * - **Stable until answered.** Seeded like the topics, so a reload or a trip
 *   back to Today shows the same question; answering it takes it out of the
 *   pool, and the next visit draws a new one.
 *
 * Once everything has been answered the whole catalogue is fair game again —
 * a repeat beats an empty screen. Returns `null` only for an empty catalogue.
 */
export function pickUnanswered<T extends { id: string }>(
  prompts: readonly T[],
  answeredIds: ReadonlySet<string>,
  avoidIds: ReadonlySet<string>,
  seed: string,
): T | null {
  const fresh = prompts.filter((p) => !answeredIds.has(p.id))
  const preferred = fresh.filter((p) => !avoidIds.has(p.id))
  const pool = preferred.length > 0 ? preferred : fresh.length > 0 ? fresh : prompts
  return pickPrompts(pool, seed, 1)[0] ?? null
}
