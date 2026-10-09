// Regression test for step-12 §3 — the nonce must survive a bad signature.
//
// `handleValidate` used to call `consumeNonce` FIRST and verify the id_token
// afterwards. Anyone who could observe a (state, nonce) pair could therefore
// POST it with a junk id_token and permanently burn it: the delete landed,
// verification then failed, and the legitimate launch that followed hit
// MISSING_OR_USED_NONCE. Against that code `consumeNonce` is called exactly
// once here and this test fails.
//
// Run: npx tsx --test lti/validate-order.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'
import type { Request, Response } from 'express'

import { CLAIM_DEPLOYMENT_ID, CLAIM_MESSAGE_TYPE } from './launch-claims.js'

// lti/session.ts snapshots LTI_KEY at module load to sign the lti-claims JWT;
// a zero-length HS256 key throws. Seed it, then import the module under test.
process.env.LTI_KEY ??= 'test-lti-key-0123456789abcdef0123456789abcdef'
const { _handleValidateWithDeps } = await import('./cookieless.js')
type ValidateDeps = import('./cookieless.js').ValidateDeps

const ISS = 'https://canvas.instructure.com'
const AUD = 'client-123'
const NONCE = 'nonce-abc'
const STATE = 'state-xyz'

const PLATFORM = {
  iss: ISS,
  clientId: AUD,
  authEndpoint: 'https://sso.canvaslms.com/api/lti/authorize_redirect',
  tokenEndpoint: 'https://sso.canvaslms.com/login/oauth2/token',
  jwksUrl: 'https://sso.canvaslms.com/api/lti/security/jwks',
}

async function idToken(): Promise<string> {
  // Unsigned-as-far-as-this-test-cares: the verify seam decides accept/reject,
  // so an HS256 token with the right claim shape is enough to get past decode.
  return new SignJWT({
    nonce: NONCE,
    [CLAIM_DEPLOYMENT_ID]: 'dep-1',
    [CLAIM_MESSAGE_TYPE]: 'LtiResourceLinkRequest',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISS)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode('irrelevant-to-the-seam-under-test'))
}

function fakeRes() {
  const captured = { status: 0, body: '', redirected: '' }
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
    redirect(url: string) {
      captured.redirected = url
      return res
    },
    setHeader() {
      return res
    },
    cookie() {
      return res
    },
  }
  return { res: res as unknown as Response, captured }
}

function deps(overrides: Partial<ValidateDeps>, calls: { consume: number }): ValidateDeps {
  return {
    getPlatformConfig: async () => PLATFORM,
    verifyIdToken: async () => {
      throw new Error('signature verification failed')
    },
    consumeNonce: async () => {
      calls.consume += 1
      return true
    },
    ...overrides,
  } as ValidateDeps
}

describe('handleValidate ordering', () => {
  it('does NOT consume the nonce when the signature is invalid', async () => {
    const calls = { consume: 0 }
    const { res, captured } = fakeRes()
    const req = {
      body: { state: STATE, id_token: await idToken(), nonce: NONCE },
    } as unknown as Request

    await _handleValidateWithDeps(req, res, deps({}, calls))

    assert.equal(captured.status, 401, 'invalid signature must 401')
    assert.match(captured.body, /verification failed/)
    assert.equal(
      calls.consume,
      0,
      'consumeNonce must not run when the id_token fails verification'
    )
  })

  it('consumes the nonce exactly once on a valid launch', async () => {
    const calls = { consume: 0 }
    const { res, captured } = fakeRes()
    const req = {
      body: { state: STATE, id_token: await idToken(), nonce: NONCE },
    } as unknown as Request

    await _handleValidateWithDeps(
      req,
      res,
      deps(
        {
          verifyIdToken: async () => ({
            sub: 'user-1',
            nonce: NONCE,
            [CLAIM_DEPLOYMENT_ID]: 'dep-1',
            [CLAIM_MESSAGE_TYPE]: 'LtiResourceLinkRequest',
          }),
        },
        calls
      )
    )

    assert.equal(calls.consume, 1)
    assert.match(captured.redirected, /^\/app\?lti_session=/)
  })

  it('rejects a replayed nonce (consume returns false) after verification', async () => {
    const calls = { consume: 0 }
    const { res, captured } = fakeRes()
    const req = {
      body: { state: STATE, id_token: await idToken(), nonce: NONCE },
    } as unknown as Request

    await _handleValidateWithDeps(req, res, {
      getPlatformConfig: async () => PLATFORM,
      verifyIdToken: async () => ({
        sub: 'user-1',
        nonce: NONCE,
        [CLAIM_DEPLOYMENT_ID]: 'dep-1',
        [CLAIM_MESSAGE_TYPE]: 'LtiResourceLinkRequest',
      }),
      consumeNonce: async () => {
        calls.consume += 1
        return false
      },
    } as unknown as ValidateDeps)

    assert.equal(calls.consume, 1)
    assert.equal(captured.status, 401)
    assert.equal(captured.body, 'MISSING_OR_USED_NONCE')
  })
})
