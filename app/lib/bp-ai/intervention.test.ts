/**
 * Tests for the intervention client (plan 2026-10-21 step-14).
 *
 * Same harness as `support.test.ts`: set env, stub `globalThis.fetch`, then
 * dynamic-import, so the real client and its error classification run.
 *
 * What is pinned here:
 *  - the payload comes back in the gateway's own shape, LOCKDOWN included —
 *    `safetyMessage` and `crisisResources` are the whole crisis surface, and a
 *    mapper that dropped them would leave a child in a crisis frame with no
 *    number on it;
 *  - `success: false` from the FSM is `{ ok: false, kind: 'fsm' }` and does
 *    NOT throw — it is the guard working;
 *  - `continueSupport` does not transition, so it cannot be mistaken for one.
 *
 * Run: npx tsx --test --test-force-exit app/lib/bp-ai/intervention.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type Module = typeof import('./intervention.server.ts')
let mod: Module

before(async () => {
  mod = (await import('./intervention.server.ts')) as Module
})

const originalFetch = globalThis.fetch
after(() => {
  globalThis.fetch = originalFetch
})

/** Records what was asked for, and answers with `body`. */
function respondWith(body: unknown): { query: string; variables: Record<string, unknown> }[] {
  const sent: { query: string; variables: Record<string, unknown> }[] = []
  globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
    sent.push(JSON.parse(String(init.body)))
    return Response.json(body)
  }) as unknown as typeof globalThis.fetch
  return sent
}

const LOCKDOWN_PAYLOAD = {
  sessionId: 's-1',
  pathway: 'IMMEDIATE_SAFETY',
  supportBlocks: [{ type: 'VALIDATION', content: 'You are not alone.', order: 1 }],
  actionPayload: { tools: [] },
  uiMode: 'LOCKDOWN',
  requiresAcknowledgment: true,
  safetyMessage: 'Someone at your school has been told, and will reach out.',
  crisisResources: { hotline: '988', textLine: 'Text HOME to 741741' },
}

describe('bpStartIntervention', () => {
  it('opens the FSM session and keeps the LOCKDOWN crisis fields', async () => {
    const sent = respondWith({ data: { createInterventionSession: LOCKDOWN_PAYLOAD } })
    const result = await mod.bpStartIntervention('tok', 'student-a')

    assert.equal(result.ok, true)
    assert.ok(result.ok)
    assert.deepEqual(result.data, LOCKDOWN_PAYLOAD)
    // The MUTATION, not the `intervention(studentId:)` query: that query mints
    // a uuid nothing can be transitioned on. See the module header.
    assert.match(sent[0].query, /mutation CreateInterventionSession/)
    assert.deepEqual(sent[0].variables, { studentId: 'student-a' })
  })

  it('reports an unreachable gateway as a failure instead of throwing', async () => {
    respondWith({ errors: [{ message: 'notification is down', extensions: { code: 'UNAVAILABLE' } }] })
    const result = await mod.bpStartIntervention('tok', 'student-a')
    assert.equal(result.ok, false)
    assert.ok(!result.ok)
    assert.equal(result.error.kind, 'unreachable')
  })
})

describe('bpTransition', () => {
  it('asks for the state it was given', async () => {
    const sent = respondWith({ data: { transitionInterventionState: { success: true, error: null } } })
    assert.deepEqual(await mod.bpTransition('tok', 's-1', 'SUPPORT'), { ok: true, data: null })
    assert.deepEqual(sent[0].variables, { sessionId: 's-1', toState: 'SUPPORT' })
  })

  // The case this whole step exists for: since step-13 SUPPORT→ACTION is
  // refused until `continueSupport` ran. It must surface as a result.
  it('turns a refused guard into kind=fsm without throwing', async () => {
    respondWith({
      data: { transitionInterventionState: { success: false, error: 'support_screen_viewed is false' } },
    })
    const result = await mod.bpTransition('tok', 's-1', 'ACTION')
    assert.equal(result.ok, false)
    assert.ok(!result.ok)
    assert.equal(result.error.kind, 'fsm')
    assert.match(result.error.message, /support_screen_viewed/)
  })
})

describe('bpContinueSupport', () => {
  it('sends only the session id — it carries no target state', async () => {
    const sent = respondWith({ data: { continueSupport: { success: true, error: null } } })
    assert.deepEqual(await mod.bpContinueSupport('tok', 's-1'), { ok: true, data: null })
    assert.deepEqual(sent[0].variables, { sessionId: 's-1' })
    assert.doesNotMatch(sent[0].query, /toState|InterventionState/)
  })

  it('turns a replayed Continue into kind=fsm', async () => {
    respondWith({ data: { continueSupport: { success: false, error: 'session is not in SUPPORT' } } })
    const result = await mod.bpContinueSupport('tok', 's-1')
    assert.equal(result.ok, false)
    assert.ok(!result.ok)
    assert.equal(result.error.kind, 'fsm')
  })
})

describe('bpRecordOutcome', () => {
  it('passes the input through and reports success=false as a failure', async () => {
    const sent = respondWith({ data: { recordInterventionOutcome: { success: true, message: 'ok' } } })
    const input = {
      sessionId: 's-1',
      studentId: 'student-a',
      toolId: 'tool-1',
      moodDelta: 0,
      engagementRecovery: 0,
      toolReuseRate: 0,
      humanRating: 1,
    }
    assert.deepEqual(await mod.bpRecordOutcome('tok', input), { ok: true, data: null })
    assert.deepEqual(sent[0].variables, { input })

    respondWith({ data: { recordInterventionOutcome: { success: false, message: 'no such session' } } })
    const refused = await mod.bpRecordOutcome('tok', input)
    assert.equal(refused.ok, false)
  })
})
