// Test runner choice: node:test + tsx. `vitest` is not installed; adding
// it would pull in ~70 transitive deps. node:test ships with Node 22 and
// runs under tsx with zero additional config.
//
// Run: cd lti-server-test && npx tsx --test lti/verify.test.ts
//
// We verify the *signature-validating* path of verifyIdToken via the
// internal `_verifyIdTokenWithJWKS` helper, passing a locally-generated
// RSA keypair instead of going over HTTP. This exercises the same jose
// jwtVerify call shape as production while staying hermetic.
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'

import { _verifyIdTokenWithJWKS } from './verify.js'

const ISS = 'https://canvas.instructure.com'
const AUD = '294890000000000001'
const NONCE = 'good-nonce-123'

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
  const publicJwk = await exportJWK(publicKey)
  publicJwk.alg = 'RS256'
  publicJwk.use = 'sig'
  publicJwk.kid = 'test-key-1'
  return { publicKey, privateKey, publicJwk }
}

async function makeToken(
  privateKey: CryptoKey,
  overrides: { iss?: string; aud?: string; nonce?: string; exp?: number } = {}
) {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ nonce: overrides.nonce ?? NONCE })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuer(overrides.iss ?? ISS)
    .setAudience(overrides.aud ?? AUD)
    .setIssuedAt(now)
    .setExpirationTime(overrides.exp ?? now + 60)
    .sign(privateKey)
}

test('verifyIdToken accepts a well-formed token', async () => {
  const { privateKey, publicKey } = await setup()
  const token = await makeToken(privateKey)
  const payload = await _verifyIdTokenWithJWKS(token, { iss: ISS, aud: AUD, nonce: NONCE }, publicKey)
  assert.equal(payload.iss, ISS)
  assert.equal(payload.aud, AUD)
  assert.equal(payload.nonce, NONCE)
})

test('verifyIdToken rejects wrong issuer', async () => {
  const { privateKey, publicKey } = await setup()
  const token = await makeToken(privateKey, { iss: 'https://evil.example.com' })
  await assert.rejects(
    _verifyIdTokenWithJWKS(token, { iss: ISS, aud: AUD, nonce: NONCE }, publicKey),
    /iss/i
  )
})

test('verifyIdToken rejects wrong audience', async () => {
  const { privateKey, publicKey } = await setup()
  const token = await makeToken(privateKey, { aud: 'wrong-client-id' })
  await assert.rejects(
    _verifyIdTokenWithJWKS(token, { iss: ISS, aud: AUD, nonce: NONCE }, publicKey),
    /aud/i
  )
})

test('verifyIdToken rejects wrong nonce', async () => {
  const { privateKey, publicKey } = await setup()
  const token = await makeToken(privateKey, { nonce: 'attacker-nonce' })
  await assert.rejects(
    _verifyIdTokenWithJWKS(token, { iss: ISS, aud: AUD, nonce: NONCE }, publicKey),
    /nonce mismatch/
  )
})

test('verifyIdToken rejects expired token', async () => {
  const { privateKey, publicKey } = await setup()
  const past = Math.floor(Date.now() / 1000) - 10
  const token = await makeToken(privateKey, { exp: past })
  await assert.rejects(
    _verifyIdTokenWithJWKS(token, { iss: ISS, aud: AUD, nonce: NONCE }, publicKey),
    /exp/i
  )
})
