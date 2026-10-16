/**
 * `myGrades` → what the school screen shows, and the grades-journal write.
 *
 * The rule under test is the one the old screen broke in the other direction:
 * a null from the LMS means "no data", and must never reach the student as a
 * `0%` they did not earn — nor be averaged in as one.
 *
 * Run: npx tsx --test app/lib/bp-ai/grades.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type GradesModule = typeof import('./grades.server.ts')
let mod: GradesModule

before(async () => {
  mod = (await import('./grades.server.ts')) as GradesModule
})

function course(over: Record<string, unknown> = {}) {
  return {
    lmsType: 'canvas',
    courseExternalId: '101',
    courseName: 'Biology',
    teacherName: 'T. Teacher',
    currentScore: null as number | null,
    currentGrade: null as string | null,
    attendancePercent: null as number | null,
    ...over,
  }
}

describe('gradesView', () => {
  it('shows a course with no score and no letter as "no grade yet", never 0%', () => {
    const view = mod.gradesView({ lmsConnected: true, studentMatched: true, courses: [course()] })
    assert.equal(view.state, 'ready')
    if (view.state !== 'ready') return
    assert.equal(view.courses[0].grade, mod.NO_GRADE)
    assert.equal(view.courses[0].pct, null)
  })

  it('averages attendance over the courses that record it, not over all of them', () => {
    const view = mod.gradesView({
      lmsConnected: true,
      studentMatched: true,
      courses: [course({ attendancePercent: 90 }), course({ courseExternalId: '102', attendancePercent: null })],
    })
    if (view.state !== 'ready') throw new Error(`expected ready, got ${view.state}`)
    // Treating the null as 0 would give 45.0%.
    assert.equal(view.attendanceAverage, '90.0%')
  })

  it('has no attendance figure at all when no course records it', () => {
    const view = mod.gradesView({ lmsConnected: true, studentMatched: true, courses: [course()] })
    if (view.state !== 'ready') throw new Error(`expected ready, got ${view.state}`)
    assert.equal(view.attendanceAverage, null)
  })

  it('says "no LMS" when nothing is connected, even though the student is also unmatched', () => {
    // The gateway sends both flags false in that case.
    assert.equal(mod.gradesView({ lmsConnected: false, studentMatched: false, courses: [] }).state, 'no-lms')
  })
})

describe('bpCreateGradesNote', () => {
  const originalFetch = globalThis.fetch
  after(() => {
    globalThis.fetch = originalFetch
  })

  it('writes a Journal tagged grades, with no catalogue prompt id', async () => {
    // A Journal is what reaches the analysis; an empty `question_ids` entry
    // would be refused by the gateway's prompt validation.
    let body: { query: string; variables: { input: Record<string, unknown> } } | null = null
    globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
      body = JSON.parse(String(init.body))
      return new Response(JSON.stringify({ data: { createJournal: { id: 'j-1', question_ids: [] } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof globalThis.fetch

    const result = await mod.bpCreateGradesNote('tok', 'user-1', 'Rough week in maths.')
    assert.equal(result.ok, true)
    if (!body) throw new Error('expected a request')
    const sent = body as { query: string; variables: { input: Record<string, unknown> } }
    assert.match(sent.query, /createJournal/)
    assert.equal(sent.variables.input.user, 'user-1')
    assert.equal(sent.variables.input.content, 'Rough week in maths.')
    assert.deepEqual(sent.variables.input.tags, ['grades'])
    assert.equal('question_ids' in sent.variables.input, false)
  })
})
