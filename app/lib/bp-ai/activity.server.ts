/**
 * What the student did, by local day: the reads behind journey, recap and the
 * day summary.
 *
 * ```graphql
 * studentActivity(from: String!, to: String!, timeZone: String): StudentActivity!   # @auth USER
 * ```
 *
 * All three screens used to be demo copy — "Feelings named 32", a recap for
 * "May 2026" quoting a sentence nobody wrote, three invented past days in the
 * summary. They cannot be assembled in the browser either: `listMoodHistory`
 * and `listWinGratitudes` page by a UUIDv4 `_id`, so "the last seven days" is
 * not a page of anything. The gateway groups by the student's LOCAL day and
 * returns every day of the range, empty ones included, so no screen fills gaps.
 *
 * Always the caller: journals and raw moods are self-only (step-22), so there
 * is no user argument to get wrong.
 *
 * **Nothing is invented.** A day with no check-in has no emotions — the old
 * summary drew HAPPY for it — and a stat with no data is 0.
 */

import type { SectionKey, SummaryDay } from '~/components/dashboard/student/summary/summary-data'
import { moodChipsFor } from '~/components/dashboard/student/today/today-data'
import { addDays, zonedMidnight } from '~/lib/student/time-zone'
import { tileArtKey } from '~/lib/student/tile-art'

import { graphql } from './client.server'
import { gql } from './gql'
import type { SummaryActivityQuery } from './gql/graphql'
import { bpCheckinCatalogue } from './moods.server'
import type { GqlResult } from './types'

