/**
 * `/student/write-it-out` loader — which of today's journal prompts the
 * monster asks.
 *
 * The server draws the day's journal prompts in a fixed order, and the journal
 * home shows the first two as its topic circles. Write-it-out asks the third,
 * so the student is not offered a topic already on the home — which reads as
 * the app having run out. With nothing drawn (the ~167 prompts are not seeded
 * everywhere yet) it asks nothing rather than a line of its own.
 *
 * Same harness as `student._index.test.ts`: a real sealed `bp-session` and a
 * `fetch` stub.
 *
 * Run: npx tsx --test --test-force-exit app/routes/student.write-it-out.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { Role } from '../lib/bp-ai/gql/schema.ts'

process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-write-it-out-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type RouteModule = typeof import('./student.write-it-out.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let loader: RouteModule['loader']
let cookie: string

before(async () => {
  loader = ((await import('./student.write-it-out.tsx')) as RouteModule).loader
  const { sealBpSession } = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  cookie = `bp-session=${await sealBpSession({
    accessToken: 'access',
    refreshToken: 'refresh',
    userId: '332a53ba-0000-4000-8000-00000000000a',
    tenant: '2ecc258c-0000-4000-8000-00000000000b',
    accessTokenExpiresAt: Date.now() + 900_000,
    role: Role.Student,
    refreshExpiresAt: Date.now() + 30 * 24 * 3_600_000,
  })}`
})

const originalFetch = globalThis.fetch
after(() => {
  globalThis.fetch = originalFetch
})

function drawn(labels: string[]) {
  return labels.map((label, i) => ({
    id: `q${i}`,
    key: null,
    label,
    category: 'journal',
    type: 'OPEN',
    display: null,
    max_selections: 0,
    options: [],
  }))
}

async function promptFor(labels: string[]) {
  globalThis.fetch = (async () => Response.json({ data: { dailyQuestions: drawn(labels) } })) as unknown as typeof globalThis.fetch
  const request = new Request('https://example.test/student/write-it-out', { headers: { cookie } })
  const data = await loader({ request, params: {}, context: {} as never } as never)
  return data.prompt?.label ?? null
}

describe('/student/write-it-out loader', () => {
  it("asks the third of today's prompts — the two before it are the journal's topics", async () => {
    assert.equal(await promptFor(['home 1', 'home 2', 'mine']), 'mine')
  })

  it('asks the last one there is when fewer than three are left', async () => {
    assert.equal(await promptFor(['only']), 'only')
  })

  it('asks nothing when nothing was drawn', async () => {
    assert.equal(await promptFor([]), null)
  })
})
