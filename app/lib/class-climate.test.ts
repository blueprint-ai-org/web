/**
 * The climate cards' split into strengths and concerns. The rule under test:
 * a dimension with no value (too little data, or withheld by k-anonymity) is
 * neither a strength nor a concern, and no dimension is both.
 *
 * Run: npx tsx --test --test-force-exit app/lib/class-climate.test.ts
 */

import { it } from 'node:test'
import assert from 'node:assert/strict'

import { strengthsAndConcerns } from './class-climate'

const dim = (name: string, value: number | null) => ({ name, description: '', value })

it('ranks only known values: two strengths, the rest (up to two) concerns, worst first', () => {
  const { strengths, concerns } = strengthsAndConcerns([
    dim('mood', 40), dim('sleep', null), dim('support', 90), dim('routine', null), dim('engagement', 55),
  ])

  assert.deepEqual(strengths.map((d) => d.name), ['support', 'engagement'])
  assert.deepEqual(concerns.map((d) => d.name), ['mood'])
})

it('five known values: the top two and the bottom two', () => {
  const { strengths, concerns } = strengthsAndConcerns([
    dim('a', 10), dim('b', 20), dim('c', 30), dim('d', 40), dim('e', 50),
  ])

  assert.deepEqual(strengths.map((d) => d.name), ['e', 'd'])
  assert.deepEqual(concerns.map((d) => d.name), ['a', 'b'])
})
