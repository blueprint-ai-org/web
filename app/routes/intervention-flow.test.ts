/**
 * The student's whole intervention, in order (plan 2026-10-21 step-14).
 *
 * Drives the three REAL route actions the flow goes through — `/api/intervention`,
 * `/student/helpful-content` and `/student/session-feedback` — against one
 * stubbed gateway, and asserts the exact sequence of operations that reaches
 * it:
 *
 *   CreateInterventionSession → SUPPORT → ContinueSupport → ACTION
 *   → RecordInterventionOutcome → FOLLOW_UP
 *
 * **Why the order is the test.** Since step-13 entering SUPPORT no longer
 * unblocks ACTION: `continueSupport` is the only thing that satisfies
 * `support_screen_viewed` (L5-R19), and it does not transition. A front that
 * skips it leaves the student stuck on the support screen with no way out —
 * the live risk this step closes — so "ACTION is never asked for before
 * ContinueSupport succeeded" is pinned here rather than left to review.
 *
 * Not covered here: that the LOCKDOWN screen renders no Continue button. That
 * is a component decision and this repo has no component-render harness
 * (`StudentStage` portals to `document.body`, which `renderToString` refuses).
 * What is covered is the server half — a LOCKDOWN session is never moved past
 * SUPPORT by any of these actions.
 *
 * Run: npx tsx --test --test-force-exit app/routes/intervention-flow.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { Role } from '../lib/bp-ai/gql/schema.ts'

process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-intervention-flow'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let openIntervention: typeof import('./api.intervention.tsx')['action']
let continueSupport: typeof import('./student.helpful-content.tsx')['action']
let closeSession: typeof import('./student.session-feedback.tsx')['action']
let cookie: string

const STUDENT = '332a53ba-0000-4000-8000-00000000000a'

before(async () => {
  openIntervention = (await import('./api.intervention.tsx')).action
  continueSupport = (await import('./student.helpful-content.tsx')).action
  closeSession = (await import('./student.session-feedback.tsx')).action

  const { sealBpSession } = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  cookie = `bp-session=${await sealBpSession({
    accessToken: 'access',
    refreshToken: 'refresh',
    userId: STUDENT,
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

function payload(uiMode: 'NORMAL' | 'LOCKDOWN') {
  return {
    sessionId: 's-1',
    pathway: uiMode === 'LOCKDOWN' ? 'IMMEDIATE_SAFETY' : 'ROUTINE',
    supportBlocks: [{ type: 'VALIDATION', content: 'You are not alone.', order: 1 }],
    actionPayload: { tools: uiMode === 'LOCKDOWN' ? [] : [{ id: 'tool-1', name: 'Calming breath', description: 'd', toolType: 'breathing' }] },
    uiMode,
    requiresAcknowledgment: uiMode === 'LOCKDOWN',
    safetyMessage: uiMode === 'LOCKDOWN' ? 'Someone at your school will reach out.' : null,
    crisisResources: uiMode === 'LOCKDOWN' ? { hotline: '988', textLine: 'Text HOME to 741741' } : null,
  }
}

/**
 * One gateway for the whole flow: it answers each operation by name and records
 * the call, so the assertion is the transcript rather than a per-call spy.
 * `refuseContinue` makes `continueSupport` answer `success: false`, which is
 * what the FSM does for a session outside SUPPORT.
 */
function stubGateway(opts: { uiMode?: 'NORMAL' | 'LOCKDOWN'; refuseContinue?: boolean } = {}): string[] {
  const calls: string[] = []
  globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
    const { query, variables } = JSON.parse(String(init.body)) as { query: string; variables: Record<string, unknown> }
    const name = /(?:mutation|query) (\w+)/.exec(query)?.[1] ?? query

    switch (name) {
      case 'CreateInterventionSession':
        calls.push(name)
        return Response.json({ data: { createInterventionSession: payload(opts.uiMode ?? 'NORMAL') } })
      case 'TransitionIntervention':
        calls.push(`Transition:${String(variables.toState)}`)
        return Response.json({ data: { transitionInterventionState: { success: true, error: null } } })
      case 'ContinueSupport':
        calls.push(name)
        return Response.json({
          data: { continueSupport: { success: !opts.refuseContinue, error: opts.refuseContinue ? 'not in SUPPORT' : null } },
        })
      case 'RecordInterventionOutcome':
        calls.push(`${name}:${JSON.stringify((variables.input as Record<string, unknown>).humanRating ?? null)}`)
        return Response.json({ data: { recordInterventionOutcome: { success: true, message: 'ok' } } })
      default:
        calls.push(`UNEXPECTED:${name}`)
        return Response.json({ data: {} })
    }
  }) as unknown as typeof globalThis.fetch
  return calls
}

