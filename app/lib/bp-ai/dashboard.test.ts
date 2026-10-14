/**
 * `cohortRisk` → the watchlist rows the counselor dashboard draws.
 *
 * The rule under test: a column the backend does not know (grade, direction,
 * confidence, riskScore) stays null all the way to the row — drawn as a
 * placeholder, never as a zero or a default trend — and the gateway's order is
 * kept, because it is the sort.
 *
 * Run: npx tsx --test --test-force-exit app/lib/bp-ai/dashboard.test.ts
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type DashboardModule = typeof import('./dashboard.server')
let mod: DashboardModule

before(async () => {
  mod = (await import('./dashboard.server')) as DashboardModule
})

/** Answers the two reads; records which ran. */
function stubGateway(schools: { id: string }[], watchlist: unknown[]): string[] {
  const ops: string[] = []
  globalThis.fetch = (async (_url: unknown, init: { body?: string } = {}) => {
    const query = String((JSON.parse(String(init.body ?? '{}')) as { query?: string }).query)
    const data = query.includes('listSchoolsForUser')
      ? (ops.push('schools'), { listSchoolsForUser: { schools } })
      : (ops.push('cohortRisk'), { cohortRisk: { watchlist } })
    return new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof globalThis.fetch
  return ops
}

const known = {
  user: 'u1', alertId: 'a1', alertStatus: 'pending', tier: 'CRITICAL', riskScore: 100, confidence: 83,
  direction: 'DECLINING', grade: '7th', student: { first_name: 'Ana', last_name: 'Ruiz', display_name: null },
}
const unknown = {
  user: 'u2', alertId: 'a2', alertStatus: 'escalated', tier: 'LOW', riskScore: null, confidence: null,
  direction: 'INSUFFICIENT_DATA', grade: null, student: null,
}

describe('bpSchoolWatchlist', () => {
  it('maps every column and keeps unknowns null, in the gateway order', async () => {
    stubGateway([{ id: 's1' }], [known, unknown])

    const result = await mod.bpSchoolWatchlist('tok')
    if (!result.ok) throw new Error(result.error.message)

    assert.deepEqual(result.data, [
      {
        id: 'u1', alertId: 'a1', alertStatus: 'pending', name: 'Ana Ruiz', initials: 'AR', grade: '7th',
        tone: 'urgent', riskScore: 100, direction: 'declining', confidence: 83,
      },
      {
        // No student record to name: the id, not an invented name. A trend
        // without direction is no arrow, not "stable".
        id: 'u2', alertId: 'a2', alertStatus: 'escalated', name: 'u2', initials: 'U2', grade: null,
        tone: 'monitor', riskScore: null, direction: null, confidence: null,
      },
    ])
  })

  it('a caller with no school gets an empty watchlist without asking for one', async () => {
    const ops = stubGateway([], [known])

    const result = await mod.bpSchoolWatchlist('tok')

    assert.deepEqual(result, { ok: true, data: [] })
    assert.deepEqual(ops, ['schools'])
  })
})
