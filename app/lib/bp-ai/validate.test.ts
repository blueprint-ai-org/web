/**
 * Truth table for the isomorphic credential-form validators.
 *
 * `node:test` under `tsx` — **vitest is intentionally not installed in this
 * repo**. Run: npx tsx --test app/lib/bp-ai/validate.test.ts
 *
 * `validate.ts` is pure: no env, no imports, no I/O. So is this file — it needs
 * neither a fetch stub nor a dynamic import, which is the property Phase 6
 * depends on when it runs the same functions in the browser.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  MESSAGES,
  MIN_PASSWORD_LENGTH,
  validateInvite,
  validateLogin,
  validateSignup,
} from './validate.ts'
import type { FieldErrors, InviteField, LoginField, SignupField } from './validate.ts'

const GOOD_EMAIL = 'student@example.com'
const GOOD_PASSWORD = 'Passw0rd-long-enough'
const GOOD_NAME = 'Ada Lovelace'

/** Every address the shape check must accept. */
const VALID_EMAILS = [
  'student@example.com',
  'first.last@sub.domain.co.uk',
  'x+tag@example.org',
  "o'brien@example.com",
  'UPPER@EXAMPLE.COM',
]

/**
 * Every address it must reject. `a@b` is in here deliberately: it is a
 * technically routable address that no real user has, and requiring a dot in
 * the domain catches far more typos than it costs.
 */
const INVALID_EMAILS = [
  'no-at-sign',
  '@example.com',
  'student@',
  'a@b',
  'two@at@example.com',
  'student @example.com',
  'student@exa mple.com',
]

describe('validateLogin', () => {
  it('accepts a well-formed email and any non-empty password', () => {
    const errors = validateLogin({ email: GOOD_EMAIL, password: 'x' })
    assert.deepEqual(errors, {})
  })

  it('flags both fields on a blank form', () => {
    const errors = validateLogin({ email: '', password: '' })
    assert.deepEqual(errors, {
      email: MESSAGES.emailRequired,
      password: MESSAGES.passwordRequired,
    } satisfies FieldErrors<LoginField>)
  })

  it('treats a whitespace-only email as absent', () => {
    const errors = validateLogin({ email: '   ', password: GOOD_PASSWORD })
    assert.deepEqual(errors, { email: MESSAGES.emailRequired })
  })

  it('validates the trimmed email, so surrounding whitespace is not an error', () => {
    const errors = validateLogin({ email: `  ${GOOD_EMAIL}  `, password: GOOD_PASSWORD })
    assert.deepEqual(errors, {})
  })

  it('does NOT apply the signup length rule to the login password', () => {
    // Deliberate: an account predating any policy must still be able to log in,
    // and the login screen must not hand a stranger our password constraints.
    const errors = validateLogin({ email: GOOD_EMAIL, password: 'short' })
    assert.deepEqual(errors, {})
  })

  it('does not trim the password — a space is a legal character', () => {
    const errors = validateLogin({ email: GOOD_EMAIL, password: '   ' })
    assert.deepEqual(errors, {})
  })

  for (const email of VALID_EMAILS) {
    it(`accepts ${JSON.stringify(email)}`, () => {
      assert.deepEqual(validateLogin({ email, password: GOOD_PASSWORD }), {})
    })
  }

  for (const email of INVALID_EMAILS) {
    it(`rejects ${JSON.stringify(email)} with the shape message`, () => {
      assert.deepEqual(validateLogin({ email, password: GOOD_PASSWORD }), {
        email: MESSAGES.emailShape,
      })
    })
  }
})

