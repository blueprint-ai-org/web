// Phase 3 QA: end-to-end mock-platform registration with real ltijs +
// real Mongo persistence. Verifies a platform row lands in the
// `platform` collection.
//
// Run: npx tsx scripts/dynreg-qa-phase3.ts
import 'dotenv/config'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// Stub global fetch BEFORE we import the handler (which captures the global).
const REG_ENDPOINT = 'http://mock-platform-phase3.test/registration'
const ISSUER = 'https://mock-platform-phase3.test'
const OPENID_URL = `${ISSUER.replace('https://', 'http://')}/.well-known/openid-configuration`
const CLIENT_ID = 'mock-client-phase3'

const openidConfig = {
  issuer: ISSUER,
  registration_endpoint: REG_ENDPOINT,
  authorization_endpoint: `${ISSUER}/api/lti/authorize_redirect`,
  token_endpoint: `${ISSUER}/login/oauth2/token`,
  jwks_uri: `${ISSUER}/api/lti/security/jwks`,
  scopes_supported: ['openid'],
  'https://purl.imsglobal.org/spec/lti-platform-configuration': {
    product_family_code: 'canvas-mock-phase3',
    version: '1.3.0',
    placements: ['course_navigation', 'global_navigation'],
  },
}

const realFetch = globalThis.fetch
globalThis.fetch = (async (input: any, init?: any) => {
  const u = String(input)
  if (u === OPENID_URL) {
    return new Response(JSON.stringify(openidConfig), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (u === REG_ENDPOINT) {
    const body = JSON.parse(init.body)
    return new Response(
      JSON.stringify({ client_id: CLIENT_ID, ...body }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
  // Anything else (notably ltijs's own outbound calls, if any) → fall through
  // to the real fetch.
  return realFetch(input, init)
}) as any

process.env.PUBLIC_BASE_URL = 'https://spark-phase3.example.test'

const { handleDynamicRegistration } = await import(
  '/Users/sergio/Dev/BlueprintAI/canvas/lti-server-test/lti/dynamic-registration.ts'
)

function invoke(query: Record<string, string>) {
  return new Promise<{ status: number; body: string }>((resolve) => {
    const req: any = {
      query,
      body: {},
      headers: { host: 'spark-phase3.example.test', 'x-forwarded-proto': 'https' },
    }
    let status = 200
    let body = ''
    const res: any = {
      status(s: number) { status = s; return res },
      type(_t: string) { return res },
      setHeader() { return res },
      send(b: string) { body = b; resolve({ status, body }) },
    }
    handleDynamicRegistration(req, res).catch((err) =>
      resolve({ status: 500, body: String(err) })
    )
  })
}

// --- 1. Clean any previous mock platform row -----------------------------
await mongoose.connect(process.env.MONGODB_URL!)
try {
  const platformsCol = mongoose.connection.collection('platforms')
  const beforeDelete = await platformsCol.deleteMany({ platformUrl: ISSUER })
  console.log(`Cleaned ${beforeDelete.deletedCount} prior mock platform row(s).`)

  // --- 2. First registration: should create a row -------------------------
  const r1 = await invoke({
    openid_configuration: OPENID_URL,
    registration_token: 'tok-phase3',
  })
  assert.equal(r1.status, 200, 'first registration returns 200')
  assert.ok(
    r1.body.includes('org.imsglobal.lti.close'),
    'first registration renders close-window HTML'
  )

  const row = await platformsCol.findOne({ platformUrl: ISSUER })
  assert.ok(row, 'platform row should exist in Mongo after registration')
  console.log('Mongo platform row keys:', Object.keys(row!))
  // ltijs stores clientId encrypted/hashed in some columns; we look for any
  // stored field referencing our mock client_id. The canonical column is
  // `clientId` per ltijs's Platform model.
  const storedClientId = (row as any).clientId
  assert.equal(
    storedClientId,
    CLIENT_ID,
    `clientId on platform row must match (${storedClientId} vs ${CLIENT_ID})`
  )
  console.log(`PASS: platform row persisted (issuer=${ISSUER}, clientId=${CLIENT_ID})`)

  // --- 3. Idempotency: second call with same (issuer, clientId) ------------
  const r2 = await invoke({
    openid_configuration: OPENID_URL,
    registration_token: 'tok-phase3',
  })
  assert.equal(r2.status, 200, 'second registration also returns 200 (idempotent)')
  assert.ok(
    r2.body.includes('org.imsglobal.lti.close'),
    'idempotent re-registration still renders close-window HTML'
  )
  console.log('PASS: idempotent re-registration returns 200 with close HTML')

  // --- 4. Cleanup ----------------------------------------------------------
  const afterDelete = await platformsCol.deleteMany({ platformUrl: ISSUER })
  console.log(`Cleanup: removed ${afterDelete.deletedCount} mock platform row(s).`)
} finally {
  await mongoose.disconnect()
}
globalThis.fetch = realFetch

console.log('\nAll Phase 3 Automated QA assertions passed.')
process.exit(0)
