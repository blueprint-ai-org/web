// Unit tests for the exported `makeIdToken` helper in `cookieless.qa.ts`.
//
// We only decode the resulting JWT's payload (base64url) — no signature
// verification is needed for these claims-shape assertions, and decoding
// keeps the test hermetic (no JWKS server, no Mongo, no Express app).
//
// Run: cd lti-server-test && npx tsx --test --test-force-exit lti/cookieless.qa.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { makeIdToken, DEFAULT_INSTRUCTOR_ROLE } from './cookieless.qa.js'

const ROLES_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/roles'
const CUSTOM_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/custom'

function decodePayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.')
  assert.equal(parts.length, 3, `expected 3 JWT segments, got ${parts.length}`)
  const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8')
  return JSON.parse(payloadJson) as Record<string, unknown>
}

test('makeIdToken defaults roles to Instructor when omitted', async () => {
  const jwt = await makeIdToken({ nonce: 'n-default' })
  const payload = decodePayload(jwt)
  assert.deepEqual(payload[ROLES_CLAIM], [DEFAULT_INSTRUCTOR_ROLE])
})

test('makeIdToken honors explicit roles override', async () => {
  const LEARNER = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'
  const jwt = await makeIdToken({ nonce: 'n-learner', roles: [LEARNER] })
  const payload = decodePayload(jwt)
  assert.deepEqual(payload[ROLES_CLAIM], [LEARNER])
})

test('makeIdToken includes custom claim when customFields provided', async () => {
  const jwt = await makeIdToken({
    nonce: 'n-custom',
    customFields: { lti_role: 'counselor' },
  })
  const payload = decodePayload(jwt)
  assert.deepEqual(payload[CUSTOM_CLAIM], { lti_role: 'counselor' })
})

test('makeIdToken omits custom claim entirely when customFields not provided', async () => {
  const jwt = await makeIdToken({ nonce: 'n-no-custom' })
  const payload = decodePayload(jwt)
  assert.equal(
    Object.prototype.hasOwnProperty.call(payload, CUSTOM_CLAIM),
    false,
    `expected payload to not have key '${CUSTOM_CLAIM}', got: ${JSON.stringify(payload)}`
  )
})
