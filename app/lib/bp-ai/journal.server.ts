/**
 * The student's journal: today's prompts, the notes already written, and the
 * write that reaches the analysis.
 *
 * The prompts used to be drawn HERE — the whole `journal` catalogue read on
 * every visit and shuffled with a hash seeded by the UTC day, so "today"
 * flipped at the wrong hour everywhere but London. `dailyJournalPrompts` draws
 * on the server, in the student's day, unanswered ones first. The notes used
 * to be `localStorage`; they are `listJournals` now, so a second device sees
 * them.
 *
 * Student-readable: both reads answer a student's own token, and journals are
 * self-only since step-22 (a teacher or admin cannot read them).
 */

import type { JournalPrompt } from '~/lib/student/journal-prompts'

import { graphql } from './client.server'
import { sparkReward } from './gamification.server'
import { gql } from './gql'
import type { GqlResult } from './types'

// ── Prompts ───────────────────────────────────────────────────────────────────

const DAILY_PROMPTS = gql(`query DailyJournalPrompts($date: String!, $count: Int) {
  dailyJournalPrompts(date: $date, count: $count) { id label }
}`)

/**
 * The student's prompts for one local day: stable for the day, unanswered
 * first. An empty list is a state (the tenant's catalogue is not seeded yet),
 * and the screen shows its empty state rather than a list of its own.
 */
export async function bpDailyJournalPrompts(
  accessToken: string,
  date: string,
  count: number,
): Promise<GqlResult<JournalPrompt[]>> {
  const result = await graphql(DAILY_PROMPTS, { date, count }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.dailyJournalPrompts.map(({ id, label }) => ({ id, label })) }
}

// ── Notes ─────────────────────────────────────────────────────────────────────

/** One saved journal entry, as the notes column and the archive draw it. */
export interface JournalEntry {
  id: string
  /** The prompt it answers, when it answers a catalogue one. */
  questionId: string | null
  /** The prompt as written on the entry (`title`). */
  prompt: string
  text: string
  /** `YYYY-MM-DD` in the student's zone. */
  day: string
  createdAt: string
}

/** What the archive figures are counted over. */
export interface JournalCounts {
  thisMonth: number
  total: number
  /** The page was full: `total` is a floor, drawn as `100+`. */
  more: boolean
}

type JournalRow = { id: string; title: string; content: string; question_ids: string[]; created_at: string }

/**
 * One page, newest first (activity-ingestor sorts `listJournals` by
 * `createdAt` desc). 100 is a ceiling, not a guess: the archive lists them all
 * and the figures say `100+` past it rather than paging the history.
 */
const PAGE = 100

function entries(rows: readonly JournalRow[], timeZone: string | undefined): JournalEntry[] {
  return rows.map((j) => ({
    id: j.id,
    questionId: j.question_ids[0] ?? null,
    prompt: j.title,
    text: j.content,
    day: new Date(j.created_at).toLocaleDateString('en-CA', { timeZone: timeZone ?? 'UTC' }),
    createdAt: j.created_at,
  }))
}

function counts(all: readonly JournalEntry[], today: string, more: boolean): JournalCounts {
  return { thisMonth: all.filter((e) => e.day.slice(0, 7) === today.slice(0, 7)).length, total: all.length, more }
}

const JOURNALS = gql(`query Journals($user: String, $pageSize: Int) {
  listJournals(user: $user, page_size: $pageSize) {
    journals { id title content question_ids created_at }
    next_page_token
  }
}`)

/** The archive: every entry on the first page, plus its figures. */
export async function bpJournalArchive(
  accessToken: string,
  userId: string,
  today: string,
  timeZone: string | undefined,
): Promise<GqlResult<{ entries: JournalEntry[]; counts: JournalCounts }>> {
  const result = await graphql(JOURNALS, { user: userId, pageSize: PAGE }, { accessToken })
  if (!result.ok) return result
  const all = entries(result.data.listJournals.journals, timeZone)
  return { ok: true, data: { entries: all, counts: counts(all, today, Boolean(result.data.listJournals.next_page_token)) } }
}

