/**
 * Tests for `bpCreateJournal` and `bpJournalPrompts` — the journal write that
 * reaches the analysis, and the read that stops a prompt coming back.
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
let bpJournalPrompts: JournalModule['bpJournalPrompts']

before(async () => {
  const mod = (await import('./journal.server.ts')) as JournalModule
  bpCreateJournal = mod.bpCreateJournal
  bpJournalPrompts = mod.bpJournalPrompts
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

describe('bpJournalPrompts', () => {
  function listQuestions(questions: unknown[]): Response {
    return json({ data: { listQuestions: { questions } } })
  }

  it('asks the server for the unanswered ones instead of subtracting them here', async () => {
    // This is the whole point of step-9. The two readers that used to live in
    // this module paged every mini-survey AND every journal of the user to
    // subtract ~170 ids from a 167-row catalogue in the loader. One filter
    // replaces both, so the assertion is that it is SENT — a dropped
    // `unansweredBy` re-offers a prompt the student already wrote about, and
    // the screen cannot tell.
    stub(() => listQuestions([]))
    const result = await bpJournalPrompts(TOKEN, { unansweredBy: USER_ID })

    assert.equal(result.ok, true)
    assert.equal(calls.length, 1)
    const { query, variables } = bodyOf(calls[0])
    assert.equal(variables.unansweredBy, USER_ID)
    assert.equal(variables.category, 'journal')
    assert.equal(variables.type, 'OPEN')
    // `status: ACTIVE` is inline in the document, not a variable: an archived
    // prompt must never be drawable, so no caller gets to pass it.
    assert.match(query, /status:\s*ACTIVE/)
  })

  it('omits the filter when no user is given, rather than sending an empty one', async () => {
    // `unansweredBy: ""` is not "everybody's prompts" — activity-ingestor would
    // resolve it as a user id and answer nothing.
    stub(() => listQuestions([]))
    await bpJournalPrompts(TOKEN)

    assert.equal('unansweredBy' in bodyOf(calls[0]).variables, false)
  })

  it('returns id and label, which is all a prompt is', async () => {
    stub(() =>
      listQuestions([
        { id: 'q1', key: 'journal.proud', label: PROMPT, category: 'journal', type: 'OPEN', display: null, max_selections: 0, options: [] },
      ]),
    )

    const result = await bpJournalPrompts(TOKEN, { unansweredBy: USER_ID })
    assert.ok(result.ok)
    assert.deepEqual(result.data, [{ id: 'q1', label: PROMPT }])
  })

  it('propagates a read failure rather than reporting an empty catalogue', async () => {
    // An empty catalogue reads as "this tenant has no prompts", which the
    // screen renders as a dead end. The caller logs the failure and falls back
    // on purpose; it must not be handed a silent lie.
    stub(() => json({ data: null, errors: [{ message: 'UNAUTHORIZED: Authentication required' }] }))

    const result = await bpJournalPrompts(TOKEN, { unansweredBy: USER_ID })
    assert.equal(result.ok, false)
  })
})
