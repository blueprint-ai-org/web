// Run: npx tsx --test lti/dynamic-registration.test.ts
//
// Pure-shape assertions on buildRegistrationRequest. We do not fetch the
// network here; the end-to-end mock-platform test is in the QA harness.
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRegistrationRequest,
  _handleDynamicRegistrationWithDeps,
  type PlatformConfig,
  type PlatformRegistration,
} from './dynamic-registration.js'

const stubPlatformConfig: PlatformConfig = {
  product_family_code: 'canvas',
  version: '1.3.0',
  placements: ['course_navigation', 'global_navigation'],
}

test('buildRegistrationRequest sets redirect_uris from baseUrl', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  assert.deepEqual(body.redirect_uris, ['https://example.test/lti/launch'])
})

test('buildRegistrationRequest sets initiate_login_uri from baseUrl', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  assert.equal(body.initiate_login_uri, 'https://example.test/lti/login')
})

test('buildRegistrationRequest carries the LTI tool-configuration namespace key', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  const tc = body['https://purl.imsglobal.org/spec/lti-tool-configuration']
  assert.ok(tc, 'lti-tool-configuration namespace key must be present')
  assert.equal(tc.target_link_uri, 'https://example.test/lti/launch')
  assert.equal(tc.domain, 'example.test')
})

test('buildRegistrationRequest declares required claims (Canvas DR schema requires it)', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  const tc = body['https://purl.imsglobal.org/spec/lti-tool-configuration']
  assert.ok(Array.isArray(tc.claims) && tc.claims.length > 0, 'claims array must be non-empty')
  for (const c of ['iss', 'sub', 'https://purl.imsglobal.org/spec/lti/claim/context']) {
    assert.ok(tc.claims.includes(c), `claims must include ${c}`)
  }
})

test('buildRegistrationRequest emits a message per placement (teacher course + global + counselor course)', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  const messages =
    body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages
  assert.equal(messages.length, 3)
  const placementNames = messages.flatMap((m) => m.placements)
  assert.deepEqual(
    placementNames.sort(),
    ['course_navigation', 'course_navigation', 'global_navigation']
  )
})

test('global_navigation message sets Canvas visibility to public', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  const messages =
    body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages
  const global = messages.find((m) => m.placements.includes('global_navigation'))
  assert.equal(
    global!['https://canvas.instructure.com/lti/visibility'],
    'public',
    'without explicit visibility, Canvas installs the placement but never renders it'
  )
})

test('course_navigation message sets Canvas default_enabled true', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  const messages =
    body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages
  const course = messages.find((m) => m.placements.includes('course_navigation'))
  assert.equal(
    course!['https://canvas.instructure.com/lti/course_navigation/default_enabled'],
    true
  )
})

test('global_navigation message carries icon_uri', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  const messages =
    body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages
  const global = messages.find((m) => m.placements.includes('global_navigation'))
  assert.ok(global, 'global_navigation entry should exist')
  assert.equal(global!.icon_uri, 'https://example.test/icon.png')
})

test('course_navigation message does NOT carry icon_uri', () => {
  const body = buildRegistrationRequest('https://example.test', stubPlatformConfig)
  const messages =
    body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages
  const course = messages.find((m) => m.placements.includes('course_navigation'))
  assert.ok(course, 'course_navigation entry should exist')
  assert.equal(course!.icon_uri, undefined)
})

test('buildRegistrationRequest filters placements against platform-advertised list', () => {
  const restricted: PlatformConfig = { placements: ['course_navigation'] }
  const body = buildRegistrationRequest('https://example.test', restricted)
  const messages =
    body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages
  assert.equal(messages.length, 2)
  for (const m of messages) assert.deepEqual(m.placements, ['course_navigation'])
})

test('buildRegistrationRequest includes all placements when platformConfig.placements is missing', () => {
  const body = buildRegistrationRequest('https://example.test', undefined)
  const messages =
    body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages
  assert.equal(messages.length, 3)
})

// ---------------------------------------------------------------------------
// Phase 3: persistence wiring tests
// ---------------------------------------------------------------------------
//
// These exercise `_handleDynamicRegistrationWithDeps` directly so we can
// inject a stub `registerPlatform` (no real ltijs / Mongo) and a stub
// `fetchImpl` (no network).

// step-12: /lti/register is now gated by a shared secret + a host allowlist
// for the openid_configuration fetch (see registration-guard.ts). These tests
// configure both so they keep exercising the handler body rather than the gate;
// the gate itself is covered in registration-guard.test.ts.
const REG_SECRET = 'test-registration-secret'
process.env.LTI_REGISTRATION_SECRET = REG_SECRET
process.env.LTI_REGISTRATION_ALLOWED_HOSTS = 'mock-platform.test'

const MOCK_ISSUER = 'https://mock-platform.test'
const MOCK_REG_ENDPOINT = `${MOCK_ISSUER}/registration`
const MOCK_OPENID_URL = `${MOCK_ISSUER}/.well-known/openid-configuration`

