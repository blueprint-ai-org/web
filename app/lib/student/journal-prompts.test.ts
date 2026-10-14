/**
 * The journal prompts' type fit.
 *
 * Pure and isomorphic. Run: npx tsx --test app/lib/student/journal-prompts.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { promptScale } from './journal-prompts.ts'

describe('promptScale', () => {
  it('keeps the design size for prototype-length prompts', () => {
    assert.equal(promptScale('What makes you feel excited?'), 1)
  })

  it('steps down for long prompts, never below 0.75', () => {
    assert.equal(promptScale('x'.repeat(100)), 0.85)
    assert.equal(promptScale('x'.repeat(159)), 0.75)
    assert.equal(promptScale('x'.repeat(400)), 0.75)
  })
})
