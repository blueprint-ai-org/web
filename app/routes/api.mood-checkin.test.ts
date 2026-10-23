/**
 * `POST /api/mood-checkin` — what reaches the gateway for the night's sleep.
 *
 * Since step-29 the sleep stop becomes a `sleep_profile` server-side, from
 * `submitCheckIn.sleepOptionId`. The failure this guards is the old path
 * surviving beside the new one: the stop also sent as an answer, which the
 * gateway would store as a mini-survey too — the same night, twice.
 *
 * Same harness as `student._index.test.ts`: a real sealed `bp-session` and a
 * `fetch` stub, so the route, its payload parsing and the real client run.
 *
 * Run: npx tsx --test --test-force-exit app/routes/api.mood-checkin.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { Role } from '../lib/bp-ai/gql/schema.ts'

process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-mood-checkin-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type RouteModule = typeof import('./api.mood-checkin.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let action: RouteModule['action']
let cookie: string

before(async () => {
  action = ((await import('./api.mood-checkin.tsx')) as RouteModule).action
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

describe('POST /api/mood-checkin', () => {
  it('sends the sleep stop as sleepOptionId and not as an answer', async () => {
    const sent: Array<{ input: Record<string, unknown> }> = []
    globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
      sent.push(JSON.parse(String(init.body)).variables)
      return Response.json({ data: { submitCheckIn: { moodHistory: { id: 'mh-1', note: '' }, answers: [] } } })
    }) as unknown as typeof globalThis.fetch

    const request = new Request('https://example.test/api/mood-checkin', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        moods: [{ moodId: 'm-1' }],
        reasons: { questionId: 'q-reasons', optionIds: ['o-friends'] },
        sleep: { optionId: 'o-sleep-5' },
      }),
    })
    const response = (await action({ request, params: {}, context: {} as never } as never)) as Response
    assert.deepEqual(await response.json(), { ok: true, saved: true, answers: 0 })

    assert.equal(sent.length, 1)
    const { input } = sent[0]
    assert.equal(input.sleepOptionId, 'o-sleep-5')
    assert.deepEqual(input.answers, [{ questionId: 'q-reasons', optionIds: ['o-friends'] }])
  })
})
