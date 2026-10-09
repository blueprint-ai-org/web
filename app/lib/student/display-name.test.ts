/**
 * Truth table for {@link preferredName}.
 *
 * Pure and isomorphic, like `bp-ai/validate.ts` — no env, no fetch stub, no
 * dynamic import. Run: npx tsx --test app/lib/student/display-name.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { preferredName } from './display-name.ts'

describe('preferredName', () => {
  it('prefers the first name over the display name', () => {
    // The surfaces say "Hi {name}!" — a first name is what that sentence wants,
    // and a SIS-provided display_name is often "Last, First".
    assert.equal(preferredName({ firstName: 'Sergio', displayName: 'EQ, Sergio' }), 'Sergio')
  })

  it('falls back to the display name when there is no first name', () => {
    assert.equal(preferredName({ displayName: 'Sergio EQ' }), 'Sergio EQ')
  })

  it('falls back to the LTI given name for a launch with no BP AI record', () => {
    assert.equal(preferredName({ ltiGivenName: 'Ada', ltiName: 'Ada Lovelace' }), 'Ada')
  })

  it('falls back to the LTI full name last', () => {
    assert.equal(preferredName({ ltiName: 'Ada Lovelace' }), 'Ada Lovelace')
  })

  it('prefers a BP AI name over an LTI claim when both are present', () => {
    assert.equal(preferredName({ firstName: 'Sergio', ltiGivenName: 'Ada' }), 'Sergio')
  })

  it('returns null when nothing is known', () => {
    // The honest fourth case: the caller renders its own default. A fallback
    // string here would make "we could not reach the gateway" indistinguishable
    // from "this person is called Sophie".
    assert.equal(preferredName({}), null)
  })

  it('treats blank, whitespace-only and null as absent', () => {
    assert.equal(preferredName({ firstName: '', displayName: 'Sergio EQ' }), 'Sergio EQ')
    assert.equal(preferredName({ firstName: '   ', displayName: 'Sergio EQ' }), 'Sergio EQ')
    assert.equal(preferredName({ firstName: null, displayName: 'Sergio EQ' }), 'Sergio EQ')
    assert.equal(preferredName({ firstName: '  ', displayName: '  ' }), null)
  })

  it('trims what it returns', () => {
    assert.equal(preferredName({ firstName: '  Sergio \n' }), 'Sergio')
  })

  it('ignores a non-string that slipped through an untyped claim bag', () => {
    // `LtiToken` is `any`-derived from ltijs, so these can arrive.
    const claims = { ltiGivenName: 42 as unknown as string, ltiName: 'Ada Lovelace' }
    assert.equal(preferredName(claims), 'Ada Lovelace')
  })
})
