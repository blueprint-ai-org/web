/**
 * The codegen pipeline, tested where it can actually break.
 *
 * `node:test` under `tsx` — vitest is intentionally not installed in this repo.
 * Run: npx tsx --test app/lib/bp-ai/codegen.test.ts
 *
 * Two things here are worth a test and the rest is the compiler's job:
 *
 *  1. **A TypedDocumentString has to reach the wire as the document TEXT.**
 *     It extends `String`, so it is an object, and the one thing a caller
 *     cannot see is what the client actually put in the body. (`JSON.stringify`
 *     does unwrap a String object by itself — measured 2026-10-13 by deleting
 *     the `String()` call in `client.server.ts`, whose body came out
 *     byte-identical. So this is not guarding that call; it is pinning that an
 *     operation declared through `gql()` is the operation that gets sent.)
 *  2. **The schema output has to carry whole enums.** The `client` preset emits
 *     only what the documents reach, which is why `codegen.ts` has a second
 *     output. A UI label map keyed by an enum is what makes `tsc` fail when the
 *     backend adds a value; an empty or partial enum module silently gives that
 *     up.
 *
 * What is NOT tested: that the generated types match the schema. That is what
 * `npm run codegen:check` is for, and a test asserting it would just be a
 * second, worse copy of graphql-codegen.
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT

type ClientModule = typeof import('./client.server.ts')
let graphql: ClientModule['graphql']

before(async () => {
  graphql = (await import('./client.server.ts')).graphql
})

type Call = { url: string; init: RequestInit }
const calls: Call[] = []
const realFetch = globalThis.fetch

function stubFetch(body: unknown, status = 200): void {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

after(() => {
  globalThis.fetch = realFetch
})

function sentQuery(): unknown {
  const body = calls.at(-1)?.init.body
  assert.equal(typeof body, 'string', 'the request body must be a JSON string')
  return JSON.parse(body as string).query
}

describe('a generated document reaches the gateway as text', () => {
  it('sends the document source, not a serialised String object', async () => {
    calls.length = 0
    const { gql } = await import('./gql/index.ts')
    const doc = gql(`mutation Logout($refresh_token: String!) {
  logout(refresh_token: $refresh_token)
}`)
    stubFetch({ data: { logout: true } })

    const result = await graphql(doc, { refresh_token: 'r' })

    assert.equal(result.ok, true)
    const query = sentQuery()
    assert.equal(typeof query, 'string', 'query must be a string on the wire')
    // Byte-for-byte the generated document, fragments included. A substring
    // match would pass while the client sent a truncated or re-serialised
    // document, which is the shape of the failure worth catching.
    assert.equal(query, String(doc))
    assert.match(query as string, /mutation Logout\(\$refresh_token: String!\)/)
  })

  it('still accepts a plain string, so an unmigrated module keeps working', async () => {
    calls.length = 0
    stubFetch({ data: { ok: true } })

    await graphql<{ ok: boolean }>('query Ping { ok }', {})

    assert.equal(sentQuery(), 'query Ping { ok }')
  })
})

describe('the generated schema module carries whole enums', () => {
  it('emits every enum as a const map with at least one value', async () => {
    const schema = (await import('./gql/schema.ts')) as Record<string, unknown>
    const enums = Object.entries(schema).filter(
      ([, value]) =>
        typeof value === 'object' &&
        value !== null &&
        Object.values(value as Record<string, unknown>).every((v) => typeof v === 'string'),
    )

    assert.ok(enums.length > 0, 'no enum const maps were generated')
    for (const [name, value] of enums) {
      assert.ok(
        Object.keys(value as Record<string, string>).length > 0,
        `enum ${name} came out empty`,
      )
    }
  })

  it('carries an enum no operation in this repo selects', async () => {
    // TenantStatus belongs to the admin console's screens, not this app's.
    // It is here to prove the second output is schema-wide and not
    // document-driven — the property the admin console depends on.
    const { TenantStatus } = await import('./gql/schema.ts')
    assert.ok(Object.values(TenantStatus).includes('PROVISIONING'))
  })
})
