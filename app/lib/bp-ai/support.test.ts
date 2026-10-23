/**
 * Tests for `bpRequestSupport` — the read that decides whether the support
 * done screen may say "someone at your school will be in touch".
 *
 * Same harness as `journal.test.ts`: set env, stub `globalThis.fetch`, then
 * dynamic-import, so the real client and its error classification run.
 *
 * Run: npx tsx --test app/lib/bp-ai/support.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type SupportModule = typeof import('./support.server.ts')
let bpRequestSupport: SupportModule['bpRequestSupport']

before(async () => {
  bpRequestSupport = ((await import('./support.server.ts')) as SupportModule).bpRequestSupport
})

const originalFetch = globalThis.fetch
after(() => {
  globalThis.fetch = originalFetch
})

function respondWith(body: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof globalThis.fetch
}

describe('bpRequestSupport', () => {
  // The screen chooses its copy from this flag, so it must never be upgraded:
  // false stays false, and an answer without the flag is an error the route
  // turns into delivered=false — not a "sent".
  it('passes delivered=false through and refuses an answer without the flag', async () => {
    respondWith({ data: { requestSupport: { requestId: 'r-1', delivered: false } } })
    assert.deepEqual(await bpRequestSupport('tok', 'help', 'r-1'), { ok: true, data: { delivered: false } })

    respondWith({ data: { requestSupport: { requestId: 'r-1' } } })
    const missing = await bpRequestSupport('tok', 'help', 'r-1')
    assert.equal(missing.ok, false)
  })
})
