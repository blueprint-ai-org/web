// Self-contained QA harness for Phase 2 dynamic-registration handler.
// Stubs global fetch (no Mongo, no port 7878 needed — sandbox-safe).
//
// Run: npx tsx /tmp/dynreg-qa.ts
import http from 'node:http'
import assert from 'node:assert/strict'

process.env.PUBLIC_BASE_URL = 'https://spark.example.test'

import { handleDynamicRegistration } from '/Users/sergio/Dev/BlueprintAI/canvas/lti-server-test/lti/dynamic-registration.ts'

// --- Mock platform via stubbed fetch -------------------------------------
const REG_ENDPOINT = 'http://mock-platform.test/registration'
const ISSUER = 'https://mock-platform.test'

const openidConfig = {
  issuer: ISSUER,
  registration_endpoint: REG_ENDPOINT,
  authorization_endpoint: `${ISSUER}/api/lti/authorize_redirect`,
  token_endpoint: `${ISSUER}/login/oauth2/token`,
  jwks_uri: `${ISSUER}/api/lti/security/jwks`,
  scopes_supported: ['openid'],
  'https://purl.imsglobal.org/spec/lti-platform-configuration': {
    product_family_code: 'canvas',
    version: '1.3.0',
    placements: ['course_navigation', 'global_navigation', 'account_navigation'],
  },
}

let capturedRegistrationBody: any = null

const realFetch = globalThis.fetch
globalThis.fetch = (async (url: any, init?: any) => {
  const u = String(url)
  if (u.endsWith('/.well-known/openid-configuration')) {
    return new Response(JSON.stringify(openidConfig), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (u === REG_ENDPOINT) {
    capturedRegistrationBody = JSON.parse(init.body)
    return new Response(
      JSON.stringify({
        client_id: 'mock-client-1',
        ...capturedRegistrationBody,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
  throw new Error(`unexpected fetch: ${u}`)
}) as any

// --- Helper to invoke the handler with a fake req/res --------------------
function invoke(query: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req: any = {
      query,
      body: {},
      headers: { host: 'spark.example.test', 'x-forwarded-proto': 'https' },
    }
    let status = 200
    let body = ''
    const res: any = {
      status(s: number) { status = s; return res },
      type(_t: string) { return res },
      setHeader() { return res },
      send(b: string) { body = b; resolve({ status, body }) },
    }
    handleDynamicRegistration(req, res).catch((err) => resolve({ status: 500, body: String(err) }))
  })
}

// --- Test 1: 400 on missing params ---------------------------------------
{
  const r = await invoke({ openid_configuration: '', registration_token: '' })
  assert.equal(r.status, 400, 'empty params should 400')
  console.log('PASS: empty-params returns 400')
}

// --- Test 2: end-to-end mock-platform happy path -------------------------
{
  capturedRegistrationBody = null
  const r = await invoke({
    openid_configuration: 'http://mock-platform.test/.well-known/openid-configuration',
    registration_token: 'test-token',
  })
  assert.equal(r.status, 200, 'happy path should 200')
  assert.ok(
    r.body.includes('org.imsglobal.lti.close'),
    'response HTML must contain close-window subject'
  )
  assert.ok(capturedRegistrationBody, 'mock platform must have captured a body')

  // initiate_login_uri matches PUBLIC_BASE_URL
  assert.equal(
    capturedRegistrationBody.initiate_login_uri,
    'https://spark.example.test/lti/login'
  )
  assert.deepEqual(
    capturedRegistrationBody.redirect_uris,
    ['https://spark.example.test/lti/launch']
  )

  // LTI tool-config has both placements, with the global_navigation icon
  // propagated through as `icon_uri` per spec.
  const tc = capturedRegistrationBody['https://purl.imsglobal.org/spec/lti-tool-configuration']
  assert.ok(tc, 'lti-tool-configuration namespace must be present')
  assert.equal(tc.messages.length, 2, 'should have 2 placements')
  const names = tc.messages.flatMap((m: any) => m.placements).sort()
  assert.deepEqual(names, ['course_navigation', 'global_navigation'])

  const global = tc.messages.find((m: any) => m.placements.includes('global_navigation'))
  assert.equal(global.icon_uri, 'https://spark.example.test/icon.png')

  // Confirm the *underlying tool-config* (the source-of-truth that
  // /lti-config.json serves for the JSON-paste path) advertises the same
  // raster logo — and no inline SVG path, which Canvas would render in
  // preference to the image and so hide the logo.
  const { buildToolConfig } = await import('/Users/sergio/Dev/BlueprintAI/canvas/lti-server-test/lti/tool-config.ts')
  const tool = buildToolConfig('https://spark.example.test')
  const globalPlacement = tool.extensions[0].settings.placements.find(
    (p: any) => p.placement === 'global_navigation'
  )
  assert.equal(
    globalPlacement?.icon_url,
    'https://spark.example.test/icon.png',
    'icon_url flows through tool-config'
  )
  assert.equal(
    globalPlacement?.icon_svg_path_64,
    undefined,
    'no icon_svg_path_64 — it would override the raster logo'
  )

  console.log('PASS: mock-platform happy path')
  console.log('  client_id captured upstream: mock-client-1')
  console.log('  initiate_login_uri:', capturedRegistrationBody.initiate_login_uri)
  console.log('  redirect_uris:', JSON.stringify(capturedRegistrationBody.redirect_uris))
  console.log('  placements:', JSON.stringify(names))
  console.log('  global_navigation.icon_uri:', global.icon_uri)
}

console.log('\nAll Phase 2 Automated QA assertions passed.')
globalThis.fetch = realFetch