describe('validateSignup', () => {
  it('accepts a well-formed email, a long-enough password and a name', () => {
    const errors = validateSignup({
      email: GOOD_EMAIL,
      password: GOOD_PASSWORD,
      name: GOOD_NAME,
    })
    assert.deepEqual(errors, {})
  })

  it('flags all three fields on a blank form', () => {
    const errors = validateSignup({ email: '', password: '', name: '' })
    assert.deepEqual(errors, {
      email: MESSAGES.emailRequired,
      password: MESSAGES.passwordRequired,
      name: MESSAGES.nameRequired,
    } satisfies FieldErrors<SignupField>)
  })

  it(`rejects a password of ${MIN_PASSWORD_LENGTH - 1} characters`, () => {
    const errors = validateSignup({
      email: GOOD_EMAIL,
      password: 'a'.repeat(MIN_PASSWORD_LENGTH - 1),
      name: GOOD_NAME,
    })
    assert.deepEqual(errors, { password: MESSAGES.passwordTooShort })
  })

  it(`accepts a password of exactly ${MIN_PASSWORD_LENGTH} characters (boundary)`, () => {
    const errors = validateSignup({
      email: GOOD_EMAIL,
      password: 'a'.repeat(MIN_PASSWORD_LENGTH),
      name: GOOD_NAME,
    })
    assert.deepEqual(errors, {})
  })

  it('says "required", not "too short", for a blank password', () => {
    const errors = validateSignup({ email: GOOD_EMAIL, password: '', name: GOOD_NAME })
    assert.deepEqual(errors, { password: MESSAGES.passwordRequired })
  })

  it('counts whitespace toward the password length', () => {
    // The password is never trimmed, so 8 spaces is 8 characters. Odd but
    // consistent: whatever the user typed is what we send to the gateway.
    const errors = validateSignup({
      email: GOOD_EMAIL,
      password: ' '.repeat(MIN_PASSWORD_LENGTH),
      name: GOOD_NAME,
    })
    assert.deepEqual(errors, {})
  })

  it('treats a whitespace-only name as absent', () => {
    const errors = validateSignup({ email: GOOD_EMAIL, password: GOOD_PASSWORD, name: '  \t ' })
    assert.deepEqual(errors, { name: MESSAGES.nameRequired })
  })

  it('accepts a single-character name', () => {
    const errors = validateSignup({ email: GOOD_EMAIL, password: GOOD_PASSWORD, name: 'X' })
    assert.deepEqual(errors, {})
  })

  it('reports the email shape and the password length independently', () => {
    const errors = validateSignup({ email: 'nope', password: 'short', name: GOOD_NAME })
    assert.deepEqual(errors, {
      email: MESSAGES.emailShape,
      password: MESSAGES.passwordTooShort,
    })
  })

  for (const email of INVALID_EMAILS) {
    it(`rejects ${JSON.stringify(email)} with the shape message`, () => {
      assert.deepEqual(
        validateSignup({ email, password: GOOD_PASSWORD, name: GOOD_NAME }),
        { email: MESSAGES.emailShape },
      )
    })
  }
})

describe('validateInvite', () => {
  it('accepts a long-enough password typed twice', () => {
    const errors: FieldErrors<InviteField> = validateInvite({
      password: GOOD_PASSWORD,
      confirm: GOOD_PASSWORD,
    })
    assert.deepEqual(errors, {})
  })

  it('asks for both fields when the form is blank', () => {
    assert.deepEqual(validateInvite({ password: '', confirm: '' }), {
      password: MESSAGES.passwordRequired,
      confirm: MESSAGES.confirmRequired,
    })
  })

  it('applies the same floor as signup', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    assert.equal(validateInvite({ password: short, confirm: short }).password, MESSAGES.passwordTooShort)
  })

  it('reports a mismatch on the confirmation field, not on the password', () => {
    const errors = validateInvite({ password: GOOD_PASSWORD, confirm: `${GOOD_PASSWORD}x` })
    assert.deepEqual(errors, { confirm: MESSAGES.confirmMismatch })
  })

  it('does not report a mismatch while the password itself is invalid', () => {
    // "Those passwords don’t match" under "use at least 8 characters" describes
    // a problem the user cannot fix until they fix the other one.
    const errors = validateInvite({ password: 'short', confirm: 'different' })
    assert.deepEqual(errors, { password: MESSAGES.passwordTooShort })
  })

  it('treats a blank confirmation as missing rather than as a mismatch', () => {
    assert.equal(validateInvite({ password: GOOD_PASSWORD, confirm: '' }).confirm, MESSAGES.confirmRequired)
  })

  it('does not trim either field — a space is a real character in a password', () => {
    const spaced = ` ${GOOD_PASSWORD} `
    assert.deepEqual(validateInvite({ password: spaced, confirm: spaced }), {})
    assert.deepEqual(validateInvite({ password: spaced, confirm: GOOD_PASSWORD }), {
      confirm: MESSAGES.confirmMismatch,
    })
  })
})

describe('validate purity', () => {
  it('does not mutate the form object it is given', () => {
    const form = { email: `  ${GOOD_EMAIL} `, password: GOOD_PASSWORD, name: ` ${GOOD_NAME} ` }
    const snapshot = { ...form }
    validateSignup(form)
    validateLogin(form)
    validateInvite({ password: form.password, confirm: form.password })
    assert.deepEqual(form, snapshot)
  })

  it('returns a fresh object each call, so callers can mutate the result', () => {
    const a = validateLogin({ email: '', password: '' })
    const b = validateLogin({ email: '', password: '' })
    assert.notEqual(a, b)
    assert.deepEqual(a, b)
  })
})
