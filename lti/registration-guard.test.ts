// Regression tests for step-12 §1 — `/lti/register` used to be wide open.
//
// Against the pre-step-12 handler every case below returns 502 (it goes
// straight to the fetch) instead of 401/403/503.
//
// Run: npx tsx --test lti/registration-guard.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response } from 'express'

import {
  assertOpenIdConfigAllowed,
  assertRegistrationAuthorized,
  RegistrationRejected,
} from './registration-guard.js'
import { _handleDynamicRegistrationWithDeps } from './dynamic-registration.js'

const SECRET = 'super-secret-registration-token'

function req(query: Record<string, string>, headers: Record<string, string> = {}) {
  return { query, headers, body: {} } as unknown as Request
}

function fakeRes() {
  const captured = { status: 0, body: '' }
  const res = {
    status(code: number) {
      captured.status = code
      return res
    },
    type() {
      return res
    },
    send(payload: string) {
      captured.body = payload
      return res
    },
  }
  return { res: res as unknown as Response, captured }
}

let savedSecret: string | undefined
let savedHosts: string | undefined

beforeEach(() => {
  savedSecret = process.env.LTI_REGISTRATION_SECRET
  savedHosts = process.env.LTI_REGISTRATION_ALLOWED_HOSTS
})
afterEach(() => {
  if (savedSecret === undefined) delete process.env.LTI_REGISTRATION_SECRET
  else process.env.LTI_REGISTRATION_SECRET = savedSecret
  if (savedHosts === undefined) delete process.env.LTI_REGISTRATION_ALLOWED_HOSTS
  else process.env.LTI_REGISTRATION_ALLOWED_HOSTS = savedHosts
})

describe('assertRegistrationAuthorized', () => {
  it('fails closed with 503 when no secret is configured', () => {
    delete process.env.LTI_REGISTRATION_SECRET
    assert.throws(
      () => assertRegistrationAuthorized(req({})),
      (e: RegistrationRejected) => e.status === 503
    )
  })

  it('rejects a request with no secret', () => {
    process.env.LTI_REGISTRATION_SECRET = SECRET
    assert.throws(
      () => assertRegistrationAuthorized(req({})),
      (e: RegistrationRejected) => e.status === 401
    )
  })

  it('rejects a wrong secret', () => {
    process.env.LTI_REGISTRATION_SECRET = SECRET
    assert.throws(
      () => assertRegistrationAuthorized(req({ registration_secret: 'nope' })),
      (e: RegistrationRejected) => e.status === 401
    )
  })

  it('accepts the secret as a query param', () => {
    process.env.LTI_REGISTRATION_SECRET = SECRET
    assert.doesNotThrow(() =>
      assertRegistrationAuthorized(req({ registration_secret: SECRET }))
    )
  })

  it('accepts the secret as a bearer header', () => {
    process.env.LTI_REGISTRATION_SECRET = SECRET
    assert.doesNotThrow(() =>
      assertRegistrationAuthorized(req({}, { authorization: `Bearer ${SECRET}` }))
    )
  })
})

describe('assertOpenIdConfigAllowed', () => {
  it('accepts an Instructure host by default', () => {
    delete process.env.LTI_REGISTRATION_ALLOWED_HOSTS
    assert.doesNotThrow(() =>
      assertOpenIdConfigAllowed(
        'https://blueprint.instructure.com/api/lti/security/openid-configuration'
      )
    )
  })

  it('rejects an arbitrary host (SSRF / rogue issuer)', () => {
    delete process.env.LTI_REGISTRATION_ALLOWED_HOSTS
    assert.throws(
      () => assertOpenIdConfigAllowed('https://attacker.example/openid-configuration'),
      (e: RegistrationRejected) => e.status === 403
    )
  })

  it('rejects a link-local / internal target', () => {
    delete process.env.LTI_REGISTRATION_ALLOWED_HOSTS
    assert.throws(
      () => assertOpenIdConfigAllowed('http://169.254.169.254/latest/meta-data/'),
      (e: RegistrationRejected) => e.status === 400
    )
  })

  it('honours an explicit allowlist', () => {
    process.env.LTI_REGISTRATION_ALLOWED_HOSTS = 'lms.example.edu'
    assert.doesNotThrow(() =>
      assertOpenIdConfigAllowed('https://lms.example.edu/.well-known/openid-configuration')
    )
    assert.throws(() => assertOpenIdConfigAllowed('https://canvas.instructure.com/x'))
  })
})

describe('handleDynamicRegistration gates before fetching', () => {
  function neverFetch(): typeof fetch {
    return (() => {
      throw new Error('fetch must not be reached')
    }) as unknown as typeof fetch
  }

  it('401s an unauthenticated register call without fetching', async () => {
    process.env.LTI_REGISTRATION_SECRET = SECRET
    const { res, captured } = fakeRes()
    await _handleDynamicRegistrationWithDeps(
      req({
        openid_configuration: 'https://canvas.instructure.com/openid-configuration',
        registration_token: 'tok',
      }),
      res,
      { registerPlatform: async () => undefined, fetchImpl: neverFetch() }
    )
    assert.equal(captured.status, 401)
  })

  it('403s an off-allowlist openid_configuration without fetching', async () => {
    process.env.LTI_REGISTRATION_SECRET = SECRET
    delete process.env.LTI_REGISTRATION_ALLOWED_HOSTS
    const { res, captured } = fakeRes()
    await _handleDynamicRegistrationWithDeps(
      req({
        registration_secret: SECRET,
        openid_configuration: 'https://attacker.example/openid-configuration',
        registration_token: 'tok',
      }),
      res,
      { registerPlatform: async () => undefined, fetchImpl: neverFetch() }
    )
    assert.equal(captured.status, 403)
  })
})
