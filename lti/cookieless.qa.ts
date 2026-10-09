// QA harness for Phase 3 of the cookieless OIDC plan.
//
// Self-contained tsx script. Boots:
//   1. A local JWKS HTTP server with a freshly-generated RSA keypair.
//   2. The ltijs provider (shares Mongo with the dev server) and registers
//      a mock platform whose authConfig points at the local JWKS URL.
//   3. An Express app on :3001 with our cookieless handlers wired the same
//      way server.ts wires them in production.
//
// Then walks three scenarios end-to-end via Node fetch:
//   A. Happy path — login → launch → validate → expect 302 to /app + Set-Cookie.
//   B. Wrong nonce  → expect 401 from /lti/validate.
//   C. Wrong issuer → expect 401 from /lti/validate.
//
// Logs to stdout. Exits 0 on full pass, 1 on any failure. Each scenario
// reports PASS/FAIL inline.
import 'dotenv/config'
import { createServer } from 'node:http'
import { generateKeyPair, exportJWK, SignJWT } from 'jose'
import express from 'express'
import { handleCookielessLogin, handleCookielessLaunch, handleValidate } from './cookieless.js'

// Mock platform identity. Use a unique iss so we don't collide with any
// real Canvas record in the shared dev Mongo.
export const MOCK_ISS = 'https://qa-phase3.example.test'
export const MOCK_CLIENT_ID = 'qa-phase3-client-' + Date.now()
export const MOCK_DEPLOYMENT_ID = 'qa-deployment-1'

// Default Instructor role URI — preserved as the implicit default for
// `makeIdToken({ nonce })` so existing callers continue to emit Instructor
// JWTs without code changes.
export const DEFAULT_INSTRUCTOR_ROLE =
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'

function log(msg: string) {
  console.log(`[qa-phase3] ${msg}`)
}

// Lazily-created module-scope signing keypair, used by `makeIdToken` when
// no explicit `signingKey` is passed. This keeps the function importable
// from unit tests without forcing them to thread a key through every call.
let _defaultKeypair: { privateKey: CryptoKey; kid: string } | null = null
async function getDefaultSigningKey(): Promise<{ privateKey: CryptoKey; kid: string }> {
  if (_defaultKeypair) return _defaultKeypair
  const { privateKey } = await generateKeyPair('RS256', { extractable: true })
  _defaultKeypair = { privateKey, kid: 'qa-default-kid' }
  return _defaultKeypair
}

/**
 * Build a signed LTI 1.3 id_token suitable for driving the cookieless QA
 * harness or persona-shell regression tests.
 *
 * Defaults match the original hardcoded Instructor launch (no custom
 * claim). Pass `roles` to override the membership claim, and `customFields`
 * to inject `https://purl.imsglobal.org/spec/lti/claim/custom`. Omitting
 * `customFields` keeps the custom claim out of the payload entirely.
 *
 * `signingKey`/`kid` allow the in-file harness `main()` to sign with the
 * JWKS-published RSA keypair. When omitted, a module-scope keypair is
 * lazily created — adequate for unit tests that only decode the payload.
 */
export async function makeIdToken(opts: {
  iss?: string
  aud?: string
  nonce: string
  deploymentId?: string
  roles?: string[]
  customFields?: Record<string, string>
  signingKey?: CryptoKey
  kid?: string
}): Promise<string> {
  const { privateKey: defaultKey, kid: defaultKid } = opts.signingKey
    ? { privateKey: opts.signingKey, kid: opts.kid ?? 'qa-default-kid' }
    : await getDefaultSigningKey()
  const now = Math.floor(Date.now() / 1000)
  const payload: Record<string, unknown> = {
    nonce: opts.nonce,
    sub: 'qa-user-1',
    name: 'QA User',
    email: 'qa@example.test',
    given_name: 'QA',
    family_name: 'User',
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id':
      opts.deploymentId ?? MOCK_DEPLOYMENT_ID,
    'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
    'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
    'https://purl.imsglobal.org/spec/lti/claim/roles': opts.roles ?? [
      DEFAULT_INSTRUCTOR_ROLE,
    ],
    'https://purl.imsglobal.org/spec/lti/claim/context': {
      id: 'course-1',
      title: 'QA Course',
    },
    'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: 'res-1' },
    'https://purl.imsglobal.org/spec/lti/claim/target_link_uri':
      'https://tool.example.test/lti/launch',
  }
  if (opts.customFields !== undefined) {
    payload['https://purl.imsglobal.org/spec/lti/claim/custom'] = opts.customFields
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: opts.kid ?? defaultKid })
    .setIssuer(opts.iss ?? MOCK_ISS)
    .setAudience(opts.aud ?? MOCK_CLIENT_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(defaultKey)
}