const mockOpenIdConfig = {
  issuer: MOCK_ISSUER,
  registration_endpoint: MOCK_REG_ENDPOINT,
  authorization_endpoint: `${MOCK_ISSUER}/api/lti/authorize_redirect`,
  token_endpoint: `${MOCK_ISSUER}/login/oauth2/token`,
  jwks_uri: `${MOCK_ISSUER}/api/lti/security/jwks`,
  scopes_supported: ['openid'],
  'https://purl.imsglobal.org/spec/lti-platform-configuration': {
    product_family_code: 'canvas',
    version: '1.3.0',
    placements: ['course_navigation', 'global_navigation'],
  },
}

function makeFetchStub() {
  return (async (input: any, init?: any) => {
    const u = String(input)
    if (u === MOCK_OPENID_URL) {
      return new Response(JSON.stringify(mockOpenIdConfig), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (u === MOCK_REG_ENDPOINT) {
      const body = JSON.parse(init.body)
      return new Response(
        JSON.stringify({ client_id: 'mock-client-1', ...body }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    throw new Error(`unexpected fetch: ${u}`)
  }) as typeof fetch
}

function makeReqRes(query: Record<string, string>) {
  const req: any = {
    query: { registration_secret: REG_SECRET, ...query },
    body: {},
    headers: { host: 'spark.example.test', 'x-forwarded-proto': 'https' },
  }
  let status = 200
  let body = ''
  const done = new Promise<{ status: number; body: string }>((resolve) => {
    const res: any = {
      status(s: number) { status = s; return res },
      type(_t: string) { return res },
      setHeader() { return res },
      send(b: string) { body = b; resolve({ status, body }) },
    }
    ;(req as any).__res = res
    ;(req as any).__resolve = resolve
  })
  return { req, done, getStatus: () => status, getBody: () => body }
}

test('handler calls registerPlatform exactly once with expected shape', async () => {
  process.env.PUBLIC_BASE_URL = 'https://spark.example.test'
  const calls: PlatformRegistration[] = []
  const registerPlatform = async (p: PlatformRegistration) => {
    calls.push(p)
  }

  const { req, done } = makeReqRes({
    openid_configuration: MOCK_OPENID_URL,
    registration_token: 'tok',
  })
  await _handleDynamicRegistrationWithDeps(req, (req as any).__res, {
    registerPlatform,
    fetchImpl: makeFetchStub(),
  })
  const r = await done

  assert.equal(r.status, 200, 'happy path returns 200')
  assert.ok(r.body.includes('org.imsglobal.lti.close'), 'close-window HTML rendered')
  assert.equal(calls.length, 1, 'registerPlatform called exactly once')
  assert.deepEqual(calls[0], {
    url: MOCK_ISSUER,
    name: 'canvas',
    clientId: 'mock-client-1',
    authenticationEndpoint: `${MOCK_ISSUER}/api/lti/authorize_redirect`,
    accesstokenEndpoint: `${MOCK_ISSUER}/login/oauth2/token`,
    authConfig: { method: 'JWK_SET', key: `${MOCK_ISSUER}/api/lti/security/jwks` },
  })
})

test('handler is idempotent: PLATFORM_ALREADY_REGISTERED still returns 200 with close-window HTML', async () => {
  process.env.PUBLIC_BASE_URL = 'https://spark.example.test'

  // First call succeeds.
  let registerCalls = 0
  const registerOk = async () => {
    registerCalls++
  }
  const { req: req1, done: done1 } = makeReqRes({
    openid_configuration: MOCK_OPENID_URL,
    registration_token: 'tok',
  })
  await _handleDynamicRegistrationWithDeps(req1, (req1 as any).__res, {
    registerPlatform: registerOk,
    fetchImpl: makeFetchStub(),
  })
  const r1 = await done1
  assert.equal(r1.status, 200)
  assert.equal(registerCalls, 1)

  // Second call — registerPlatform throws PLATFORM_ALREADY_REGISTERED.
  const registerDup = async () => {
    throw new Error('PLATFORM_ALREADY_REGISTERED')
  }
  const { req: req2, done: done2 } = makeReqRes({
    openid_configuration: MOCK_OPENID_URL,
    registration_token: 'tok',
  })
  await _handleDynamicRegistrationWithDeps(req2, (req2 as any).__res, {
    registerPlatform: registerDup,
    fetchImpl: makeFetchStub(),
  })
  const r2 = await done2
  assert.equal(r2.status, 200, 'idempotent re-registration still returns 200')
  assert.ok(
    r2.body.includes('org.imsglobal.lti.close'),
    'idempotent re-registration still renders close-window HTML'
  )
})

test('handler returns 500 on non-idempotency registerPlatform errors without leaking internals', async () => {
  process.env.PUBLIC_BASE_URL = 'https://spark.example.test'
  const registerBoom = async () => {
    throw new Error('mongodb://secret:supersecret@host/db connect ECONNREFUSED')
  }
  const { req, done } = makeReqRes({
    openid_configuration: MOCK_OPENID_URL,
    registration_token: 'tok',
  })
  await _handleDynamicRegistrationWithDeps(req, (req as any).__res, {
    registerPlatform: registerBoom,
    fetchImpl: makeFetchStub(),
  })
  const r = await done
  assert.equal(r.status, 500)
  assert.ok(!r.body.includes('supersecret'), 'must not leak internal error details')
})
