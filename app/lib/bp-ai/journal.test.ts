/**
 * Tests for `bpCreateJournal` and `bpJournalHome` — the journal write that
 * reaches the analysis, and the read that files notes under the student's day.
 *
 * Same harness as `profile.test.ts`: set env, stub `globalThis.fetch`, then
 * dynamic-import, so the real client and its error classification are
 * exercised rather than a fiction of them.
 *
 * Run: npx tsx --test app/lib/bp-ai/journal.test.ts
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT

type JournalModule = typeof import('./journal.server.ts')
let bpCreateJournal: JournalModule['bpCreateJournal']
let bpJournalHome: JournalModule['bpJournalHome']

before(async () => {
  const mod = (await import('./journal.server.ts')) as JournalModule
  bpCreateJournal = mod.bpCreateJournal
  bpJournalHome = mod.bpJournalHome
})

type Call = { url: string; init: RequestInit }
const originalFetch = globalThis.fetch
let calls: Call[] = []

function stub(respond: (call: Call) => Response | Promise<Response>): void {
  calls = []
  globalThis.fetch = (async (input: unknown, init?: unknown): Promise<Response> => {
    calls.push({ url: String(input), init: (init ?? {}) as RequestInit })
    return respond(calls[calls.length - 1])
  }) as unknown as typeof globalThis.fetch
}

beforeEach(() => {
  calls = []
})
after(() => {
  globalThis.fetch = originalFetch
})

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function bodyOf(call: Call): { query: string; variables: Record<string, unknown> } {
  return JSON.parse(String(call.init.body))
}

const USER_ID = '332a53ba-0000-4000-8000-00000000000a'
const TOKEN = 'student-access-token'
const PROMPT_ID = 'q-journal-41'
const PROMPT = 'What is something you are proud of this week?'
const NOTE = 'I finally asked for help in maths.'

describe('bpCreateJournal', () => {
  it('writes a Journal — never a mini-survey', async () => {
    // This is the whole point of the function. `createJournal` publishes
    // `journal-created`, the only topic `agent` subscribes to; a note stored
    // as a mini-survey is never analysed and never seen by the safety stack.
    stub(() => json({ data: { createJournal: { id: 'j-1', question_ids: [PROMPT_ID] } } }))
    const result = await bpCreateJournal(TOKEN, USER_ID, {
      questionId: PROMPT_ID,
      prompt: PROMPT,
      note: NOTE,
    })

    assert.equal(result.ok, true)
    assert.equal(calls.length, 1)
    const { query } = bodyOf(calls[0])
    assert.match(query, /createJournal/)
    assert.doesNotMatch(query, /MiniSurvey/i)
  })

  it('sends the prompt as the title, the note as the content, and links the prompt id', async () => {
    // `title` carries the prompt because a journal row without its question
    // has no subject when it reads back on its own; `question_ids` is the
    // structured link activity-ingestor validates against the catalogue.
    stub(() => json({ data: { createJournal: { id: 'j-1', question_ids: [PROMPT_ID] } } }))
    await bpCreateJournal(TOKEN, USER_ID, { questionId: PROMPT_ID, prompt: PROMPT, note: NOTE })

    assert.deepEqual(bodyOf(calls[0]).variables, {
      input: { user: USER_ID, title: PROMPT, content: NOTE, question_ids: [PROMPT_ID] },
    })
    const headers = new Headers(calls[0].init.headers as HeadersInit)
    assert.equal(headers.get('authorization'), `Bearer ${TOKEN}`)
  })

  it('reports a record with no id as a failure instead of claiming the note was saved', async () => {
    // A `{ saved: true }` on a write that did not happen is the one answer the
    // student must never get: the note lives in local storage and the screen
    // has already moved on, so nothing would ever retry it.
    for (const createJournal of [null, {}, { id: '' }]) {
      stub(() => json({ data: { createJournal } }))
      const result = await bpCreateJournal(TOKEN, USER_ID, {
        questionId: PROMPT_ID,
        prompt: PROMPT,
        note: NOTE,
      })
      assert.equal(result.ok, false, `payload ${JSON.stringify(createJournal)} must not read as saved`)
    }
  })
})

describe('bpCreateJournal sparksAwarded', () => {
  // 0 is "paid nothing" (daily cap, a repeat) and null is "unknown" (the
  // ledger failed). Neither may reach the student as a `+0`, or as anything.
  const cases: Array<[label: string, sparksAwarded: unknown, shown: number | null]> = [
    ['a payment', 10, 10],
    ['a write that paid nothing', 0, null],
    ['an unknown payment', null, null],
    ['an absent field', undefined, null],
  ]
  for (const [label, sparksAwarded, shown] of cases) {
    it(`shows ${shown ?? 'no figure'} for ${label}`, async () => {
      stub(() => json({ data: { createJournal: { id: 'j-1', question_ids: [], sparksAwarded } } }))
      const result = await bpCreateJournal(TOKEN, USER_ID, { prompt: PROMPT, note: NOTE })
      if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)
      assert.equal(result.data.sparksAwarded, shown)
    })
  }
})

describe('bpJournalHome', () => {
  // A note written at 23:00 in Mexico City is already the next day in UTC. The
  // notes column and "entries this month" are the student's day and month, not
  // London's — the bug the UTC-seeded draw this replaced had.
  const rows = [
    { id: 'j3', title: 'Prompt', content: 'tonight', question_ids: [], created_at: '2026-10-15T05:00:00Z' },
    { id: 'j2', title: 'Prompt', content: 'this morning', question_ids: ['q1'], created_at: '2026-10-14T15:00:00Z' },
    { id: 'j1', title: 'Prompt', content: 'last night', question_ids: [], created_at: '2026-10-14T05:00:00Z' },
    { id: 'j0', title: 'Prompt', content: 'last month', question_ids: [], created_at: '2026-10-01T05:00:00Z' },
  ]

  it("files each note under the student's local day and month", async () => {
    stub(() =>
      json({
        data: {
          dailyQuestions: [],
          listJournals: { journals: rows, next_page_token: '' },
          studentActivity: { days: [{ moodHistories: [] }] },
        },
      }),
    )
    const result = await bpJournalHome(TOKEN, USER_ID, '2026-10-14', 'America/Mexico_City')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)

    assert.deepEqual(
      result.data.today.map((e) => e.text),
      ['tonight', 'this morning'],
    )
    // j0 is 2026-09-30 23:00 local: September, not October.
    assert.deepEqual(result.data.counts, { thisMonth: 3, total: 4, more: false })
  })
})
