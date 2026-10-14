/**
 * What the student's recorded days turn into on the summary and journey.
 *
 * The screens these replace invented data: the summary drew HAPPY for a day
 * with no check-in, and the journey's check-in grid was a fixed pattern. These
 * pin that an empty day stays empty and that each figure lands on its own day.
 *
 * Same harness as `journal.test.ts`: env, a `fetch` stub, dynamic import, so
 * the real client runs.
 *
 * Run: npx tsx --test --test-force-exit app/lib/bp-ai/activity.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type Module = typeof import('./activity.server.ts')
let mod: Module

before(async () => {
  mod = (await import('./activity.server.ts')) as Module
})

const originalFetch = globalThis.fetch
after(() => {
  globalThis.fetch = originalFetch
})

function stub(data: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
}

const EMPTY_DAY = { date: '2026-10-14', moodHistories: [], journals: [], wins: [], miniSurveys: [] }
const MOODS = new Map([
  ['mood-happy-2', { art: 'happy', chips: ['Joyful', 'Content'] }],
  ['mood-tired-1', { art: 'tired', chips: ['Content', 'Drained', 'Sleepy', 'Worn out', 'Flat', 'Slow'] }],
])

describe('summaryDay', () => {
  it('leaves a day with nothing recorded empty — no default emotion, no sections', () => {
    const day = mod.summaryDay(EMPTY_DAY, 'Today', MOODS)
    assert.deepEqual(day, { label: 'Today', sections: [], mood: { emotions: [], reasons: [], chips: [] } })
  })

  it("takes the check-in's reasons from its own answers, and about-you from the unlinked one", () => {
    const day = mod.summaryDay(
      {
        ...EMPTY_DAY,
        moodHistories: [{ id: 'mh1', moods: [{ id: 'mood-happy-2' }, { id: 'mood-deleted' }], created_at: '2026-10-14T15:00:00Z' }],
        miniSurveys: [
          {
            moodHistory: 'mh1',
            responses: [{ question: 'Why?', answer: 'Friends, School life', option_ids: ['o1', 'o2'] }],
            created_at: '2026-10-14T15:00:00Z',
          },
          { moodHistory: null, responses: [{ question: 'Pick one', answer: '🙂', option_ids: ['o9'] }], created_at: '2026-10-14T16:00:00Z' },
        ],
        journals: [{ content: 'A note', created_at: '2026-10-14T17:00:00Z' }],
      },
      '14.10.26',
      MOODS,
    )
    // A mood the catalogue no longer has is left out, not drawn as another one.
    assert.deepEqual(day.mood, {
      emotions: [{ name: 'HAPPY', img: 'emotion-happy.svg' }],
      reasons: ['Friends', 'School life'],
      chips: ['Joyful', 'Content'],
    })
    assert.deepEqual(day.about, { question: 'Pick one', emoji: '🙂' })
    assert.deepEqual(day.sections, ['mood', 'write', 'about'])
  })

  it("draws the overlay chips from the picked moods' catalogue rows, in pick order, deduped, at most six", () => {
    const day = mod.summaryDay(
      {
        ...EMPTY_DAY,
        moodHistories: [
          { id: 'mh1', moods: [{ id: 'mood-happy-2' }, { id: 'mood-tired-1' }], created_at: '2026-10-14T15:00:00Z' },
        ],
      },
      'Today',
      MOODS,
    )
    // `Content` is in both rows and shows once; `Slow` would be the seventh.
    assert.deepEqual(day.mood.chips, ['Joyful', 'Content', 'Drained', 'Sleepy', 'Worn out', 'Flat'])
  })
})

describe('bpJourney', () => {
  it('lights the grid cell of each day with a check-in, oldest first, padded before the 1st', async () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      moodHistories: i === 0 || i === 13 ? [{ id: `mh${i}` }] : [],
    }))
    stub({
      studentActivity: {
        days,
        totals: { checkinDays: 2, moodsNamed: 3, lessonsCompleted: 0, lessonsByCategory: [], sparksEarned: 0 },
      },
      moodCounts: { counts: [] },
      listContentCategories: [],
      listMilestones: [],
      listUserMilestones: [],
    })
    const result = await mod.bpJourney('tok', '2026-10-14', 'UTC')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)

    const lit = result.data.checkinDays.flatMap((on, i) => (on ? [i] : []))
    // Twenty cells, fourteen days: six empty cells before October 1st.
    assert.deepEqual(lit, [6, 19])
  })
})