const JOURNAL_HOME = gql(`query JournalHome($user: String, $pageSize: Int, $date: String!, $timeZone: String) {
  dailyJournalPrompts(date: $date, count: 2) { id label }
  listJournals(user: $user, page_size: $pageSize) {
    journals { id title content question_ids created_at }
    next_page_token
  }
  studentActivity(from: $date, to: $date, timeZone: $timeZone) {
    days { moodHistories { moods { id } created_at } }
  }
}`)

export interface JournalHomeData {
  /** Today's two topics; empty when the catalogue has nothing to draw. */
  topics: JournalPrompt[]
  /** Today's entries, newest first. */
  today: JournalEntry[]
  counts: JournalCounts
  /** The moods of today's latest check-in, in pick order — what colours the circles. */
  moodIds: string[]
}

/** The journal home in one request: topics, notes and today's check-in. */
export async function bpJournalHome(
  accessToken: string,
  userId: string,
  date: string,
  timeZone: string | undefined,
): Promise<GqlResult<JournalHomeData>> {
  const result = await graphql(JOURNAL_HOME, { user: userId, pageSize: PAGE, date, timeZone }, { accessToken })
  if (!result.ok) return result
  const d = result.data
  const all = entries(d.listJournals.journals, timeZone)
  const checkins = d.studentActivity.days.flatMap((day) => day.moodHistories)
  const latest = [...checkins].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return {
    ok: true,
    data: {
      topics: d.dailyJournalPrompts.map(({ id, label }) => ({ id, label })),
      today: all.filter((e) => e.day === date),
      counts: counts(all, date, Boolean(d.listJournals.next_page_token)),
      moodIds: latest?.moods.map((m) => m.id) ?? [],
    },
  }
}

const CREATE_JOURNAL = `mutation CreateJournal($input: CreateJournalInput!) {
  createJournal(input: $input) { id question_ids sparksAwarded }
}`

/**
 * Save a student's free-text journal entry against the prompt it answers.
 *
 * **This is the only write that reaches the analysis.** `createJournal`
 * publishes `journal-created`, and `agent` subscribes to exactly that topic
 * (`journal-created.agent-analysis-sub`) to run the analysis and the mental
 * health safety stack over the text. A journal note recorded as a mini-survey
 * — which is what these two screens used to do — is stored and never looked
 * at by anything.
 *
 * `title` is the prompt and `content` is the note, which is also how the
 * entry reads back on its own: a journal row without its question has no
 * subject. `question_ids` is the structured link, and activity-ingestor
 * validates every id belongs to the `journal` category (`validatePrompts`), so
 * a prompt from another surface is refused rather than silently stored.
 *
 * `sparksAwarded` is what this write paid (`write` rule), or null for nothing
 * to show: 0 (daily cap) and unknown (the ledger failed) both read as "no
 * figure" — see `sparkReward`.
 */
export async function bpCreateJournal(
  accessToken: string,
  userId: string,
  // `questionId` is optional for a note no catalogue prompt backs (the grades
  // journal): an empty id would be refused by `validatePrompts`.
  entry: { questionId?: string; prompt: string; note: string; tags?: string[] },
): Promise<GqlResult<{ id: string; sparksAwarded: number | null }>> {
  const result = await graphql<Record<string, unknown>>(
    CREATE_JOURNAL,
    {
      input: {
        user: userId,
        title: entry.prompt,
        content: entry.note,
        ...(entry.questionId ? { question_ids: [entry.questionId] } : {}),
        ...(entry.tags ? { tags: entry.tags } : {}),
      },
    },
    { accessToken },
  )
  if (!result.ok) return result

  const journal = result.data.createJournal
  if (journal === null || typeof journal !== 'object') {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI createJournal returned no record.' } }
  }
  const id = (journal as Record<string, unknown>).id
  if (typeof id !== 'string' || !id) {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI createJournal returned a record with no id.' } }
  }

  const awarded = (journal as Record<string, unknown>).sparksAwarded
  return { ok: true, data: { id, sparksAwarded: sparkReward(typeof awarded === 'number' ? awarded : null) } }
}