async function main() {
  // Lazy: provider.ts requires env + a live Mongo at import time. Importing it
  // here keeps `makeIdToken` (used by cookieless.qa.test.ts) loadable without a
  // database.
  const { default: lti } = await import('./provider.js')

  // 1. Generate keypair + JWKS server.
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
  const publicJwk = await exportJWK(publicKey)
  publicJwk.alg = 'RS256'
  publicJwk.use = 'sig'
  publicJwk.kid = 'qa-phase3-kid'

  const jwksServer = createServer((req, res) => {
    if (req.url?.startsWith('/jwks')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ keys: [publicJwk] }))
    } else {
      res.writeHead(404).end()
    }
  })
  await new Promise<void>((r) => jwksServer.listen(0, '127.0.0.1', () => r()))
  const jwksAddr = jwksServer.address()
  if (!jwksAddr || typeof jwksAddr === 'string') throw new Error('jwks server addr')
  const jwksUrl = `http://127.0.0.1:${jwksAddr.port}/jwks`
  log(`jwks server listening on ${jwksUrl}`)

  // Mock auth endpoint — never actually hit by this harness, but
  // getPlatformConfig requires it. Use a parsable URL.
  const MOCK_AUTH_ENDPOINT = 'https://qa-phase3.example.test/auth'

  // 2. Register mock platform. registerPlatform is idempotent on (url, clientId).
  await lti.registerPlatform({
    url: MOCK_ISS,
    name: 'QA Phase 3 mock',
    clientId: MOCK_CLIENT_ID,
    authenticationEndpoint: MOCK_AUTH_ENDPOINT,
    accesstokenEndpoint: 'https://qa-phase3.example.test/token',
    authConfig: { method: 'JWK_SET', key: jwksUrl },
  })
  log(`registered mock platform iss=${MOCK_ISS} clientId=${MOCK_CLIENT_ID}`)

  // 3. Boot tiny express app mirroring server.ts's wiring. We bypass the
  // /lti/login HTML render in our flow (since we'd have to scrape JS) and
  // instead drive the server-side state directly: call /lti/login with
  // lti_storage_target set, scrape state+nonce from the rendered HTML,
  // saveNonce was already done in the handler. Then POST /lti/launch with
  // a signed id_token. Then POST /lti/validate.
  const app = express()
  app.post('/lti/login', handleCookielessLogin)
  app.post('/lti/launch', handleCookielessLaunch)
  app.post('/lti/validate', express.urlencoded({ extended: false }), handleValidate)
  const httpServer = app.listen(0)
  await new Promise<void>((r) => httpServer.on('listening', () => r()))
  const addr = httpServer.address()
  if (!addr || typeof addr === 'string') throw new Error('app server addr')
  const base = `http://127.0.0.1:${addr.port}`
  log(`harness app listening on ${base}`)

  let pass = 0
  let fail = 0
  function record(ok: boolean, name: string, detail = '') {
    if (ok) {
      pass++
      log(`PASS ${name}${detail ? ' — ' + detail : ''}`)
    } else {
      fail++
      log(`FAIL ${name}${detail ? ' — ' + detail : ''}`)
    }
  }

  async function loginAndExtract(): Promise<{ state: string; nonce: string }> {
    const params = new URLSearchParams({
      iss: MOCK_ISS,
      client_id: MOCK_CLIENT_ID,
      target_link_uri: 'https://tool.example.test/lti/launch',
      login_hint: 'user-1',
      lti_message_hint: 'msg-1',
      lti_storage_target: 'post_message_forwarding',
      lti_deployment_id: MOCK_DEPLOYMENT_ID,
    })
    const r = await fetch(`${base}/lti/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (r.status !== 200) throw new Error(`login status ${r.status}`)
    const body = await r.text()
    // Extract state and nonce from the rendered data-* attributes.
    const stateMatch = body.match(/data-state="([0-9a-f]+)"/)
    const nonceMatch = body.match(/data-nonce="([0-9a-f]+)"/)
    if (!stateMatch || !nonceMatch) throw new Error('login HTML missing state/nonce')
    return { state: stateMatch[1], nonce: nonceMatch[1] }
  }

  // Inside-main wrapper: the QA harness needs to sign with the JWKS-published
  // RS256 key (so /lti/validate's signature check passes), whereas unit-test
  // callers of the module-scope `makeIdToken` use a lazily-created keypair.
  // Thread `privateKey` + matching `kid` through.
  function makeHarnessIdToken(opts: {
    iss?: string
    aud?: string
    nonce: string
    deploymentId?: string
    roles?: string[]
    customFields?: Record<string, string>
  }) {
    return makeIdToken({ ...opts, signingKey: privateKey, kid: 'qa-phase3-kid' })
  }

  // ===== Scenario A: happy path =====
  try {
    const { state, nonce } = await loginAndExtract()
    log(`A: got state=${state.slice(0, 8)}... nonce=${nonce.slice(0, 8)}...`)
    const idToken = await makeHarnessIdToken({ nonce })

    // Simulate the launch handler — we mostly want /lti/validate to be
    // exercised. /lti/launch just renders HTML; verify it 200s with the
    // state baked in.
    const launchRes = await fetch(`${base}/lti/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        state,
        id_token: idToken,
        lti_storage_target: 'post_message_forwarding',
      }).toString(),
    })
    record(
      launchRes.status === 200,
      'A: /lti/launch returns HTML 200',
      `status=${launchRes.status}`
    )

    const valRes = await fetch(`${base}/lti/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ state, id_token: idToken, nonce }).toString(),
      redirect: 'manual',
    })
    const setCookie = valRes.headers.get('set-cookie') ?? ''
    const location = valRes.headers.get('location') ?? ''
    const okStatus = valRes.status === 302
    // Post-Phase-1 (cookieless URL-token): redirect must be /app?lti_session=<jwt>.
    // The JWT is HS256, so a quick three-segment dotted check is enough here —
    // jwt-shape verification of the param's value happens in the unit harness.
    const okLocationPath = location.startsWith('/app?lti_session=')
    const ltiSessionMatch = location.match(/[?&]lti_session=([^&]+)/)
    const ltiSessionValue = ltiSessionMatch ? decodeURIComponent(ltiSessionMatch[1]) : ''
    const okJwtShape = /^[\w-]+\.[\w-]+\.[\w-]+$/.test(ltiSessionValue)
    const okCookie = /lti-claims=/.test(setCookie)
    record(okStatus, 'A: /lti/validate 302', `status=${valRes.status}`)
    record(okLocationPath, 'A: redirect Location includes ?lti_session=', `loc=${location.slice(0, 80)}...`)
    record(okJwtShape, 'A: lti_session param is a JWT (3 dotted segments)', `len=${ltiSessionValue.length}`)
    record(okCookie, 'A: Set-Cookie lti-claims (cookie still set as fallback)', `cookie=${setCookie.slice(0, 80)}...`)
  } catch (err) {
    record(false, 'A: happy path threw', (err as Error).message)
  }

  // ===== Scenario B: wrong nonce =====
  try {
    const { state, nonce } = await loginAndExtract()
    const idToken = await makeHarnessIdToken({ nonce }) // token bound to real nonce
    // Submit a different nonce to /lti/validate. Should 401 immediately
    // because consumeNonce(submittedNonce, state) returns false.
    const valRes = await fetch(`${base}/lti/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        state,
        id_token: idToken,
        nonce: 'wrong-nonce-' + Date.now(),
      }).toString(),
      redirect: 'manual',
    })
    const text = await valRes.text()
    record(
      valRes.status === 401,
      'B: wrong nonce → 401',
      `status=${valRes.status} body=${text.slice(0, 60)}`
    )
  } catch (err) {
    record(false, 'B: wrong-nonce threw', (err as Error).message)
  }

  // ===== Scenario C: wrong issuer =====
  try {
    const { state, nonce } = await loginAndExtract()
    // id_token issuer doesn't match a registered platform, so
    // getPlatformConfig fails inside handleValidate after consumeNonce.
    // (Note: consumeNonce will succeed on first call, so the failure is
    // about platform lookup / signature — both surface as 401.)
    const idToken = await makeHarnessIdToken({ nonce, iss: 'https://attacker.example.test' })
    const valRes = await fetch(`${base}/lti/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ state, id_token: idToken, nonce }).toString(),
      redirect: 'manual',
    })
    const text = await valRes.text()
    record(
      valRes.status === 401,
      'C: wrong issuer → 401',
      `status=${valRes.status} body=${text.slice(0, 80)}`
    )
  } catch (err) {
    record(false, 'C: wrong-issuer threw', (err as Error).message)
  }

  // ===== Scenario D: /lti/validate with no body params returns 4xx (not 5xx) =====
  try {
    const r = await fetch(`${base}/lti/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
      redirect: 'manual',
    })
    record(
      r.status >= 400 && r.status < 500,
      'D: empty /lti/validate returns 4xx',
      `status=${r.status}`
    )
  } catch (err) {
    record(false, 'D: empty validate threw', (err as Error).message)
  }

  // ===== Scenario E: /lti/launch without lti_storage_target falls through =====
  // Our harness app doesn't mount ltijs, so fallthrough yields a 404 from
  // express's default handler. That's enough to prove handleCookielessLaunch
  // calls next() rather than 500ing — the real server.ts mounts lti.app
  // after our handler so that next() lands on ltijs's launch handler.
  try {
    const r = await fetch(`${base}/lti/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        state: 'x',
        id_token: 'irrelevant',
      }).toString(),
      redirect: 'manual',
    })
    // No subsequent handler in our harness, so 404 means next() was called.
    record(
      r.status === 404,
      'E: /lti/launch without storage_target falls through to next()',
      `status=${r.status}`
    )
  } catch (err) {
    record(false, 'E: fallthrough threw', (err as Error).message)
  }

  log(`summary: ${pass} passed, ${fail} failed`)

  // Cleanup
  httpServer.close()
  jwksServer.close()
  // ltijs holds a mongoose connection open; close it so the process exits.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { await (lti as any).close?.() } catch {}
  // Forcing process exit because mongoose may keep a worker alive.
  setTimeout(() => process.exit(fail === 0 ? 0 : 1), 200)
}

// Only run the QA harness when this file is executed directly (e.g. via
// `npx tsx lti/cookieless.qa.ts`). When imported as a module (e.g. by
// `cookieless.qa.test.ts` pulling in `makeIdToken`), skip auto-boot so we
// don't spin up the JWKS/Mongo stack inside unit tests.
//
// `process.argv[1]` is the entry script's resolved path under tsx; compare
// against this module's URL (converted to a path) to detect direct exec.
const __entry = process.argv[1] ?? ''
const __thisFile = new URL(import.meta.url).pathname
if (__entry && (__entry === __thisFile || __entry.endsWith('cookieless.qa.ts'))) {
  main().catch((err) => {
    console.error('[qa-phase3] fatal', err)
    process.exit(1)
  })
}
