/**
 * `cohortRisk` → the watchlist rows the counselor dashboard draws.
 *
 * The rule under test: a column the backend does not know (grade, direction,
 * confidence, riskScore) stays null all the way to the row — drawn as a
 * placeholder, never as a zero or a default trend — and the gateway's order is
 * kept, because it is the sort.
 *
 * And for the class climate: a metric the gateway gave no score (too little
 * data, or withheld by k-anonymity) stays null — never a zero ranked as the
 * class's worst area.
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

/** Answers the reads; `watchlists` and `climate` are keyed by school id. Records which ran. */
function stubGateway(
  schools: { id: string; name?: string }[],
  watchlists: Record<string, unknown[]>,
  climate?: unknown,
): string[] {
  const ops: string[] = []
  globalThis.fetch = (async (_url: unknown, init: { body?: string } = {}) => {
    const body = JSON.parse(String(init.body ?? '{}')) as { query?: string; variables?: { school?: string } }
    const query = String(body.query)
    const school = String(body.variables?.school)
    const data = query.includes('listSchoolsForUser')
      ? (ops.push('schools'), { listSchoolsForUser: { schools } })
      : query.includes('cohortMetrics')
        ? (ops.push(`climate:${school}`), climate)
        : (ops.push(`cohortRisk:${school}`), { cohortRisk: { watchlist: watchlists[school] ?? [] } })
    return new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof globalThis.fetch
  return ops
}

const known = {
  user: 'u1', alertId: 'a1', alertStatus: 'pending', alertCreatedAt: '2026-10-10T09:00:00Z', tier: 'CRITICAL', riskLevel: 6, riskScore: 100, confidence: 83,
  direction: 'DECLINING', grade: '7th', student: { first_name: 'Ana', last_name: 'Ruiz', display_name: null },
}
const unknown = {
  user: 'u2', alertId: 'a2', alertStatus: 'escalated', alertCreatedAt: '2026-10-12T09:00:00Z', tier: 'LOW', riskLevel: 1, riskScore: null, confidence: null,
  direction: 'INSUFFICIENT_DATA', grade: null, student: null,
}

describe('bpSchoolWatchlist', () => {
  it('maps every column and keeps unknowns null, in the gateway order', async () => {
    stubGateway([{ id: 's1' }], { s1: [known, unknown] })

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
    const ops = stubGateway([], { s1: [known] })

    const result = await mod.bpSchoolWatchlist('tok')

    assert.deepEqual(result, { ok: true, data: [] })
    assert.deepEqual(ops, ['schools'])
  })

  it('a counselor of two schools sees both, each student once, most severe first', async () => {
    // u1 is in both schools (same open alert); u3 only in the second.
    const u3 = { ...unknown, user: 'u3', alertId: 'a3', tier: 'HIGH', riskLevel: 4, alertCreatedAt: '2026-10-13T09:00:00Z' }
    const ops = stubGateway([{ id: 's1' }, { id: 's2' }], { s1: [unknown, known], s2: [known, u3] })

    const result = await mod.bpSchoolWatchlist('tok')
    if (!result.ok) throw new Error(result.error.message)

    assert.deepEqual(result.data.map((r) => r.id), ['u1', 'u3', 'u2'])
    assert.deepEqual(ops.sort(), ['cohortRisk:s1', 'cohortRisk:s2', 'schools'])
  })
})

describe('bpSchoolClimate', () => {
  it('labels each metric from metricDefinitions and keeps a missing score null', async () => {
    stubGateway([{ id: 's1', name: 'Lincoln' }], {}, {
      cohortMetrics: {
        cohortSize: 40,
        // SLEEP_TREND absent (withheld); SUPPORT_INDEX present with no score.
        metrics: [
          { metricName: 'MOOD_BASELINE', score: 65 },
          { metricName: 'SUPPORT_INDEX', score: null },
        ],
      },
      metricDefinitions: [
        { name: 'MOOD_BASELINE', label: 'Mood baseline', description: 'mood' },
        { name: 'SLEEP_TREND', label: 'Sleep trend', description: 'sleep' },
        { name: 'SUPPORT_INDEX', label: 'Support index', description: 'support' },
      ],
    })

    const result = await mod.bpSchoolClimate('tok')

    assert.deepEqual(result, {
      ok: true,
      data: {
        subtitle: 'Lincoln • 40 Students',
        dimensions: [
          { name: 'Mood baseline', description: 'mood', value: 65 },
          { name: 'Sleep trend', description: 'sleep', value: null },
          { name: 'Support index', description: 'support', value: null },
        ],
      },
    })
  })

  it('a suppressed cohort names no size', async () => {
    stubGateway([{ id: 's1', name: 'Lincoln' }], {}, {
      cohortMetrics: { cohortSize: null, metrics: [] },
      metricDefinitions: [],
    })

    const result = await mod.bpSchoolClimate('tok')
    if (!result.ok) throw new Error(result.error.message)

    assert.equal(result.data?.subtitle, 'Lincoln • — Students')
  })

  it('a caller with no school gets no climate without asking for one', async () => {
    const ops = stubGateway([], {})

    assert.deepEqual(await mod.bpSchoolClimate('tok'), { ok: true, data: null })
    assert.deepEqual(ops, ['schools'])
  })
})
