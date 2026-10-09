/**
 * Action + loader tests for `/login`.
 *
 * `node:test` under `tsx`, following `app/routes/api.theme.test.ts` (call the
 * exported action directly with a hand-built `Request`) and
 * `app/lib/bp-ai/client.test.ts` (set env, stub `globalThis.fetch`, then
 * dynamic-import). **Vitest is intentionally not installed in this repo.**
 *
 * Run: npx tsx --test app/routes/login.test.ts
 *
 * **Why `fetch` and not a module mock.** Stubbing `globalThis.fetch` exercises
 * the whole real chain — action → `bpLogin` → `graphql` → transport — so these
 * tests prove that error *classification* (the client) and error *phrasing*
 * (this route) actually compose. A `mock.module` stub of `bpLogin` would test
 * the route against a fiction of the client, and would also need
 * `--experimental-test-module-mocks`. It costs one extra layer of setup and
 * catches a whole class of bug the cheaper approach cannot see.
 *
 * Every gateway error string below is transcribed from
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md` and was
 * observed against the live host.
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import type { BpAiErrorKind } from '../lib/bp-ai/types.ts'

// Set unconditionally, never `??=`: `config.server.ts` throws at module
// evaluation without the URL, and these tests must never reach the live
// gateway even when a real endpoint is in the ambient environment.
const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT
// `sealBpSession` refuses to sign when these two match — that guard is the
// LTI/BP-AI separation (D10), so the fixtures must respect it.
process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-login-action-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
// The loader reports this flag to the screen (it decides whether to render a
// link to `/signup`). Pinned OFF here so the default configuration is what the
// assertions below describe; the ON case has its own test.
delete process.env.BP_SIGNUP_ENABLED

type LoginModule = typeof import('./login.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let action: LoginModule['action']
let loader: LoginModule['loader']
let loginFormError: LoginModule['loginFormError']
let sealBpSession: SessionModule['sealBpSession']
let readBpSession: SessionModule['readBpSession']

before(async () => {
  const mod = (await import('./login.tsx')) as LoginModule
  action = mod.action
  loader = mod.loader
  loginFormError = mod.loginFormError
  const session = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  sealBpSession = session.sealBpSession
  readBpSession = session.readBpSession
})

// ── fetch stubbing ───────────────────────────────────────────────────────

type Call = { url: string; init: RequestInit }

const originalFetch = globalThis.fetch
let calls: Call[] = []

/** Install a `globalThis.fetch` stub. Throwing from `respond` rejects (transport failure). */
function stub(respond: (call: Call) => Response | Promise<Response>): void {
  calls = []
  const impl = async (input: unknown, init?: unknown): Promise<Response> => {
    calls.push({ url: String(input), init: (init ?? {}) as RequestInit })
    return respond(calls[calls.length - 1])
  }
  globalThis.fetch = impl as unknown as typeof globalThis.fetch
}

/** A stub that fails the test if it is ever called. */
function refuseAllRequests(): void {
  stub(() => {
    throw new Error('the action must not reach the gateway in this case')
  })
}

beforeEach(() => {
  calls = []
})

after(() => {
  globalThis.fetch = originalFetch
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** A failure exactly as the gateway shapes it: HTTP 200, `data: null`, `errors[]`. */
function gqlFailure(message: string, code?: string): Response {
  const entry = code === undefined ? { message } : { message, extensions: { code } }
  return json({ data: null, errors: [entry] })
}

const PAYLOAD = {
  token: 'access-token-jwt',
  refresh_token: 'a'.repeat(64),
  user_id: 'user-uuid',
  tenant: 'tenant-uuid',
}

/**
 * Narrowing guards that work with plain control flow.
 *
 * `assert.ok` cannot be used to narrow here: under `tsconfig.vite.json` the
 * `types` array omits `node`, so `node:assert` does not resolve and its
 * `asserts` signatures are unavailable to the checker. A thrown `Error` fails
 * the test identically and narrows properly.
 */
function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`expected ${what}`)
  return value
}

// ── route-call helpers ───────────────────────────────────────────────────

/**
 * The real `Route.ActionArgs` carries route-specific generics; these tests only
 * exercise `request`, so a narrow cast is sufficient — same shape as
 * `api.theme.test.ts:20-22`.
 */
function callAction(request: Request) {
  return action({ request, params: {}, context: {} as never } as never)
}

function callLoader(request: Request) {
  return loader({ request, params: {}, context: {} as never } as never)
}

function postForm(fields: Record<string, string>, cookie?: string): Request {
  const body = new URLSearchParams(fields)
  const headers = new Headers({ 'content-type': 'application/x-www-form-urlencoded' })
  if (cookie) headers.set('cookie', cookie)
  return new Request('https://example.test/login', { method: 'POST', headers, body })
}

/** Assert the action returned action data (not a redirect) and hand it back. */
async function expectActionData(request: Request) {
  const result = await callAction(request)
  if (result instanceof Response) throw new Error('expected action data, got a Response')
  return result
}

