/**
 * What a check-in records for each picked tile.
 *
 * Pure and isomorphic. Run: npx tsx --test app/lib/student/checkin-catalogue.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { checkinMoods, type CatalogueTile } from './checkin-catalogue.ts'

const tile = (categoryId: string, ...ids: string[]): CatalogueTile => ({
  categoryId,
  identifier: `checkin_${categoryId}`,
  label: categoryId,
  order: 1,
  moods: ids.map((id, i) => ({
    id, identifier: id, label: id, level: i + 1, emoji: null, color: null, secondaryColor: null, chips: [],
  })),
})

describe('checkinMoods', () => {
  const happy = tile('happy', 'good', 'happy', 'joyful')
  const tired = tile('tired', 'sleepy', 'tired', 'exhausted')

  // Measured in the browser on 2026-10-14: two untouched arcs ⇒ no POST at all.
  it('records the stop the arc opened on when the student never moved it', () => {
    assert.deepEqual(checkinMoods([happy, tired], new Map()), [{ moodId: 'happy' }, { moodId: 'tired' }])
  })

  it('records what the student picked, tile by tile, in pick order', () => {
    assert.deepEqual(checkinMoods([tired, happy], new Map([['happy', 'joyful']])), [
      { moodId: 'tired' },
      { moodId: 'joyful' },
    ])
  })

  it('opens a half-seeded tile on the only mood it has, and skips a tile with none', () => {
    assert.deepEqual(checkinMoods([tile('meh', 'meh'), tile('empty')], new Map()), [{ moodId: 'meh' }])
  })
})
