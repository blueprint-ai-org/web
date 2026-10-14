/**
 * `initialAvatarId` — which tile a picker opens on.
 *
 * The student's pick wins only while it is still in the catalogue; otherwise
 * the tenant's `isDefault` row, which replaced a hard-coded avatar-3.
 *
 * Run: npx tsx --test --test-force-exit app/lib/student/avatars.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { initialAvatarId, type PickableAvatar } from './avatars.ts'

const avatar = (id: string, isDefault = false): PickableAvatar => ({ id, key: id, src: null, bg: '#000', isDefault })
const CATALOGUE = [avatar('a'), avatar('b', true), avatar('c')]

describe('initialAvatarId', () => {
  it("opens on the student's own pick", () => {
    assert.equal(initialAvatarId(CATALOGUE, 'c'), 'c')
  })

  it('falls back to the tenant default when there is no pick, or the pick was removed', () => {
    assert.equal(initialAvatarId(CATALOGUE, null), 'b')
    assert.equal(initialAvatarId(CATALOGUE, 'gone'), 'b')
  })

  it('selects nothing when the tenant has no default', () => {
    assert.equal(initialAvatarId([avatar('a')], null), null)
  })
})