function req(url: string, body?: Record<string, string>): { request: Request; params: {}; context: never } {
  const init: RequestInit = { method: 'POST', headers: { cookie } }
  if (body) init.body = new URLSearchParams(body)
  return { request: new Request(url, init), params: {}, context: {} as never }
}

describe('check-in → intervention → Support → Continue → Action → feedback', () => {
  it("reaches the gateway in the FSM order, Continue before ACTION", async () => {
    const calls = stubGateway()

    const opened = (await openIntervention(req('https://x.test/api/intervention') as never)) as Response
    const { intervention } = (await opened.json()) as { intervention: { sessionId: string } }
    assert.equal(intervention.sessionId, 's-1')

    assert.deepEqual(
      await continueSupport(req('https://x.test/student/helpful-content', { sessionId: 's-1' }) as never),
      { advanced: true },
    )

    assert.deepEqual(
      await closeSession(
        req('https://x.test/student/session-feedback?session=s-1', {
          sessionId: 's-1',
          toolId: 'tool-1',
          answer: 'yes',
        }) as never,
      ),
      { saved: true },
    )

    assert.deepEqual(calls, [
      'CreateInterventionSession',
      'Transition:SUPPORT',
      'ContinueSupport',
      'Transition:ACTION',
      'RecordInterventionOutcome:1',
      'Transition:FOLLOW_UP',
    ])
  })

  // The guard itself: a refused Continue must stop the flow BEFORE ACTION is
  // asked for. Asking anyway is what leaves a student stuck in SUPPORT.
  it('never asks for ACTION when continueSupport is refused', async () => {
    const calls = stubGateway({ refuseContinue: true })

    assert.deepEqual(
      await continueSupport(req('https://x.test/student/helpful-content', { sessionId: 's-1' }) as never),
      { advanced: false },
    )
    assert.deepEqual(calls, ['ContinueSupport'])
  })

  // "I didn't do that" has nothing to rate, and 0.0 is read as ABSENT by the
  // agent — so no rating travels at all rather than a zero that would be
  // recorded as a rating of nothing.
  it("sends no humanRating for the I-did-not-do-that answer", async () => {
    const calls = stubGateway()
    await closeSession(
      req('https://x.test/student/session-feedback?session=s-1', {
        sessionId: 's-1',
        toolId: 'tool-1',
        answer: 'didnt',
      }) as never,
    )
    assert.deepEqual(calls, ['RecordInterventionOutcome:null', 'Transition:FOLLOW_UP'])
  })

  // LOCKDOWN stops at the support screen: the backend sends no tools (step-11)
  // and nothing on the server side moves the session past SUPPORT.
  it('moves a LOCKDOWN session no further than SUPPORT', async () => {
    const calls = stubGateway({ uiMode: 'LOCKDOWN' })

    const opened = (await openIntervention(req('https://x.test/api/intervention') as never)) as Response
    const { intervention } = (await opened.json()) as {
      intervention: { uiMode: string; safetyMessage: string; crisisResources: { hotline: string }; actionPayload: { tools: unknown[] } }
    }

    assert.equal(intervention.uiMode, 'LOCKDOWN')
    assert.equal(intervention.safetyMessage, 'Someone at your school will reach out.')
    assert.equal(intervention.crisisResources.hotline, '988')
    assert.deepEqual(intervention.actionPayload.tools, [])
    assert.deepEqual(calls, ['CreateInterventionSession', 'Transition:SUPPORT'])
  })

  // The session-feedback loader must NOT look for a daily follow-up when the
  // student arrived from an intervention: with nothing pending it redirects to
  // the check-in, which would bounce a child who has just done one.
  it('skips the follow-up lookup when the URL carries ?session=', async () => {
    const calls = stubGateway()
    const { loader } = await import('./student.session-feedback.tsx')
    const request = new Request('https://x.test/student/session-feedback?session=s-1', { headers: { cookie } })
    assert.deepEqual(await loader({ request, params: {}, context: {} as never } as never), { followup: null })
    assert.deepEqual(calls, [])
  })
})
