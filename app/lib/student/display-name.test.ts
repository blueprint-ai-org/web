/**
 * Truth table for {@link preferredName}.
 *
 * Pure and isomorphic, like `bp-ai/validate.ts` — no env, no fetch stub, no
 * dynamic import. Run: npx tsx --test app/lib/student/display-name.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { preferredName } from './display-name.ts'

// Five cases left with step-7, and the ones that went are the point: the BP AI
// half of this table (`first_name` before `display_name`, because "Hi {name}!"
// wants a first name and a SIS `display_name` is often "Last, First") is now
// `me { preferred_name }`. It was the same rule in two frontends with nothing
// keeping them in step; the gateway answers it once, and
// `apps/api/graph/auth_payload_test.go` has the table now.

describe('preferredName — the LTI fallback, and nothing else', () => {
  it('takes the LTI given name for a launch with no BP AI record', () => {
    assert.equal(preferredName({ ltiGivenName: 'Ada', ltiName: 'Ada Lovelace' }), 'Ada')
  })

  it('falls back to the LTI full name last', () => {
    assert.equal(preferredName({ ltiName: 'Ada Lovelace' }), 'Ada Lovelace')
  })

  it('returns null when nothing is known', () => {
    // The honest fourth case: the caller renders its own default. A fallback
    // string here would make "we could not reach the gateway" indistinguishable
    // from "this person is called Sophie".
    assert.equal(preferredName({}), null)
  })

  it('treats blank, whitespace-only and null as absent', () => {
    assert.equal(preferredName({ ltiGivenName: '', ltiName: 'Ada Lovelace' }), 'Ada Lovelace')
    assert.equal(preferredName({ ltiGivenName: '   ', ltiName: 'Ada Lovelace' }), 'Ada Lovelace')
    assert.equal(preferredName({ ltiGivenName: null, ltiName: 'Ada Lovelace' }), 'Ada Lovelace')
    assert.equal(preferredName({ ltiGivenName: '  ', ltiName: '  ' }), null)
  })

  it('trims what it returns', () => {
    assert.equal(preferredName({ ltiGivenName: '  Ada \n' }), 'Ada')
  })

  it('ignores a non-string that slipped through an untyped claim bag', () => {
    // `LtiToken` is `any`-derived from ltijs, so these can arrive.
    const claims = { ltiGivenName: 42 as unknown as string, ltiName: 'Ada Lovelace' }
    assert.equal(preferredName(claims), 'Ada Lovelace')
  })
})
