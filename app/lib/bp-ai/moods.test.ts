/**
 * The check-in catalogue, as one request.
 *
 * Three properties, and each replaces something this module used to do by hand:
 *
 *  1. **One call.** It made two — `listMoodCategories` to resolve an identifier
 *     into a UUID, then `listMoods(category:)` — because the filter took a UUID.
 *     `curatedOnly` asks the real question.
 *  2. **The grid is grouped from the answer**, so the fifteen tiles and their
 *     triads come from the catalogue rather than from a local list the rows
 *     were looked up into (which dropped any row it did not recognise).
 *  3. **No intensity is sent.** The picked mood IS the intensity; the server
 *     maps its triad level. The old payload carried a number from a local
 *     `[2,5,8]` table, so the scale lived in a browser.
 */

import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type MoodsModule = typeof import('./moods.server.ts')
let bpCheckinCatalogue: MoodsModule['bpCheckinCatalogue']
let bpSubmitCheckIn: MoodsModule['bpSubmitCheckIn']

before(async () => {
  const mod = (await import('./moods.server.ts')) as MoodsModule
  bpCheckinCatalogue = mod.bpCheckinCatalogue
  bpSubmitCheckIn = mod.bpSubmitCheckIn
})

const originalFetch = globalThis.fetch
let bodies: string[] = []

function stub(payload: unknown): void {
  globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
    bodies.push(String(init.body ?? ''))
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch
}

beforeEach(() => {
  bodies = []
})

after(() => {
  globalThis.fetch = originalFetch
})

/** A triad of a category, as the gateway returns it. */
function triad(category: { id: string; identifier: string; label: string; order: number }) {
  return [1, 2, 3].map((level) => ({
    id: `${category.identifier}-${level}`,
    identifier: `${category.identifier.replace('checkin_', '')}_${level}`,
    label: `level ${level}`,
    level,
    emoji: '🙂',
    color: '#FFAF25',
    secondaryColor: '#5A4518',
    chips: ['friends'],
    order: category.order,
    category,
  }))
}

describe('bpCheckinCatalogue', () => {
  it('asks once, with curatedOnly — not a category lookup and then a list', async () => {
    const happy = { id: 'cat-happy', identifier: 'checkin_happy', label: 'Happy', order: 2 }
    const sad = { id: 'cat-sad', identifier: 'checkin_sad', label: 'Sad', order: 1 }
    stub({ data: { listMoods: { moods: [...triad(happy), ...triad(sad)] } } })

    const result = await bpCheckinCatalogue('access.jwt')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)

    assert.equal(bodies.length, 1, 'one round trip for the whole check-in')
    assert.match(bodies[0] ?? '', /curatedOnly: true/)
    assert.doesNotMatch(bodies[0] ?? '', /listMoodCategories/)
  })

  it('groups the answer into tiles, in grid order, each triad low → high', async () => {
    const happy = { id: 'cat-happy', identifier: 'checkin_happy', label: 'Happy', order: 2 }
    const sad = { id: 'cat-sad', identifier: 'checkin_sad', label: 'Sad', order: 1 }
    // Deliberately interleaved and out of order: the grouping must not depend
    // on the gateway's ordering, only agree with it.
    const rows = [...triad(happy), ...triad(sad)].reverse()
    stub({ data: { listMoods: { moods: rows } } })

    const result = await bpCheckinCatalogue('access.jwt')
    if (!result.ok) throw new Error('expected success')

    assert.deepEqual(
      result.data.map((t) => t.identifier),
      ['checkin_sad', 'checkin_happy'],
      'tiles come back in grid order',
    )
    for (const tile of result.data) {
      assert.deepEqual(
        tile.moods.map((m) => m.level),
        [1, 2, 3],
        'the arc reads low → high, so the triad must be sorted by level',
      )
    }
  })

  it('drops a curated mood with no level or no category, and keeps the rest', async () => {
    // Neither can be drawn: a tile is a category, and a stop on the arc is a
    // level. Dropping the row beats rendering a tile whose pick cannot record.
    const happy = { id: 'cat-happy', identifier: 'checkin_happy', label: 'Happy', order: 1 }
    stub({
      data: {
        listMoods: {
          moods: [
            ...triad(happy),
            { ...triad(happy)[0], id: 'no-level', level: null },
            { ...triad(happy)[0], id: 'no-category', category: null },
          ],
        },
      },
    })

    const result = await bpCheckinCatalogue('access.jwt')
    if (!result.ok) throw new Error('expected success')
    assert.equal(result.data.length, 1)
    assert.equal(result.data[0]?.moods.length, 3)
  })

  it('an unseeded tenant is a STATE, not a failure', async () => {
    // The screen renders "check-in unavailable". It used to render fifteen
    // baked tiles instead, so a student could complete a check-in that
    // recorded nothing.
    stub({ data: { listMoods: { moods: [] } } })

    const result = await bpCheckinCatalogue('access.jwt')
    if (!result.ok) throw new Error('expected ok with no tiles')
    assert.deepEqual(result.data, [])
  })

  it('a gateway failure is a GqlResult, never a throw', async () => {
    stub({ data: null, errors: [{ message: 'Authentication required', extensions: { code: 'UNAUTHORIZED' } }] })

    const result = await bpCheckinCatalogue('stale.jwt')
    if (result.ok) throw new Error('expected a failure')
    assert.equal(result.error.kind, 'unauthenticated')
  })
})

