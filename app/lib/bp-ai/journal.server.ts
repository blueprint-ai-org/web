/**
 * Journal prompts, read from the tenant's BP AI question catalogue.
 *
 * The `journal` category holds the prompts — 167 in Blueprint Media, seeded on
 * 2026-10-05 from the MH Content Tagging Tracker's "Journal Prompt" rows. Every
 * one is an `OPEN` question: a label and nothing else, answered in free text.
 *
 * Unlike an onboarding screen, the journal does not want ONE question by key;
 * it wants the whole active set, so the route can draw from it
 * (`~/lib/student/journal-prompts`) and the prompt route can open any one of
 * them by id. One `listQuestions` call returns all of it — and with
 * `unansweredBy`, only the ones this student has not answered yet.
 *
 * Student-readable — `listQuestions` answers a student's own token (measured
 * 2026-09-24, see `questions.server.ts`).
 */

import type { JournalPrompt } from '~/lib/student/journal-prompts'

import { graphql } from './client.server'
import { bpQuestions, QuestionType } from './questions.server'
import type { GqlResult } from './types'

export const JOURNAL_CATEGORY = 'journal'

/**
 * Every active `OPEN` prompt in the `journal` category, in catalogue order.
 *
 * It goes through `bpQuestions` since step-9, so the three filters it used to
 * apply after the fact are the server's: `status: ACTIVE` (an archived prompt
 * must not be drawn), `type: OPEN` (the journal writes free text, and the
 * gateway refuses a text answer to a question that expects options), and —
 * where the caller asks for it — `unansweredBy`.
 */
export async function bpJournalPrompts(
  accessToken: string,
  opts: { unansweredBy?: string } = {},
): Promise<GqlResult<JournalPrompt[]>> {
  const result = await bpQuestions(accessToken, {
    category: JOURNAL_CATEGORY,
    type: QuestionType.Open,
    ...(opts.unansweredBy ? { unansweredBy: opts.unansweredBy } : {}),
    // A ceiling, not a guess: 167 rows today, and a category that outgrew 500
    // would want paging and a recommendation, not a bigger page.
    pageSize: 500,
  })
  if (!result.ok) return result

  return { ok: true, data: result.data.map((q) => ({ id: q.id, label: q.label })) }
}

// Two paged readers of the student's own answers lived here, and they were
// the most expensive reads in the student app: one paged every mini-survey of
// the user (500 at a time, up to ten pages) and the other every journal entry
// (100 at a time, up to ten), so the screen could subtract ~170 answered ids
// from a 167-row catalogue IN THE BROWSER's loader.
//
// `listQuestions(unansweredBy:)` does it in the query, over both collections
// (step-9). What is left on this side is the DAILY CHOICE — which of the
// unanswered prompts today's is — because that is a product rule about
// determinism and not a filter; `todaysQuestion` takes it over in step-30.

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
  // `questionId` is optional for a note no catalogue prompt backs (the grades
  // journal): an empty id would be refused by `validatePrompts`.
  entry: { questionId?: string; prompt: string; note: string; tags?: string[] },
): Promise<GqlResult<{ id: string }>> {
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

  return { ok: true, data: { id } }
}
