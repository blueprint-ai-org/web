// Regression tests for step-12 §2 — deployment/message/azp validation.
//
// Against the pre-step-12 code these fail: `deployment_id`, `message_type`
// and `azp` were never compared to anything, so `verifyIdToken` accepted a
// token minted for any deployment of a registered (iss, client_id) pair.
//
// Run: npx tsx --test lti/launch-claims.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'

import { _verifyIdTokenWithJWKS } from './verify.js'
import {
  assertLaunchClaims,
  CLAIM_DEPLOYMENT_ID,
  CLAIM_MESSAGE_TYPE,
} from './launch-claims.js'

const ISS = 'https://canvas.instructure.com'
const AUD = '294890000000000001'
const NONCE = 'good-nonce-123'
const DEPLOYMENT = 'deployment-we-registered'

function payload(overrides: Record<string, unknown> = {}) {
  return {
    nonce: NONCE,
    [CLAIM_DEPLOYMENT_ID]: DEPLOYMENT,
    [CLAIM_MESSAGE_TYPE]: 'LtiResourceLinkRequest',
    ...overrides,
  }
}

describe('assertLaunchClaims', () => {
  it('accepts a launch from an allowlisted deployment', () => {
    assert.doesNotThrow(() =>
      assertLaunchClaims(payload(), {
        clientId: AUD,
        allowedDeploymentIds: [DEPLOYMENT],
      })
    )
  })

  it('rejects an unexpected deployment_id', () => {
    assert.throws(
      () =>
        assertLaunchClaims(payload({ [CLAIM_DEPLOYMENT_ID]: 'someone-elses' }), {
          clientId: AUD,
          allowedDeploymentIds: [DEPLOYMENT],
        }),
      /unexpected deployment_id/
    )
  })

  it('rejects a missing deployment_id even with no allowlist configured', () => {
    assert.throws(
      () =>
        assertLaunchClaims(payload({ [CLAIM_DEPLOYMENT_ID]: undefined }), {
          clientId: AUD,
        }),
      /missing deployment_id/
    )
  })

  it('rejects an unsupported message_type', () => {
    assert.throws(
      () =>
        assertLaunchClaims(payload({ [CLAIM_MESSAGE_TYPE]: 'LtiSubmissionReviewRequest' }), {
          clientId: AUD,
        }),
      /unsupported message_type/
    )
  })

  it('rejects an azp that is not our client_id', () => {
    assert.throws(
      () => assertLaunchClaims(payload({ azp: 'another-tool' }), { clientId: AUD }),
      /azp mismatch/
    )
  })

  it('requires azp on a multi-audience token', () => {
    assert.throws(
      () => assertLaunchClaims(payload({ aud: [AUD, 'other'] }), { clientId: AUD }),
      /azp required/
    )
  })
})

describe('verifyIdToken enforces launch claims end to end', () => {
  async function signed(claims: Record<string, unknown>) {
    const { privateKey, publicKey } = await generateKeyPair('RS256', {
      extractable: true,
    })
    const jwk = await exportJWK(publicKey)
    jwk.alg = 'RS256'
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISS)
      .setAudience(AUD)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
    return { token, publicKey }
  }

  it('accepts a correctly-scoped token', async () => {
    const { token, publicKey } = await signed(payload())
    const verified = await _verifyIdTokenWithJWKS(
      token,
      {
        iss: ISS,
        aud: AUD,
        nonce: NONCE,
        launch: { allowedDeploymentIds: [DEPLOYMENT] },
      },
      publicKey
    )
    assert.equal(verified[CLAIM_DEPLOYMENT_ID], DEPLOYMENT)
  })

  it('rejects a validly-signed token minted for another deployment', async () => {
    const { token, publicKey } = await signed(
      payload({ [CLAIM_DEPLOYMENT_ID]: 'attacker-deployment' })
    )
    await assert.rejects(
      () =>
        _verifyIdTokenWithJWKS(
          token,
          {
            iss: ISS,
            aud: AUD,
            nonce: NONCE,
            launch: { allowedDeploymentIds: [DEPLOYMENT] },
          },
          publicKey
        ),
      /unexpected deployment_id/
    )
  })

  it('leaves the launch checks off when `launch` is omitted (opt-in)', async () => {
    const { token, publicKey } = await signed({ nonce: NONCE })
    const verified = await _verifyIdTokenWithJWKS(
      token,
      { iss: ISS, aud: AUD, nonce: NONCE },
      publicKey
    )
    assert.equal(verified.nonce, NONCE)
  })
})