describe('bpSubmitCheckIn', () => {
  /** What the gateway answers for a check-in with `n` answers. */
  function payload(n: number): unknown {
    return {
      data: {
        submitCheckIn: {
          moodHistory: { id: 'mh-1', note: 'rough' },
          answers: Array.from({ length: n }, (_, i) => ({ id: `ms-${i}`, questionId: `q-${i}` })),
        },
      },
    }
  }

  it('sends the moods and the answers in ONE request', async () => {
    // This is the whole point of step-10: it was a mood-history create plus,
    // per answer, a list and a create-or-update — up to seven round trips, any
    // of which could fail on its own and leave half a check-in stored.
    stub(payload(2))

    const result = await bpSubmitCheckIn(
      'access.jwt',
      'u-1',
      [{ moodId: 'm-1' }, { moodId: 'm-2' }],
      [
        { questionId: 'q-reasons', optionIds: ['o-1', 'o-2'] },
        { questionId: 'q-other', answer: '🎮 Gaming' },
      ],
      { note: 'rough' },
    )
    if (!result.ok) throw new Error('expected success')
    assert.deepEqual(result.data, { id: 'mh-1', answers: 2 })
    assert.equal(bodies.length, 1, 'one request, not one per thing written')

    const sent = JSON.parse(bodies[0] ?? '{}') as { variables: { input: Record<string, unknown> } }
    assert.deepEqual(sent.variables.input.moods, [{ id: 'm-1' }, { id: 'm-2' }])
    assert.equal(sent.variables.input.note, 'rough')
    assert.deepEqual(sent.variables.input.answers, [
      { questionId: 'q-reasons', optionIds: ['o-1', 'o-2'] },
      { questionId: 'q-other', answer: '🎮 Gaming' },
    ])
  })

  it('sends no intensity for any mood', async () => {
    // The picked mood IS the intensity: the server maps its triad level to
    // 2 / 5 / 8. A client that sent a number held the scale in a browser.
    stub(payload(0))

    await bpSubmitCheckIn('access.jwt', 'u-1', [{ moodId: 'm-1' }])
    const sent = JSON.parse(bodies[0] ?? '{}') as { variables: { input: { moods: Record<string, unknown>[] } } }
    assert.deepEqual(Object.keys(sent.variables.input.moods[0] ?? {}), ['id'])
  })

  it('refuses an empty check-in locally rather than sending it', async () => {
    stub(payload(0))

    const result = await bpSubmitCheckIn('access.jwt', 'u-1', [])
    if (!result.ok) throw new Error('expected ok')
    assert.equal(result.data, null)
    assert.equal(bodies.length, 0, 'a check-in with no mood is a UI bug, not a request')
  })

  it('omits `note` entirely when there is none', async () => {
    // Not `note: ""`: an empty string is a note the student did not write.
    stub(payload(0))

    await bpSubmitCheckIn('access.jwt', 'u-1', [{ moodId: 'm-1' }])
    const sent = JSON.parse(bodies[0] ?? '{}') as { variables: { input: Record<string, unknown> } }
    assert.equal('note' in sent.variables.input, false)
  })

  it('sends an empty answers list rather than omitting it', async () => {
    // A check-in with no questions behind it is legitimate — an unseeded
    // tenant — and `answers: []` says that, where an absent field would read
    // as "the client does not know about answers".
    stub(payload(0))

    await bpSubmitCheckIn('access.jwt', 'u-1', [{ moodId: 'm-1' }])
    const sent = JSON.parse(bodies[0] ?? '{}') as { variables: { input: Record<string, unknown> } }
    assert.deepEqual(sent.variables.input.answers, [])
  })
})