/** Assert the action returned a redirect and hand back the Response. */
async function expectRedirect(request: Request): Promise<Response> {
  const result = await callAction(request)
  if (!(result instanceof Response)) {
    throw new Error('expected a redirect Response, got action data')
  }
  return result
}

const VALID = { email: 'student@example.com', password: 'Passw0rd-long-enough' }

/**
 * The user-facing message for every failure kind.
 *
 * A `Record<BpAiErrorKind, …>` on purpose: adding a kind to the union makes
 * this table a compile error, so the exhaustiveness of `loginFormError` is
 * enforced by the type checker rather than by remembering to add a case.
 * Literals, not calls into the route — a reworded message must show up as a
 * diff here.
 */
const EXPECTED_MESSAGE: Record<BpAiErrorKind, string> = {
  invalid_credentials: 'That email and password don’t match. Check them and try again.',
  network: 'We couldn’t reach Spark EQ. Check your connection and try again.',
  duplicate_email: 'Something went wrong signing you in. Please try again.',
  validation: 'You appear to be signed in already. Reload the page and try again.',
  unauthenticated: 'Your session has expired. Please sign in again.',
  unknown: 'Something went wrong signing you in. Please try again.',
}

describe('login loader', () => {
  it('renders for an anonymous visitor, reporting signup as disabled', async () => {
    const result = await callLoader(new Request('https://example.test/login'))
    assert.deepEqual(result, { signupEnabled: false })
  })

  it('reports signup as enabled when BP_SIGNUP_ENABLED is on', async () => {
    // The flag is read per request, not captured at module load — which is what
    // makes this assertion possible in the same process as the one above.
    process.env.BP_SIGNUP_ENABLED = 'true'
    try {
      const result = await callLoader(new Request('https://example.test/login'))
      assert.deepEqual(result, { signupEnabled: true })
    } finally {
      delete process.env.BP_SIGNUP_ENABLED
    }
  })

  it('redirects an already-authenticated visitor to /student instead of rendering', async () => {
    // `login` is a NO_USER operation — the gateway would reject the call anyway,
    // so the page must never be reachable with a live session.
    const sealed = await sealBpSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'u',
      tenant: 't',
      accessTokenExpiresAt: Date.now() + 900_000,
    })
    const request = new Request('https://example.test/login', {
      headers: { cookie: `bp-session=${sealed}` },
    })

    let thrown: unknown
    try {
      await callLoader(request)
    } catch (err) {
      thrown = err
    }
    if (!(thrown instanceof Response)) {
      throw new Error('expected the loader to throw a redirect')
    }
    assert.equal(thrown.status, 302)
    assert.equal(thrown.headers.get('Location'), '/student')
  })

  it('renders for a visitor whose bp-session cookie is unreadable', async () => {
    const request = new Request('https://example.test/login', {
      headers: { cookie: 'bp-session=not-a-jwt' },
    })
    assert.deepEqual(await callLoader(request), { signupEnabled: false })
  })
})

describe('login action — validation short-circuits the network', () => {
  it('returns both field errors for a blank form and never calls the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(postForm({ email: '', password: '' }))
    assert.equal(data.ok, false)
    assert.deepEqual(data.fieldErrors, {
      email: 'Enter your email address.',
      password: 'Enter your password.',
    })
    assert.equal(data.formError, undefined)
    assert.equal(calls.length, 0, 'a malformed form must not reach the gateway')
  })

  it('returns a field error for a malformed email and never calls the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(postForm({ email: 'nope', password: VALID.password }))
    assert.deepEqual(data.fieldErrors, { email: "That doesn't look like an email address." })
    assert.equal(calls.length, 0)
  })

  it('treats entirely missing form fields as blank rather than throwing', async () => {
    refuseAllRequests()
    const request = new Request('https://example.test/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: '',
    })
    const data = await expectActionData(request)
    assert.deepEqual(data.fieldErrors, {
      email: 'Enter your email address.',
      password: 'Enter your password.',
    })
    assert.equal(calls.length, 0)
  })

  it('does not 500 on a POST whose body is not a parseable form', async () => {
    // `request.formData()` throws when the Content-Type is absent — a bare
    // `curl -X POST /login`. An unhandled throw here would surface as a 500
    // with the root error boundary instead of the form.
    refuseAllRequests()
    const request = new Request('https://example.test/login', { method: 'POST' })
    const data = await expectActionData(request)
    assert.deepEqual(data.fieldErrors, {
      email: 'Enter your email address.',
      password: 'Enter your password.',
    })
    assert.equal(calls.length, 0)
  })
})

