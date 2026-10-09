// One-off QA script for step-5: imports the extended `makeIdToken`,
// calls it with non-default roles + customFields, decodes the JWT
// payload, and asserts both claims are present and correct.
//
// This script is intentionally not committed — it's a one-off harness
// the step's Automated QA bucket requires. Run from `lti-server-test/`:
//   npx tsx scripts/verify-makeidtoken.mjs
import { makeIdToken } from '../lti/cookieless.qa.ts'

const ROLES_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/roles'
const CUSTOM_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/custom'
const LEARNER = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'

function decode(jwt) {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    console.log(`FAIL: expected 3 JWT segments, got ${parts.length}`)
    process.exit(1)
  }
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}

const jwt = await makeIdToken({
  nonce: 'qa-nonce',
  roles: [LEARNER],
  customFields: { lti_role: 'counselor' },
})

const payload = decode(jwt)
const rolesOk = JSON.stringify(payload[ROLES_CLAIM]) === JSON.stringify([LEARNER])
const customOk =
  payload[CUSTOM_CLAIM] &&
  payload[CUSTOM_CLAIM].lti_role === 'counselor' &&
  Object.keys(payload[CUSTOM_CLAIM]).length === 1

if (!rolesOk) {
  console.log(`FAIL: roles claim mismatch -- got ${JSON.stringify(payload[ROLES_CLAIM])}`)
  process.exit(1)
}
if (!customOk) {
  console.log(`FAIL: custom claim mismatch -- got ${JSON.stringify(payload[CUSTOM_CLAIM])}`)
  process.exit(1)
}
console.log('PASS')
process.exit(0)