/** `2026-10-14` → `14.10.26`, the prototype's date label. */
export function shortDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y.slice(2)}`
}

/** `2026-10-14` → `October 2026`. Formatted at noon UTC so no zone can move it a day. */
export function monthLabel(date: string): string {
  return new Date(`${date.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

function monthEnd(date: string): string {
  return addDays(addDays(monthStart(date), 32).slice(0, 7) + '-01', -1)
}

// ── Journey ───────────────────────────────────────────────────────────────────

const JOURNEY = gql(`query JourneyActivity($from: String!, $to: String!, $timeZone: String, $fromInstant: String, $toInstant: String) {
  studentActivity(from: $from, to: $to, timeZone: $timeZone) {
    days { date moodHistories { id } }
    totals { checkinDays moodsNamed lessonsCompleted lessonsByCategory { category count } sparksEarned }
  }
  moodCounts(from: $fromInstant, to: $toInstant) { counts { label count } }
  listContentCategories { key title }
  listMilestones { id title }
  listUserMilestones { milestone achieved_at }
}`)

/** The check-in grid has twenty cells (5 × 4, `journey.html:1207-1225`). */
export const CHECKIN_CELLS = 20

export interface JourneyData {
  feelings: number
  checkins: number
  sparks: number
  activities: number
  /** Moods named this month, most-named first. */
  moods: Array<{ name: string; count: number }>
  /** The last {@link CHECKIN_CELLS} days of the month so far, oldest first; earlier padding is `false`. */
  checkinDays: boolean[]
  /** Lessons completed this month by category, most first, titled from the catalogue. */
  activityByCategory: Array<{ name: string; count: number }>
  /** Milestones reached, newest first. */
  milestones: Array<{ title: string; date: string }>
}

export const EMPTY_JOURNEY: JourneyData = {
  feelings: 0,
  checkins: 0,
  sparks: 0,
  activities: 0,
  moods: [],
  checkinDays: Array(CHECKIN_CELLS).fill(false),
  activityByCategory: [],
  milestones: [],
}

/** "This month" so far, in the student's zone. */
export async function bpJourney(
  accessToken: string,
  today: string,
  timeZone: string | undefined,
): Promise<GqlResult<JourneyData>> {
  const from = monthStart(today)
  const result = await graphql(
    JOURNEY,
    {
      from,
      to: today,
      timeZone,
      fromInstant: zonedMidnight(from, timeZone),
      toInstant: zonedMidnight(addDays(today, 1), timeZone),
    },
    { accessToken },
  )
  if (!result.ok) return result
  const d = result.data
  const { totals } = d.studentActivity

  const done = d.studentActivity.days.map((day) => day.moodHistories.length > 0).slice(-CHECKIN_CELLS)
  const titles = new Map(d.listContentCategories.map((c) => [c.key, c.title]))
  const milestoneTitles = new Map(d.listMilestones.map((m) => [m.id, m.title]))

  return {
    ok: true,
    data: {
      feelings: totals.moodsNamed,
      checkins: totals.checkinDays,
      sparks: totals.sparksEarned,
      activities: totals.lessonsCompleted,
      moods: d.moodCounts.counts
        .filter((c) => c.label && c.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((c) => ({ name: c.label, count: c.count })),
      checkinDays: [...Array(CHECKIN_CELLS - done.length).fill(false), ...done],
      activityByCategory: totals.lessonsByCategory
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
        // A lesson filed under a key the catalogue does not have still counts;
        // it is named by its key rather than dropped.
        .map((c) => ({ name: titles.get(c.category) ?? c.category, count: c.count })),
      milestones: [...d.listUserMilestones]
        .sort((a, b) => b.achieved_at.localeCompare(a.achieved_at))
        .flatMap((m) => {
          const title = milestoneTitles.get(m.milestone)
          if (!title) return []
          const day = new Date(m.achieved_at).toLocaleDateString('en-CA', { timeZone: timeZone ?? 'UTC' })
          return [{ title, date: day === today ? 'Today' : shortDate(day) }]
        }),
    },
  }
}

// ── Recap ─────────────────────────────────────────────────────────────────────

const RECAP = gql(`query RecapActivity($from: String!, $to: String!, $timeZone: String) {
  studentActivity(from: $from, to: $to, timeZone: $timeZone) {
    totals { moodsNamed journals lessonsViewed lessonsCompleted }
  }
}`)

export interface RecapData {
  month: string
  moodsNamed: number
  journals: number
  lessonsViewed: number
  lessonsCompleted: number
}

/** The month `today` falls in, whole: the days still ahead are simply empty. */
export async function bpRecap(
  accessToken: string,
  today: string,
  timeZone: string | undefined,
): Promise<GqlResult<RecapData>> {
  const result = await graphql(RECAP, { from: monthStart(today), to: monthEnd(today), timeZone }, { accessToken })
  if (!result.ok) return result
  const t = result.data.studentActivity.totals
  return {
    ok: true,
    data: {
      month: monthLabel(today),
      moodsNamed: t.moodsNamed,
      journals: t.journals,
      lessonsViewed: t.lessonsViewed,
      lessonsCompleted: t.lessonsCompleted,
    },
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

const SUMMARY = gql(`query SummaryActivity($from: String!, $to: String!, $timeZone: String) {
  studentActivity(from: $from, to: $to, timeZone: $timeZone) {
    days {
      date
      moodHistories { id moods { id } created_at }
      journals { content created_at }
      wins { title description created_at }
      miniSurveys { moodHistory responses { question answer option_ids } created_at }
    }
  }
}`)

/** How many days the summary carousel walks back, today included. */
export const SUMMARY_DAYS = 7

type ActivityDay = SummaryActivityQuery['studentActivity']['days'][number]

function newest<T extends { created_at: string }>(rows: readonly T[]): T | undefined {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}

/** An answer drawn as the about card's emoji: one with no letters in it. */
function emojiAnswer(answer: string): string {
  const a = answer.trim()
  return a && !/\p{L}/u.test(a) ? a : ''
}

/**
 * One day of the carousel, from what the server recorded on it.
 *
 * `moods` maps a mood id to its tile's art key (`happy`, `anxious`, …) and its
 * catalogue `chips`. A mood it does not know — deleted from the catalogue
 * since — has no art and no chips, and is left out rather than drawn as
 * somebody else's.
 *
 * A section is listed in `sections` only when the day holds something for it;
 * that is what "done" meant on the hub, and the summary shows today's done
 * sections only.
 */
export function summaryDay(day: ActivityDay, label: string, moods: ReadonlyMap<string, MoodRef>): SummaryDay {
  const check = newest(day.moodHistories)
  const picked = (check?.moods ?? []).flatMap((m) => moods.get(m.id) ?? [])
  const emotions = picked.map(({ art }) => ({ name: art.toUpperCase(), img: `emotion-${art}.svg` }))
  const chips = moodChipsFor(picked.map((m) => m.chips))
  const reasons = check
    ? day.miniSurveys
        .filter((s) => s.moodHistory === check.id)
        .flatMap((s) => s.responses.filter((r) => r.option_ids.length > 0).flatMap((r) => r.answer.split(', ')))
    : []

  const journal = newest(day.journals)
  const win = newest(day.wins)
  const about = newest(day.miniSurveys.filter((s) => !s.moodHistory))
  const aboutAnswer = about?.responses[0]

  const sections: SectionKey[] = []
  if (emotions.length > 0) sections.push('mood')
  if (journal) sections.push('write')
  if (aboutAnswer) sections.push('about')
  if (win) sections.push('wins')

  return {
    label,
    sections,
    mood: { emotions, reasons, chips },
    ...(win ? { wins: { question: win.title, answer: win.description ?? '' } } : {}),
    ...(journal ? { write: { text: journal.content } } : {}),
    ...(aboutAnswer ? { about: { question: aboutAnswer.question, emoji: emojiAnswer(aboutAnswer.answer) } } : {}),
  }
}

/** What a recorded mood id resolves to in the check-in catalogue. */
export interface MoodRef {
  /** The tile's art key (`happy`, `anxious`, …). */
  art: string
  /** The mood row's `chips`. */
  chips: readonly string[]
}

/** The mood id → {@link MoodRef} join, from the check-in catalogue. One `listMoods`. */
export async function moodRefs(accessToken: string): Promise<Map<string, MoodRef>> {
  const catalogue = await bpCheckinCatalogue(accessToken)
  if (!catalogue.ok) {
    console.error(`[activity] listMoods failed (${catalogue.error.kind}): ${catalogue.error.message}`)
    return new Map()
  }
  return new Map(
    catalogue.data.flatMap((tile) =>
      tile.moods.map((m) => [m.id, { art: tileArtKey(tile.identifier), chips: m.chips }] as const),
    ),
  )
}

/** The mood id → tile art key join, from the check-in catalogue. */
export async function moodArtKeys(accessToken: string): Promise<Map<string, string>> {
  return new Map([...(await moodRefs(accessToken))].map(([id, ref]) => [id, ref.art]))
}

/** The last {@link SUMMARY_DAYS} local days, oldest first; the last one is labelled "Today". */
export async function bpSummaryDays(
  accessToken: string,
  today: string,
  timeZone: string | undefined,
): Promise<GqlResult<SummaryDay[]>> {
  const [result, moods] = await Promise.all([
    graphql(SUMMARY, { from: addDays(today, -(SUMMARY_DAYS - 1)), to: today, timeZone }, { accessToken }),
    moodRefs(accessToken),
  ])
  if (!result.ok) return result
  return {
    ok: true,
    data: result.data.studentActivity.days.map((day) =>
      summaryDay(day, day.date === today ? 'Today' : shortDate(day.date), moods),
    ),
  }
}
