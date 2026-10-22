/**
 * `POST /api/intervention` — the check-in's way into the intervention FSM
 * (plan 2026-10-21 step-14).
 *
 * Same harness as `api.mood-checkin.test.ts`: a real sealed `bp-session` and a
 * `fetch` stub, so the route and the real client run.
 *
 * The property under test is that this route **never fails the student**. A
 * child who just finished a check-in gets a 200 and `intervention: null` for
 * every failure, and the screen then goes to the Today hub exactly as it did
 * before any of this existed.
 *
 * Run: npx tsx --test --test-force-exit app/routes/api.intervention.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { Role } from '../lib/bp-ai/gql/schema.ts'

process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-intervention-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type RouteModule = typeof import('./api.intervention.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let action: RouteModule['action']
let cookie: string

before(async () => {
  action = ((await import('./api.intervention.tsx')) as RouteModule).action
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

const PAYLOAD = {
  sessionId: 's-1',
  pathway: 'ROUTINE',
  supportBlocks: [{ type: 'VALIDATION', content: 'Lots of students feel this way.', order: 1 }],
  actionPayload: { tools: [{ id: 'tool-1', name: 'Calming breath', description: 'Breathe', toolType: 'breathing' }] },
  uiMode: 'NORMAL',
  requiresAcknowledgment: false,
  safetyMessage: null,
  crisisResources: null,
}

/** Answers each operation in turn, in the order the route asks for them. */
function respondInOrder(bodies: unknown[]): string[] {
  const asked: string[] = []
  let i = 0
  globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
    const { query } = JSON.parse(String(init.body)) as { query: string }
    asked.push(/(?:mutation|query) (\w+)/.exec(query)?.[1] ?? query)
    return Response.json(bodies[Math.min(i++, bodies.length - 1)])
  }) as unknown as typeof globalThis.fetch
  return asked
}

function post(headers: Record<string, string> = {}): Promise<Response> {
  const request = new Request('https://example.test/api/intervention', { method: 'POST', headers })
  return action({ request, params: {}, context: {} as never } as never) as Promise<Response>
}

describe('POST /api/intervention', () => {
  it('opens the session and moves it to SUPPORT', async () => {
    const asked = respondInOrder([
      { data: { createInterventionSession: PAYLOAD } },
      { data: { transitionInterventionState: { success: true, error: null } } },
    ])

    const response = await post({ cookie })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true, intervention: PAYLOAD })
    assert.deepEqual(asked, ['CreateInterventionSession', 'TransitionIntervention'])
  })

  // Same answer as `api/mood-checkin`'s: a launch the gateway would not
  // exchange has no BP AI session, which is a state and not an error.
  it('answers 200 and no intervention without a session', async () => {
    respondInOrder([{ data: {} }])
    const response = await post()
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: false, reason: 'no-session', intervention: null })
  })

  it('answers 200 and no intervention when the backend is down', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED')
    }) as unknown as typeof globalThis.fetch

    const response = await post({ cookie })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: false, reason: 'unavailable', intervention: null })
  })

  // A session still in EXPRESSION cannot be driven — `continueSupport` answers
  // FAILED_PRECONDITION outside SUPPORT — so handing the front that payload
  // would strand the flow on the support screen.
  it('answers no intervention when EXPRESSION→SUPPORT is refused', async () => {
    respondInOrder([
      { data: { createInterventionSession: PAYLOAD } },
      { data: { transitionInterventionState: { success: false, error: 'bad transition' } } },
    ])

    const response = await post({ cookie })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: false, reason: 'fsm', intervention: null })
  })

  it('refuses a GET', async () => {
    const { loader } = (await import('./api.intervention.tsx')) as RouteModule
    const response = loader()
    assert.equal(response.status, 405)
  })
})
