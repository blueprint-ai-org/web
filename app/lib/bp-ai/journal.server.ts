/**
 * Journal prompts, read from the tenant's BP AI question catalogue.
 *
 * The `journal` category holds the prompts — 167 in Blueprint Media, seeded on
 * 2026-10-05 from the MH Content Tagging Tracker's "Journal Prompt" rows. Every
 * one is an `OPEN` question: a label and nothing else, answered in free text.
 *
 * Unlike an onboarding screen, the journal does not want *a* question at a
 * fixed `(category, order)`; it wants the whole active set, so the route can
 * draw from it (`~/lib/student/journal-prompts`) and the prompt route can open
 * any one of them by id. One `listQuestions` call returns all of it.
 *
 * Student-readable — `listQuestions` answers a student's own token (measured
 * 2026-09-24, see `questions.server.ts`).
 */

import type { JournalPrompt } from '~/lib/student/journal-prompts'

import { graphql } from './client.server'
import type { GqlResult } from './types'

export const JOURNAL_CATEGORY = 'journal'

const LIST_JOURNAL = `query ListJournalPrompts($category: String!, $pageSize: Int) {
  listQuestions(category: $category, pageSize: $pageSize) {
    questions { id label type order status }
  }
}`

/**
 * Every active `OPEN` prompt in the `journal` category, in catalogue order.
 *
 * `status` is a free string, so anything not explicitly `active` is dropped —
 * a value nobody has seen yet fails closed, the same rule `questions.server.ts`
 * applies. A non-`OPEN` row is dropped too: the journal writes free text, and
 * the gateway refuses a text answer to a question that expects options.
 */
export async function bpJournalPrompts(accessToken: string): Promise<GqlResult<JournalPrompt[]>> {
  const result = await graphql<Record<string, unknown>>(
    LIST_JOURNAL,
    // The page size is a ceiling, not a guess: 167 rows today, and a category
    // that outgrew 500 would want paging and a recommendation, not a bigger page.
    { category: JOURNAL_CATEGORY, pageSize: 500 },
    { accessToken },
  )
  if (!result.ok) return result

  const payload = result.data.listQuestions
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).questions)
      ? ((payload as Record<string, unknown>).questions as unknown[])
      : []

  const prompts: { id: string; label: string; order: number }[] = []
  rows.forEach((value, index) => {
    if (value === null || typeof value !== 'object') return
    const row = value as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const label = typeof row.label === 'string' ? row.label.trim() : ''
    const status = typeof row.status === 'string' ? row.status : 'active'
    if (!id || !label || status !== 'active' || row.type !== 'OPEN') return
    prompts.push({ id, label, order: typeof row.order === 'number' ? row.order : index + 1 })
  })
  prompts.sort((a, b) => a.order - b.order)

  return { ok: true, data: prompts.map(({ id, label }) => ({ id, label })) }
}

const LIST_MY_ANSWERS = `query ListMyAnsweredQuestions($user: String, $pageSize: Int, $pageToken: String) {
  listMiniSurveys(user: $user, page_size: $pageSize, page_token: $pageToken) {
    mini_surveys { responses { question_id } }
    next_page_token
  }
}`

/**
 * Every question id this student has a recorded answer to, in any survey.
 *
 * Read across all survey types rather than just `journal`: the caller filters
 * by the journal catalogue's own ids, and a prompt answered from a topic circle
 * counts as answered on write-it-out too.
 *
 * Pages through `next_page_token`. One survey per answered question, so a
 * student who has worked through the journal holds ~170 rows — more than one
 * default page. Capped at ten pages so a token that never runs out cannot hang
 * a loader.
 */
export async function bpAnsweredQuestionIds(
  accessToken: string,
  userId: string,
): Promise<GqlResult<Set<string>>> {
  const ids = new Set<string>()
  let pageToken: string | null = null
  for (let page = 0; page < 10; page++) {
    const result: GqlResult<Record<string, unknown>> = await graphql<Record<string, unknown>>(
      LIST_MY_ANSWERS,
      { user: userId, pageSize: 500, pageToken },
      { accessToken },
    )
    if (!result.ok) return result

    const payload = result.data.listMiniSurveys as Record<string, unknown> | null
    const surveys = Array.isArray(payload?.mini_surveys) ? (payload.mini_surveys as unknown[]) : []
    for (const survey of surveys) {
      const responses = (survey as Record<string, unknown> | null)?.responses
      if (!Array.isArray(responses)) continue
      for (const response of responses) {
        const id = (response as Record<string, unknown> | null)?.question_id
        if (typeof id === 'string' && id) ids.add(id)
      }
    }

    const next = payload?.next_page_token
    if (typeof next !== 'string' || !next) break
    pageToken = next
  }
  return { ok: true, data: ids }
}

const CREATE_JOURNAL = `mutation CreateJournal($input: CreateJournalInput!) {
  createJournal(input: $input) { id question_ids }
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
 * No `mood` yet — the check-in mood is not wired into the journal (step-24).
 */
export async function bpCreateJournal(
  accessToken: string,
  userId: string,
  entry: { questionId: string; prompt: string; note: string },
): Promise<GqlResult<{ id: string }>> {
  const result = await graphql<Record<string, unknown>>(
    CREATE_JOURNAL,
    {
      input: {
        user: userId,
        title: entry.prompt,
        content: entry.note,
        question_ids: [entry.questionId],
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

  return { ok: true, data: { id } }
}

const LIST_MY_JOURNALS = `query ListMyJournaledPrompts($user: String, $pageSize: Int, $pageToken: String) {
  listJournals(user: $user, page_size: $pageSize, page_token: $pageToken) {
    journals { question_ids }
    next_page_token
  }
}`

/**
 * Every prompt id this student has written a journal entry against.
 *
 * The companion to {@link bpAnsweredQuestionIds}, which still has to be read
 * alongside it: journal notes written before the switch to `createJournal`
 * live as `journal` mini-surveys, and dropping that read would re-offer a
 * prompt the student already answered.
 *
 * `page_size` is capped at 100 server-side (`MaxPageSize`), not 500 like
 * `listMiniSurveys`. Ten pages is the same ceiling as the mini-survey read —
 * a token that never runs out must not hang a loader — so this sees the
 * thousand most recent entries, newest first (`createdAt desc`).
 */
export async function bpJournaledPromptIds(
  accessToken: string,
  userId: string,
): Promise<GqlResult<Set<string>>> {
  const ids = new Set<string>()
  let pageToken: string | null = null
  for (let page = 0; page < 10; page++) {
    const result: GqlResult<Record<string, unknown>> = await graphql<Record<string, unknown>>(
      LIST_MY_JOURNALS,
      { user: userId, pageSize: 100, pageToken },
      { accessToken },
    )
    if (!result.ok) return result

    const payload = result.data.listJournals as Record<string, unknown> | null
    const journals = Array.isArray(payload?.journals) ? (payload.journals as unknown[]) : []
    for (const journal of journals) {
      const questionIds = (journal as Record<string, unknown> | null)?.question_ids
      if (!Array.isArray(questionIds)) continue
      for (const id of questionIds) {
        if (typeof id === 'string' && id) ids.add(id)
      }
    }

    const next = payload?.next_page_token
    if (typeof next !== 'string' || !next) break
    pageToken = next
  }
  return { ok: true, data: ids }
}