describe('login action — success', () => {
  it('redirects to /student with a bp-session cookie that round-trips', async () => {
    stub(() => json({ data: { login: PAYLOAD } }))
    const before = Date.now()
    const response = await expectRedirect(postForm(VALID))
    const after = Date.now()

    assert.equal(response.status, 302)
    assert.equal(response.headers.get('Location'), '/student')

    const setCookie = required(response.headers.get('Set-Cookie'), 'a Set-Cookie header')
    assert.match(setCookie, /^bp-session=/)
    assert.match(setCookie, /; Max-Age=2592000; Path=\/; HttpOnly; SameSite=Lax; Secure$/)

    // Round-trip proof: what the browser would send back reads as a session.
    const value = setCookie.split(';')[0].slice('bp-session='.length)
    const session = await readBpSession(
      new Request('https://example.test/student', { headers: { cookie: `bp-session=${value}` } }),
    )
    if (session === null) throw new Error('the sealed cookie must be readable by readBpSession')
    assert.equal(session.accessToken, PAYLOAD.token)
    assert.equal(session.refreshToken, PAYLOAD.refresh_token)
    assert.equal(session.userId, PAYLOAD.user_id)
    assert.equal(session.tenant, PAYLOAD.tenant)
    // The 900s access-token lifetime, applied once at the operation boundary.
    assert.ok(session.accessTokenExpiresAt >= before + 900_000)
    assert.ok(session.accessTokenExpiresAt <= after + 900_000)
  })

  it('sends no Authorization header — login is a NO_USER operation', async () => {
    stub(() => json({ data: { login: PAYLOAD } }))
    await expectRedirect(postForm(VALID))
    assert.equal(calls.length, 1)
    const headers = new Headers(calls[0].init.headers)
    assert.equal(headers.get('authorization'), null)
    assert.equal(calls[0].url, ENDPOINT)
  })

  it('sends the trimmed email and the untrimmed password', async () => {
    stub(() => json({ data: { login: PAYLOAD } }))
    await expectRedirect(postForm({ email: `  ${VALID.email}  `, password: '  spaces  ' }))
    const body = JSON.parse(String(calls[0].init.body)) as {
      variables: { email: string; password: string }
    }
    assert.equal(body.variables.email, VALID.email)
    assert.equal(body.variables.password, '  spaces  ')
  })
})

describe('login action — gateway failures map to user-facing messages', () => {
  const cases: { label: string; kind: BpAiErrorKind; respond: () => Response }[] = [
    {
      label: 'wrong password',
      kind: 'invalid_credentials',
      respond: () => gqlFailure('rpc error: code = Unknown desc = invalid credentials'),
    },
    {
      label: 'duplicate email (structurally impossible here)',
      kind: 'duplicate_email',
      respond: () => gqlFailure('email already registered', 'EMAIL_ALREADY_REGISTERED'),
    },
    {
      label: 'a credential reached a NO_USER operation',
      kind: 'validation',
      respond: () => gqlFailure('BAD_REQUEST: User already authenticated'),
    },
    {
      label: 'missing auth on a USER operation',
      kind: 'unauthenticated',
      respond: () => gqlFailure('UNAUTHORIZED: Authentication required'),
    },
    {
      label: 'an unrecognised gateway error (the current signup outage shape)',
      kind: 'unknown',
      respond: () => gqlFailure('rpc error: code = Internal desc = internal error'),
    },
  ]

  for (const { label, kind, respond } of cases) {
    it(`${label} → ${kind} → the ${kind} message`, async () => {
      stub(respond)
      const data = await expectActionData(postForm(VALID))
      assert.equal(data.ok, false)
      assert.deepEqual(data.fieldErrors, {})
      assert.equal(data.formError, EXPECTED_MESSAGE[kind])
    })
  }

  it('a transport failure → network → the network message', async () => {
    stub(() => {
      throw new Error('ECONNREFUSED')
    })
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.network)
  })

  it('never leaks the gateway’s raw message to the user', async () => {
    stub(() => gqlFailure('rpc error: code = Unknown desc = invalid credentials'))
    const data = await expectActionData(postForm(VALID))
    assert.ok(!String(data.formError).includes('rpc error'))
    assert.ok(!String(data.formError).includes('invalid credentials'))
  })

  it('does not distinguish "no such account" from "wrong password"', async () => {
    // Both come back as `invalid credentials`; one message covers both so the
    // screen cannot be used to enumerate accounts.
    stub(() => gqlFailure('rpc error: code = Unknown desc = invalid credentials'))
    const first = await expectActionData(postForm(VALID))
    stub(() => gqlFailure('invalid credentials'))
    const second = await expectActionData(postForm(VALID))
    assert.equal(first.formError, second.formError)
  })

  it('an AuthPayload with an empty token is rejected rather than sealed', async () => {
    // The gateway really does return a hollow AuthPayload from `validateToken`,
    // so a login answering with one must fail loudly instead of minting a
    // session with an unusable access token.
    stub(() => json({ data: { login: { ...PAYLOAD, token: '' } } }))
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.unknown)
  })

  it('a 200 with neither data nor errors is reported, not crashed on', async () => {
    stub(() => json({ data: null }))
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.unknown)
  })
})

describe('loginFormError', () => {
  it('returns a distinct, non-empty message for every BpAiErrorKind', () => {
    // The Record above is exhaustive by type, so iterating it covers the union.
    for (const [kind, expected] of Object.entries(EXPECTED_MESSAGE)) {
      const message = loginFormError({ kind: kind as BpAiErrorKind, message: 'raw gateway text' })
      assert.equal(message, expected, `mismatch for kind=${kind}`)
      assert.ok(message.length > 0)
    }
  })
})
