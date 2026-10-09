/**
 * The journal's daily draw and its type fit.
 *
 * Pure and isomorphic. Run: npx tsx --test app/lib/student/journal-prompts.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { journalDay, pickPrompts, pickUnanswered, promptScale, type JournalPrompt } from './journal-prompts.ts'

const CATALOGUE: JournalPrompt[] = Array.from({ length: 40 }, (_, i) => ({
  id: `id-${String(i).padStart(2, '0')}`,
  label: `Prompt ${i}`,
}))

describe('pickPrompts', () => {
  it('draws the requested number of distinct prompts', () => {
    const picked = pickPrompts(CATALOGUE, 'student-a|2026-10-05', 2)
    assert.equal(picked.length, 2)
    assert.notEqual(picked[0].id, picked[1].id)
  })

  it('is stable for the same seed', () => {
    // An answered topic shows under its question; a reload must not re-roll it.
    assert.deepEqual(pickPrompts(CATALOGUE, 'student-a|2026-10-05', 2), pickPrompts(CATALOGUE, 'student-a|2026-10-05', 2))
  })

  it('does not depend on the order the gateway listed the catalogue in', () => {
    const reversed = [...CATALOGUE].reverse()
    assert.deepEqual(pickPrompts(reversed, 'student-a|2026-10-05', 2), pickPrompts(CATALOGUE, 'student-a|2026-10-05', 2))
  })

  it('varies across days and across students', () => {
    const days = new Set(
      Array.from({ length: 10 }, (_, d) => pickPrompts(CATALOGUE, `student-a|2026-10-${10 + d}`, 2).map((p) => p.id).join()),
    )
    const students = new Set(
      Array.from({ length: 10 }, (_, s) => pickPrompts(CATALOGUE, `student-${s}|2026-10-05`, 2).map((p) => p.id).join()),
    )
    // Ten draws from 780 pairs: a repeat or two is chance, all-the-same is a bug.
    assert.ok(days.size >= 8, `only ${days.size} distinct daily pairs`)
    assert.ok(students.size >= 8, `only ${students.size} distinct per-student pairs`)
  })

  it('returns what there is when the catalogue is short', () => {
    assert.equal(pickPrompts(CATALOGUE.slice(0, 1), 'x', 2).length, 1)
    assert.deepEqual(pickPrompts([], 'x', 2), [])
  })
})

describe('journalDay', () => {
  it('is the UTC date', () => {
    assert.equal(journalDay(new Date('2026-10-05T23:30:00-05:00')), '2026-10-06')
  })
})

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

describe('pickUnanswered', () => {
  const ids = (n: number) => new Set(CATALOGUE.slice(0, n).map((p) => p.id))
  const none = new Set<string>()

  it('never offers an answered prompt while any is left', () => {
    // 39 of 40 answered: only one prompt is possible, for every seed.
    for (let s = 0; s < 20; s++) {
      assert.equal(pickUnanswered(CATALOGUE, ids(39), none, `seed-${s}`)?.id, 'id-39')
    }
  })

  it('avoids today\'s journal topics when it can', () => {
    const avoid = new Set(['id-38', 'id-39'])
    for (let s = 0; s < 20; s++) {
      const picked = pickUnanswered(CATALOGUE, ids(37), avoid, `seed-${s}`)
      assert.equal(picked?.id, 'id-37')
    }
  })

  it('offers an avoided prompt rather than an answered one', () => {
    assert.equal(pickUnanswered(CATALOGUE, ids(39), new Set(['id-39']), 'x')?.id, 'id-39')
  })

  it('is stable for the same seed and answers', () => {
    assert.deepEqual(pickUnanswered(CATALOGUE, ids(5), none, 'a|2026-10-05'), pickUnanswered(CATALOGUE, ids(5), none, 'a|2026-10-05'))
  })

  it('repeats only once everything has been answered', () => {
    assert.ok(pickUnanswered(CATALOGUE, ids(40), none, 'x'))
    assert.equal(pickUnanswered([], none, none, 'x'), null)
  })
})
