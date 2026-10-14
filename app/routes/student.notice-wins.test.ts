/**
 * `/student/notice-wins` action — one win per local day.
 *
 * The first save of the day creates a `win_gratitude`; a second save the same
 * day updates it (step-31). Both keep the link to the question they answer:
 * `updateWinGratitude` without `question` CLEARS it, and the question would
 * then come back tomorrow as unanswered.
 *
 * Same harness as `student._index.test.ts`: a real sealed `bp-session` and a
 * `fetch` stub that answers by operation, so the route and the real client run.
 *
 * Run: npx tsx --test --test-force-exit app/routes/student.notice-wins.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { Role } from '../lib/bp-ai/gql/schema.ts'

process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-notice-wins-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type RouteModule = typeof import('./student.notice-wins.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

const USER = '332a53ba-0000-4000-8000-00000000000a'
let action: RouteModule['action']
let cookie: string

before(async () => {
  action = ((await import('./student.notice-wins.tsx')) as RouteModule).action
  const { sealBpSession } = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  cookie = `bp-session=${await sealBpSession({
    accessToken: 'access',
    refreshToken: 'refresh',
    userId: USER,
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

type Write = { op: 'create' | 'update'; input: Record<string, unknown> }

/** The gateway, with `winsToday` already saved today. Returns what was written. */
function gateway(winsToday: unknown[]): Write[] {
  const writes: Write[] = []
  globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
    const { query, variables } = JSON.parse(String(init.body))
    if (query.includes('mutation CreateWin')) {
      writes.push({ op: 'create', input: variables.input })
      return Response.json({ data: { createWinGratitude: { id: 'w-new', sparksAwarded: 5 } } })
    }
    if (query.includes('mutation UpdateWin')) {
      writes.push({ op: 'update', input: variables.input })
      return Response.json({ data: { updateWinGratitude: { id: variables.input.id } } })
    }
    return Response.json({
      data: {
        dailyQuestions: [{ id: 'q-wins', label: 'What went well?' }],
        studentActivity: { days: [{ wins: winsToday }] },
        listSparkRules: [],
      },
    })
  }) as unknown as typeof globalThis.fetch
  return writes
}

async function save(note: string) {
  const body = new URLSearchParams({ questionId: 'q-wins', question: 'What went well?', note })
  const request = new Request('https://example.test/student/notice-wins', { method: 'POST', headers: { cookie }, body })
  return action({ request, params: {}, context: {} as never } as never)
}

describe('/student/notice-wins action', () => {
  it("creates today's win, linked to its question, when there is none yet", async () => {
    const writes = gateway([])
    assert.deepEqual(await save('Finished my essay'), { saved: true, sparksAwarded: 5 })
    assert.deepEqual(writes, [
      {
        op: 'create',
        input: { user: USER, type: 'win', title: 'What went well?', description: 'Finished my essay', question: 'q-wins' },
      },
    ])
  })

  it("updates today's win on a second save, keeping the question", async () => {
    const writes = gateway([
      { id: 'w-today', title: 'What went well?', description: 'Finished', question: 'q-wins', created_at: '2026-10-14T15:00:00Z' },
    ])
    assert.deepEqual(await save('Finished my essay early'), { saved: true, sparksAwarded: null })
    assert.deepEqual(writes, [
      {
        op: 'update',
        input: { id: 'w-today', type: 'win', title: 'What went well?', description: 'Finished my essay early', question: 'q-wins' },
      },
    ])
  })
})
