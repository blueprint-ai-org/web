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

import { MESSAGES, validateInvite, validateJoin, validateLogin } from './validate.ts'
import type { FieldErrors, InviteField, JoinField, LoginField, PasswordPolicy } from './validate.ts'

const GOOD_EMAIL = 'student@example.com'
const GOOD_PASSWORD = 'Passw0rd-long-enough'
const GOOD_NAME = 'Ada Lovelace'
const GOOD_CODE = 'K7QX2MPR9D'

/**
 * Deliberately NOT authentication's numbers: the rule must follow whatever
 * policy it is handed, and a fixture equal to the server's would pass just as
 * well against a constant copied into `validate.ts`.
 */
const POLICY: PasswordPolicy = { minLength: 10, maxBytes: 24 }

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

  it('does NOT apply the new-password length rule to the login password', () => {
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

describe('validateJoin', () => {
  it('accepts a code, a name and a well-formed email', () => {
    assert.deepEqual(validateJoin({ code: GOOD_CODE, name: GOOD_NAME, email: GOOD_EMAIL }), {})
  })

  it('flags all three fields on a blank form, whitespace counting as blank', () => {
    assert.deepEqual(validateJoin({ code: '  ', name: '\t', email: ' ' }), {
      code: MESSAGES.codeRequired,
      name: MESSAGES.nameRequired,
      email: MESSAGES.emailRequired,
    } satisfies FieldErrors<JoinField>)
  })

  it('rejects a malformed email', () => {
    assert.deepEqual(validateJoin({ code: GOOD_CODE, name: GOOD_NAME, email: 'a@b' }), {
      email: MESSAGES.emailShape,
    })
  })

  it('does not judge the code’s shape — that is authentication’s rule', () => {
    assert.deepEqual(validateJoin({ code: 'x', name: GOOD_NAME, email: GOOD_EMAIL }), {})
  })
})

describe('validateInvite', () => {
  it('accepts a long-enough password typed twice', () => {
    const errors: FieldErrors<InviteField> = validateInvite(
      { password: GOOD_PASSWORD, confirm: GOOD_PASSWORD },
      POLICY,
    )
    assert.deepEqual(errors, {})
  })

  it('asks for both fields when the form is blank', () => {
    assert.deepEqual(validateInvite({ password: '', confirm: '' }, POLICY), {
      password: MESSAGES.passwordRequired,
      confirm: MESSAGES.confirmRequired,
    })
  })

  it('applies the policy’s minimum, with the number from the policy', () => {
    const short = 'a'.repeat(9)
    assert.equal(validateInvite({ password: short, confirm: short }, POLICY).password, 'Use at least 10 characters.')
    const exact = 'a'.repeat(10)
    assert.deepEqual(validateInvite({ password: exact, confirm: exact }, POLICY), {})
  })

  it('counts the minimum in characters, not UTF-16 units', () => {
    // Nine emoji are 18 UTF-16 units; `.length` would call this long enough.
    const emoji = '😀'.repeat(9)
    assert.equal(validateInvite({ password: emoji, confirm: emoji }, POLICY).password, 'Use at least 10 characters.')
  })

  it('counts the maximum in bytes, not characters', () => {
    // 12 characters — over the minimum — but 25 UTF-8 bytes, one over the cap.
    const accented = 'é'.repeat(12) + 'a'
    assert.equal(validateInvite({ password: accented, confirm: accented }, POLICY).password, MESSAGES.passwordTooLong)
    const atCap = 'é'.repeat(12)
    assert.deepEqual(validateInvite({ password: atCap, confirm: atCap }, POLICY), {})
  })

  it('without a policy, checks presence only and leaves length to the server', () => {
    assert.deepEqual(validateInvite({ password: 'a', confirm: 'a' }, null), {})
    assert.equal(validateInvite({ password: '', confirm: '' }, null).password, MESSAGES.passwordRequired)
  })

  it('reports a mismatch on the confirmation field, not on the password', () => {
    const errors = validateInvite({ password: GOOD_PASSWORD, confirm: `${GOOD_PASSWORD}x` }, POLICY)
    assert.deepEqual(errors, { confirm: MESSAGES.confirmMismatch })
  })

  it('does not report a mismatch while the password itself is invalid', () => {
    // "Those passwords don’t match" under "use at least 10 characters" describes
    // a problem the user cannot fix until they fix the other one.
    const errors = validateInvite({ password: 'short', confirm: 'different' }, POLICY)
    assert.deepEqual(errors, { password: 'Use at least 10 characters.' })
  })

  it('treats a blank confirmation as missing rather than as a mismatch', () => {
    assert.equal(validateInvite({ password: GOOD_PASSWORD, confirm: '' }, POLICY).confirm, MESSAGES.confirmRequired)
  })

  it('does not trim either field — a space is a real character in a password', () => {
    const spaced = ` ${GOOD_PASSWORD} `
    assert.deepEqual(validateInvite({ password: spaced, confirm: spaced }, POLICY), {})
    assert.deepEqual(validateInvite({ password: spaced, confirm: GOOD_PASSWORD }, POLICY), {
      confirm: MESSAGES.confirmMismatch,
    })
  })
})

describe('validate purity', () => {
  it('does not mutate the form object it is given', () => {
    const form = { email: `  ${GOOD_EMAIL} `, password: GOOD_PASSWORD, name: ` ${GOOD_NAME} `, code: ` ${GOOD_CODE} ` }
    const snapshot = { ...form }
    validateJoin(form)
    validateLogin(form)
    validateInvite({ password: form.password, confirm: form.password }, POLICY)
    assert.deepEqual(form, snapshot)
  })

  it('returns a fresh object each call, so callers can mutate the result', () => {
    const a = validateLogin({ email: '', password: '' })
    const b = validateLogin({ email: '', password: '' })
    assert.notEqual(a, b)
    assert.deepEqual(a, b)
  })
})
