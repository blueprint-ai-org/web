/**
 * Tests for `bpPasswordPolicy` — the gateway's password rules, cached in-process.
 *
 * Same harness as `journal.test.ts`: set env, stub `globalThis.fetch`, then
 * dynamic-import, so the real client is exercised.
 *
 * The request count IS the behaviour here: `/graphql` is rate limited at
 * 50/hour, so a policy re-read per page view would eat the budget.
 *
 * One test, because the cache is module state and its lifecycle is the point:
 * a failure must not stick, a success must.
 *
 * Run: npx tsx --test app/lib/bp-ai/password-policy.test.ts
 */

import { it, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type PolicyModule = typeof import('./password-policy.server.ts')
let bpPasswordPolicy: PolicyModule['bpPasswordPolicy']

before(async () => {
  bpPasswordPolicy = ((await import('./password-policy.server.ts')) as PolicyModule).bpPasswordPolicy
})

const originalFetch = globalThis.fetch
let requests = 0
function respondWith(body: unknown): void {
  globalThis.fetch = (async () => {
    requests++
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof globalThis.fetch
}
after(() => {
  globalThis.fetch = originalFetch
})

it('returns null on a failure and asks again next time; once read, never asks again', async () => {
  respondWith({ data: null, errors: [{ message: 'down', extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
  assert.equal(await bpPasswordPolicy(), null)

  respondWith({ data: { passwordPolicy: { minLength: 10, maxBytes: 24 } } })
  assert.deepEqual(await bpPasswordPolicy(), { minLength: 10, maxBytes: 24 })
  assert.equal(requests, 2, 'the failure must not have been cached')

  respondWith({ data: { passwordPolicy: { minLength: 99, maxBytes: 99 } } })
  assert.deepEqual(await bpPasswordPolicy(), { minLength: 10, maxBytes: 24 })
  assert.equal(requests, 2, 'a read policy is served from memory')
})
