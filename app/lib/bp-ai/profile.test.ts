/**
 * Tests for `bpProfile` — the student's own profile read.
 *
 * Same harness as `client.test.ts`: set env, stub `globalThis.fetch`, then
 * dynamic-import, so the real client and its error classification are exercised
 * rather than a fiction of them.
 *
 * Run: npx tsx --test app/lib/bp-ai/profile.test.ts
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT

type ProfileModule = typeof import('./profile.server.ts')
let bpProfile: ProfileModule['bpProfile']

before(async () => {
  bpProfile = ((await import('./profile.server.ts')) as ProfileModule).bpProfile
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

const USER_ID = '332a53ba-0000-4000-8000-00000000000a'
const TOKEN = 'student-access-token'

describe('bpProfile', () => {
  it('sends the student’s own token and the id as a variable', async () => {
    stub(() => json({ data: { getUser: { display_name: 'Sergio EQ', first_name: 'Sergio', last_name: 'EQ' } } }))
    await bpProfile(TOKEN, USER_ID)

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, ENDPOINT)
    const headers = new Headers(calls[0].init.headers as HeadersInit)
    assert.equal(headers.get('authorization'), `Bearer ${TOKEN}`)
    const body = JSON.parse(String(calls[0].init.body))
    assert.deepEqual(body.variables, { id: USER_ID })
  })

  it('asks for names only — never email, grade or date of birth', async () => {
    // A loader that fetched a child's date of birth to render a greeting would
    // be collecting it for no reason, and it would land in the SSR payload of
    // every student page.
    stub(() => json({ data: { getUser: { display_name: 'X', first_name: null, last_name: null } } }))
    await bpProfile(TOKEN, USER_ID)
    const { query } = JSON.parse(String(calls[0].init.body))
    assert.match(query, /display_name first_name last_name/)
    for (const field of ['email', 'date_of_birth', 'grade']) {
      assert.doesNotMatch(query, new RegExp(field), `must not select ${field}`)
    }
  })

  it('returns the three names, trimmed', async () => {
    stub(() => json({ data: { getUser: { display_name: ' Sergio EQ ', first_name: 'Sergio', last_name: 'EQ' } } }))
    const result = await bpProfile(TOKEN, USER_ID)
    if (!result.ok) throw new Error('expected ok')
    assert.deepEqual(result.data, { displayName: 'Sergio EQ', firstName: 'Sergio', lastName: 'EQ' })
  })

  it('maps blank and null name fields to null', async () => {
    // Every one of the three is optional on `CreateTenantUserInput`, so an
    // admin who filled in only the required fields produces exactly this.
    stub(() => json({ data: { getUser: { display_name: null, first_name: '', last_name: '   ' } } }))
    const result = await bpProfile(TOKEN, USER_ID)
    if (!result.ok) throw new Error('expected ok')
    assert.deepEqual(result.data, { displayName: null, firstName: null, lastName: null })
  })

  it('reports a null record as a failure rather than an empty profile', async () => {
    stub(() => json({ data: { getUser: null } }))
    const result = await bpProfile(TOKEN, USER_ID)
    assert.equal(result.ok, false)
  })

  it('surfaces the FORBIDDEN another user’s id would produce', async () => {
    // Measured 2026-09-23 — the gateway's own words for a cross-user read.
    stub(() =>
      json({
        data: null,
        errors: [{ message: "access denied: cannot act on another user's data", extensions: { code: 'FORBIDDEN' } }],
      }),
    )
    const result = await bpProfile(TOKEN, 'somebody-else')
    assert.equal(result.ok, false)
  })

  it('reports a transport failure rather than throwing', async () => {
    stub(() => {
      throw new TypeError('fetch failed')
    })
    const result = await bpProfile(TOKEN, USER_ID)
    if (result.ok) throw new Error('expected a failure')
    assert.equal(result.error.kind, 'network')
  })
})
