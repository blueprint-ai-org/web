/**
 * Tests for `bpCreateJournal` and `bpJournaledPromptIds` — the journal write
 * that reaches the analysis, and the read that stops a prompt coming back.
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
let bpJournaledPromptIds: JournalModule['bpJournaledPromptIds']

before(async () => {
  const mod = (await import('./journal.server.ts')) as JournalModule
  bpCreateJournal = mod.bpCreateJournal
  bpJournaledPromptIds = mod.bpJournaledPromptIds
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

describe('bpJournaledPromptIds', () => {
  it('collects question_ids across entries and pages', async () => {
    const pages = [
      { journals: [{ question_ids: ['a'] }, { question_ids: ['b', 'c'] }], next_page_token: 'p2' },
      { journals: [{ question_ids: ['c', 'd'] }], next_page_token: '' },
    ]
    stub((call) => json({ data: { listJournals: pages[bodyOf(call).variables.pageToken ? 1 : 0] } }))

    const result = await bpJournaledPromptIds(TOKEN, USER_ID)
    assert.equal(result.ok, true)
    assert.ok(result.ok)
    assert.deepEqual([...result.data].sort(), ['a', 'b', 'c', 'd'])
    assert.equal(calls.length, 2)
    assert.equal(bodyOf(calls[1]).variables.pageToken, 'p2')
  })

  it('asks for a page of 100, which is the server-side ceiling', async () => {
    // `listMiniSurveys` takes 500, so 500 is the number a reader of the
    // sibling function would copy. activity-ingestor caps journals at 100
    // (`MaxPageSize`) and a larger ask is refused, not clamped.
    stub(() => json({ data: { listJournals: { journals: [], next_page_token: '' } } }))
    await bpJournaledPromptIds(TOKEN, USER_ID)

    assert.equal(bodyOf(calls[0]).variables.pageSize, 100)
  })

  it('stops after ten pages so a token that never runs out cannot hang a loader', async () => {
    stub(() => json({ data: { listJournals: { journals: [{ question_ids: ['a'] }], next_page_token: 'always' } } }))

    const result = await bpJournaledPromptIds(TOKEN, USER_ID)
    assert.equal(result.ok, true)
    assert.equal(calls.length, 10)
  })

  it('propagates a read failure rather than reporting an empty set', async () => {
    // An empty set reads as "nothing answered yet", which would re-offer every
    // prompt the student has already written about. The caller logs the failure
    // and falls back on purpose; it must not be handed a silent lie.
    stub(() => json({ data: null, errors: [{ message: 'UNAUTHORIZED: Authentication required' }] }))

    const result = await bpJournaledPromptIds(TOKEN, USER_ID)
    assert.equal(result.ok, false)
  })
})
