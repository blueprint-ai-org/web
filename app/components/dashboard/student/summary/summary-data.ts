/**
 * Day-summary data model — ported from `summary.html`'s inline JS.
 *
 *  - {@link PAST_DAYS} — the three hardcoded demo days (`summary.html:375-414`).
 *    The prototype overwrites every past day's `sections` to all four
 *    (`:436`), so they are defined that way here.
 *  - {@link buildTodayData} — today's card, assembled from storage at runtime
 *    (`summary.html:417-433`): mood always present, other sections tracked via
 *    `bp_today_sections`.
 *  - {@link SECTION_ICONS} / {@link SECTION_TITLES} / {@link EDIT_SEGMENTS} /
 *    {@link SECTION_ORDER} — the asset + label + edit-link + grid-order maps
 *    (`summary.html:442-458`). `EDIT_URLS`' `.html` targets become
 *    mount-relative route segments.
 *
 * Mood overlay chip/reason maps are shared with the today hub
 * (`today-data.ts` — `MOOD_CHIPS`, `REASON_EMOJI`, `moodChipsFor`).
 */

import { studentStorage } from '~/lib/student/storage'

import { WINS_DEFAULT_QUESTION } from '../today/today-data'

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

// ── Demo past days (summary.html:375-414, sections normalised to all four) ────

export const PAST_DAYS: readonly SummaryDay[] = [
  {
    label: '19.05.26',
    sections: ['mood', 'write', 'about', 'wins'],
    mood: {
      emotions: [
        { name: 'ANXIOUS', img: 'emotion-anxious.svg' },
        { name: 'TIRED', img: 'emotion-tired.svg' },
      ],
      reasons: ['Exams', 'School life'],
    },
    wins: {
      question: "What's one thing you did today that you're proud of — even if it feels small?",
      answer: "I pushed through a task I'd been avoiding for days. It wasn't perfect but I actually did it.",
    },
  },
  {
    label: '22.05.26',
    sections: ['mood', 'write', 'about', 'wins'],
    mood: {
      emotions: [
        { name: 'HAPPY', img: 'emotion-happy.svg' },
        { name: 'OKAY', img: 'emotion-okay.svg' },
        { name: 'MEH', img: 'emotion-meh.svg' },
      ],
      reasons: ['Friends', 'Activities'],
    },
    wins: {
      question: "What's one small thing that happened today that made you smile — even briefly?",
      answer: "I noticed I was actually pretty focused this morning, which doesn't happen that often. It felt good.",
    },
    write: {
      text: 'Had a decent day overall. Felt more grounded than usual, which was refreshing. Still some low moments but nothing major.',
    },
    about: {
      question: "Pick the emoji that best captures how you've felt for most of this week.",
      emoji: '🙂',
    },
  },
  {
    label: '24.05.26',
    sections: ['mood', 'write', 'about', 'wins'],
    mood: {
      emotions: [
        { name: 'SAD', img: 'emotion-sad.svg' },
        { name: 'TIRED', img: 'emotion-tired.svg' },
      ],
      reasons: ['Home life', 'Hungry'],
    },
    write: {
      text: 'Today my mood was okay. Felt a bit low on energy and not very motivated at times, but nothing too overwhelming. There were small moments when I felt calm and a bit more present, which helped.',
    },
  },
]

// ── Today (built from storage, summary.html:417-433) ─────────────────────────

/** Assemble today's summary day from the `bp_*` storage model. Client-only. */
export function buildTodayData(): SummaryDay {
  const todaySections = studentStorage.getTodaySections() as SectionKey[]
  const savedEmotions = studentStorage.getMoodEmotions()
  const savedReasons = studentStorage.getMoodReasons()

  const todayEmotions: EmotionRef[] = savedEmotions.length
    ? savedEmotions.map((k) => ({ name: k.toUpperCase(), img: `emotion-${k}.svg` }))
    : [{ name: 'HAPPY', img: 'emotion-happy.svg' }]

  return {
    label: 'Today',
    sections: todaySections,
    mood: { emotions: todayEmotions, reasons: savedReasons },
    wins: {
      question: studentStorage.getWinsQuestion() || WINS_DEFAULT_QUESTION,
      answer: studentStorage.getWinsNote() || '',
    },
    write: { text: studentStorage.getWriteText('local') || '' },
    about: {
      question: studentStorage.getAboutQuestion() || '',
      emoji: studentStorage.getAboutEmoji() || '',
    },
  }
}

/** `[...PAST_DAYS, today]` — the carousel ordering (`ALL_DAYS`, `summary.html:438`). */
export function buildAllDays(): SummaryDay[] {
  return [...PAST_DAYS, buildTodayData()]
}
