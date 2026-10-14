/**
 * Tests for `bpAnswerQuestion` — the one mutation that replaced the
 * read-then-create-or-update this module used to do.
 *
 * Same harness as `journal.test.ts`: set env, stub `globalThis.fetch`, then
 * dynamic-import, so the real client and its error classification are
 * exercised rather than a fiction of them.
 *
 * Run: npx tsx --test app/lib/bp-ai/answers.test.ts
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT

type AnswersModule = typeof import('./answers.server.ts')
let bpAnswerQuestion: AnswersModule['bpAnswerQuestion']

before(async () => {
  const mod = (await import('./answers.server.ts')) as AnswersModule
  bpAnswerQuestion = mod.bpAnswerQuestion
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

const TOKEN = 'student-access-token'
const USER = '332a53ba-0000-4000-8000-00000000000a'
const AT = '2026-10-13T20:45:00.000Z'

function answered(created: boolean): Response {
  return json({ data: { answerQuestion: { created, survey: { id: 'ms-1' } } } })
}

describe('bpAnswerQuestion', () => {
  it('writes once — no read to decide between create and update', async () => {
    // The read it replaces paged ONE page of 100 surveys, oldest first, so past
    // a hundred answers it never found the existing row and created a second.
    stub(() => answered(true))

    const result = await bpAnswerQuestion(TOKEN, USER, { questionId: 'q-1', optionIds: ['o-1'] }, AT)
    assert.equal(result.ok, true)
    assert.equal(calls.length, 1)

    const { query } = bodyOf(calls[0])
    assert.match(query, /answerQuestion/)
    assert.doesNotMatch(query, /listMiniSurveys|createMiniSurvey|updateMiniSurvey/)
  })

  it('sends only what the student chose', async () => {
    // Not the question's label, not the joined option labels, not the score and
    // not `survey_type`: four copies of the catalogue that lived in clients.
    stub(() => answered(true))
    await bpAnswerQuestion(TOKEN, USER, { questionId: 'q-1', optionIds: ['o-2', 'o-3'] }, AT)

    assert.deepEqual(bodyOf(calls[0]).variables, {
      input: { user: USER, questionId: 'q-1', optionIds: ['o-2', 'o-3'], completedAt: AT },
    })
    const headers = new Headers(calls[0].init.headers as HeadersInit)
    assert.equal(headers.get('authorization'), `Bearer ${TOKEN}`)
  })

  it('carries the free text for an open question, and no option ids', async () => {
    stub(() => answered(true))
    await bpAnswerQuestion(TOKEN, USER, { questionId: 'q-open', answer: 'Sunshine' }, AT)

    const input = bodyOf(calls[0]).variables.input as Record<string, unknown>
    assert.equal(input.answer, 'Sunshine')
    assert.equal('optionIds' in input, false)
  })

  it('reports a replaced answer as updated', async () => {
    // `created: false` is also what says no sparks were awarded for it.
    stub(() => answered(false))

    const result = await bpAnswerQuestion(TOKEN, USER, { questionId: 'q-1', optionIds: ['o-1'] }, AT)
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)
    assert.deepEqual(result.data, { id: 'ms-1', updated: true })
  })

  it('reports a first answer as not updated', async () => {
    stub(() => answered(true))

    const result = await bpAnswerQuestion(TOKEN, USER, { questionId: 'q-1', optionIds: ['o-1'] }, AT)
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)
    assert.deepEqual(result.data, { id: 'ms-1', updated: false })
  })

  it('reports a record with no id as a failure instead of claiming it was saved', async () => {
    // The screen has already moved on when this returns, and nothing retries,
    // so "saved" on a write that did not happen is the one answer a student
    // must never get.
    for (const survey of [null, {}, { id: '' }]) {
      stub(() => json({ data: { answerQuestion: { created: true, survey } } }))
      const result = await bpAnswerQuestion(TOKEN, USER, { questionId: 'q-1', optionIds: ['o-1'] }, AT)
      assert.equal(result.ok, false, `payload ${JSON.stringify(survey)} must not read as saved`)
    }
  })

  it('propagates a refusal rather than swallowing it', async () => {
    // Four options on a question capped at three, for instance: the gateway
    // refuses the whole answer and the caller logs it.
    stub(() => json({ data: null, errors: [{ message: 'BAD_REQUEST: too many options' }] }))

    const result = await bpAnswerQuestion(TOKEN, USER, { questionId: 'q-1', optionIds: ['a', 'b', 'c', 'd'] }, AT)
    assert.equal(result.ok, false)
  })
})
