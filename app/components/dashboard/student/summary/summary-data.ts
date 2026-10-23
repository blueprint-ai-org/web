/**
 * Day-summary data model — ported from `summary.html`'s inline JS.
 *
 * The days themselves are the server's since step-24: the route builds one
 * {@link SummaryDay} per local day from `studentActivity`
 * (`~/lib/bp-ai/activity.server`). The prototype's three invented past days and
 * today's local-storage card (which drew HAPPY when there was no check-in) are
 * gone. What is left here is the shape and the section maps:
 *
 *  - {@link SECTION_ICONS} / {@link SECTION_TITLES} / {@link EDIT_SEGMENTS} /
 *    {@link SECTION_ORDER} — the asset + label + edit-link + grid-order maps
 *    (`summary.html:442-458`). `EDIT_URLS`' `.html` targets become
 *    mount-relative route segments.
 *
 * Mood overlay chip rule and reason map are shared with the today hub
 * (`today-data.ts` — `moodChipsFor`, `REASON_EMOJI`); the chips themselves
 * are the catalogue's, joined by the route (`DayMood.chips`).
 */

export type SectionKey = 'mood' | 'wins' | 'write' | 'about'

export interface EmotionRef {
  /** Uppercase display name (`k.toUpperCase()`, `summary.html:421`). */
  readonly name: string
  /** Migrated emotion-blob asset (`emotion-<key>.svg`). */
  readonly img: string
}

export interface DayMood {
  readonly emotions: readonly EmotionRef[]
  readonly reasons?: readonly string[]
  /** The selected moods' catalogue `chips`, deduped, max 6 (`moodChipsFor`). */
  readonly chips: readonly string[]
}
export interface DayWins {
  readonly question: string
  readonly answer: string
}
export interface DayWrite {
  readonly text: string
}
export interface DayAbout {
  readonly question: string
  readonly emoji: string
}

export interface SummaryDay {
  readonly label: string
  readonly sections: readonly SectionKey[]
  readonly mood: DayMood
  readonly wins?: DayWins
  readonly write?: DayWrite
  readonly about?: DayAbout
}

// ── Section maps (summary.html:442-458) ──────────────────────────────────────

export const SECTION_ICONS: Record<SectionKey, string> = {
  mood: 'section-icon-mood.svg',
  wins: 'section-icon-wins.svg',
  write: 'section-icon-write.svg',
  about: 'section-icon-about.svg',
}

export const SECTION_TITLES: Record<SectionKey, string> = {
  mood: 'Mood',
  wins: 'Notice your wins',
  write: 'Write it out',
  about: 'All about you',
}

/** Edit deep-links (`EDIT_URLS`) as mount-relative route segments. */
export const EDIT_SEGMENTS: Partial<Record<SectionKey, string>> = {
  wins: 'notice-wins',
  write: 'write-it-out',
  about: 'all-about-you',
}

/** Grid order: Mood top-left, Write top-right, About bottom-left, Wins bottom-right. */
export const SECTION_ORDER: readonly SectionKey[] = ['mood', 'write', 'about', 'wins']
