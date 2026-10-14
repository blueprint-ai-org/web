/**
 * The journal prompts' type fit, and all-about-you's daily draw (until step-30).
 *
 * Pure and isomorphic. Run: npx tsx --test app/lib/student/journal-prompts.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { pickDaily, promptScale, type JournalPrompt } from './journal-prompts.ts'

const CATALOGUE: JournalPrompt[] = Array.from({ length: 40 }, (_, i) => ({
  id: `id-${String(i).padStart(2, '0')}`,
  label: `Prompt ${i}`,
}))

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

describe('pickDaily', () => {
  const none = new Set<string>()

  // The `answeredIds` argument is gone with step-9: the caller passes a
  // catalogue the SERVER already filtered (`listQuestions(unansweredBy:)`),
  // where it used to hand over all 167 prompts plus a set of ~170 answered ids
  // it had paged every mini-survey and every journal entry to build.
  //
  // What is left is the daily choice, and the two rules that make it one.

  it('avoids today\'s journal topics when it can', () => {
    // The home shows two prompts; offering the same one here reads as the app
    // having run out of questions.
    const avoid = new Set(['id-38', 'id-39'])
    for (let s = 0; s < 20; s++) {
      const picked = pickDaily(CATALOGUE.slice(37), avoid, `seed-${s}`)
      assert.equal(picked?.id, 'id-37')
    }
  })

  it('offers an avoided prompt rather than nothing', () => {
    // Two rules, and this is their order: a repeat of today's topic beats an
    // empty screen.
    assert.equal(pickDaily([CATALOGUE[39]!], new Set(['id-39']), 'x')?.id, 'id-39')
  })

  it('is stable for the same seed and the same pool', () => {
    // A reload, or a trip back to Today and in again, must show the same
    // question — that is what makes it today's.
    assert.deepEqual(
      pickDaily(CATALOGUE, none, 'a|2026-10-05'),
      pickDaily(CATALOGUE, none, 'a|2026-10-05'),
    )
  })

  it('is null for an empty pool, which now means "all answered"', () => {
    // The screen renders its own empty state. It used to repeat a prompt here,
    // because an empty pool and "everything answered" were different things
    // when the filtering happened on this side.
    assert.equal(pickDaily([], none, 'x'), null)
  })
})
