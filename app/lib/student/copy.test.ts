/**
 * The shared crisis copy (plan 2026-10-21 step-11, PROVISIONAL D15).
 *
 * Pure. Run: npx tsx --test app/lib/student/copy.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { studentCopy } from './copy.ts'

describe('crisisSupportLine', () => {
  it('names both the 988 Lifeline and the 741741 Crisis Text Line', () => {
    assert.ok(studentCopy.crisisSupportLine.includes('988'))
    assert.ok(studentCopy.crisisSupportLine.includes('741741'))
  })
})
