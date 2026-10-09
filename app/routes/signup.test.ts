/**
 * Action + loader tests for `/signup`.
 *
 * Same harness and rationale as `app/routes/login.test.ts` — read that file's
 * header for why `globalThis.fetch` is stubbed instead of the `bpSignup`
 * module. **Vitest is intentionally not installed in this repo.**
 *
 * Run: npx tsx --test app/routes/signup.test.ts
 *
 * ⚠️ **These stubs are currently the only coverage this action has.** The test
 * gateway's `signup` operation has been answering
 * `rpc error: code = Internal desc = internal error` on every call since
 * 2026-08-25 (ruled out: rate limiting, email domain — `login` and
 * introspection are healthy), so the plan's live `curl` signup check could not
 * be run. The outage's exact error shape is exercised below as the
 * `signup gateway outage` case, which is the closest a stub can get.
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import type { BpAiErrorKind } from '../lib/bp-ai/types.ts'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT
process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-signup-action-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
// ⚠️ **Every test below except the `BP_SIGNUP_ENABLED` block needs the flag ON.**
// Signup ships switched off (see `isSignupEnabled()`), and both the loader and
// the action 404 while it is — so the whole existing suite would otherwise be
// asserting against a route that refuses to run. Enabling it here is the point:
// the behaviour these tests describe is what happens *once the flag flips*, and
// it must keep working until then. The disabled path is covered separately, and
// deletes the variable itself.
process.env.BP_SIGNUP_ENABLED = '1'

type SignupModule = typeof import('./signup.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let action: SignupModule['action']
let loader: SignupModule['loader']
let signupFormError: SignupModule['signupFormError']
let sealBpSession: SessionModule['sealBpSession']
let readBpSession: SessionModule['readBpSession']

before(async () => {
  const mod = (await import('./signup.tsx')) as SignupModule
  action = mod.action
  loader = mod.loader
  signupFormError = mod.signupFormError
  const session = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  sealBpSession = session.sealBpSession
  readBpSession = session.readBpSession
})

// ── fetch stubbing ───────────────────────────────────────────────────────

type Call = { url: string; init: RequestInit }

const originalFetch = globalThis.fetch
let calls: Call[] = []

function stub(respond: (call: Call) => Response | Promise<Response>): void {
  calls = []
  const impl = async (input: unknown, init?: unknown): Promise<Response> => {
    calls.push({ url: String(input), init: (init ?? {}) as RequestInit })
    return respond(calls[calls.length - 1])
  }
  globalThis.fetch = impl as unknown as typeof globalThis.fetch
}

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

function gqlFailure(message: string, code?: string): Response {
  const entry = code === undefined ? { message } : { message, extensions: { code } }
  return json({ data: null, errors: [entry] })
}

const PAYLOAD = {
  token: 'access-token-jwt',
  refresh_token: 'b'.repeat(64),
  user_id: 'new-user-uuid',
  tenant: 'brand-new-tenant-uuid',
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

function callAction(request: Request) {
  return action({ request, params: {}, context: {} as never } as never)
}

function callLoader(request: Request) {
  return loader({ request, params: {}, context: {} as never } as never)
}

function postForm(fields: Record<string, string>): Request {
  const body = new URLSearchParams(fields)
  return new Request('https://example.test/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
}

async function expectActionData(request: Request) {
  const result = await callAction(request)
  if (result instanceof Response) throw new Error('expected action data, got a Response')
  return result
}

async function expectRedirect(request: Request): Promise<Response> {
  const result = await callAction(request)
  if (!(result instanceof Response)) {
    throw new Error('expected a redirect Response, got action data')
  }
  return result
}

const VALID = {
  email: 'newstudent@example.com',
  password: 'Passw0rd-long-enough',
  name: 'Ada Lovelace',
}

/**
 * Exhaustive by type — adding a `BpAiErrorKind` breaks this record, which is
 * how `signupFormError`'s completeness is enforced.
 *
 * Only `duplicate_email` differs meaningfully from login's table, and it is
 * also the only kind the gateway gives a machine-readable `extensions.code`
 * for — so it is the one message not riding on fragile substring matching.
 */
const EXPECTED_MESSAGE: Record<BpAiErrorKind, string> = {
  duplicate_email: 'That email already has an account. Try logging in instead.',
  network: 'We couldn’t reach Spark EQ. Check your connection and try again.',
  invalid_credentials: 'Something went wrong creating your account. Please try again.',
  validation: 'You appear to be signed in already. Reload the page and try again.',
  unauthenticated: 'Something went wrong creating your account. Please try again.',
  unknown: 'Something went wrong creating your account. Please try again.',
}

/**
 * The kill switch — the tests that matter most in this file right now.
 *
 * **A passing GET test proves nothing here.** Hiding the link and 404ing the
 * loader would leave `POST /signup` wide open, and a POST that reaches
 * `bpSignup` provisions a *real* tenant with a *real* admin on the live
 * gateway. So the load-bearing assertion is the POST one, and specifically the
 * `refuseAllRequests()` in it: the stub throws if anything touches the network,
 * which is the only way to show the flag stops the operation rather than merely
 * discarding its result.
 *
 * `BP_SIGNUP_ENABLED` is deleted per case and restored in `finally` because the
 * rest of this file runs with it ON (see the header) — these tests are the
 * exception, not the baseline.
 */
describe('BP_SIGNUP_ENABLED — the route is gone while the flag is off', () => {
  /** Run `body` with signup disabled, then restore the suite-wide ON value. */
  async function withSignupDisabled(body: () => Promise<void>): Promise<void> {
    delete process.env.BP_SIGNUP_ENABLED
    try {
      await body()
    } finally {
      process.env.BP_SIGNUP_ENABLED = '1'
    }
  }

  /** The 404 both entry points throw. */
  async function expectNotFound(call: () => Promise<unknown>): Promise<Response> {
    let thrown: unknown
    try {
      await call()
    } catch (err) {
      thrown = err
    }
    if (!(thrown instanceof Response)) {
      throw new Error('expected a thrown Response, got none (or a non-Response)')
    }
    assert.equal(thrown.status, 404)
    return thrown
  }

  it('the loader 404s instead of rendering', async () => {
    await withSignupDisabled(async () => {
      await expectNotFound(() => callLoader(new Request('https://example.test/signup')))
    })
  })

  it('the ACTION 404s on a valid POST — and never reaches the gateway', async () => {
    await withSignupDisabled(async () => {
      // Throws on any fetch. If the gate leaked, this is what would fail — and
      // it would fail *because a tenant was being created*, not merely because
      // an assertion did not hold.
      refuseAllRequests()
      await expectNotFound(() => callAction(postForm(VALID)))
      assert.equal(calls.length, 0, 'bpSignup must not be called while signup is disabled')
    })
  })

  it('the action 404s before it even reads the body', async () => {
    await withSignupDisabled(async () => {
      refuseAllRequests()
      // A body that would otherwise produce field errors rather than a network
      // call: the response must still be 404, not action data. A disabled route
      // does not get to answer questions about form validity.
      const result = await expectNotFound(() => callAction(postForm({ email: '', password: '', name: '' })))
      assert.equal(result.status, 404)
      assert.equal(calls.length, 0)
    })
  })

  it('the flag is opt-in: only 1/true/yes/on enable it', async () => {
    // `Boolean(process.env.X)` would read every one of the first four as ON.
    for (const value of ['', ' ', 'false', '0', 'no', 'off', 'maybe']) {
      process.env.BP_SIGNUP_ENABLED = value
      try {
        refuseAllRequests()
        await expectNotFound(() => callAction(postForm(VALID)))
        assert.equal(calls.length, 0, `BP_SIGNUP_ENABLED=${JSON.stringify(value)} must not enable signup`)
      } finally {
        process.env.BP_SIGNUP_ENABLED = '1'
      }
    }

    for (const value of ['1', 'true', 'TRUE', 'yes', 'on', ' On ']) {
      process.env.BP_SIGNUP_ENABLED = value
      try {
        // Enabled → the loader renders rather than throwing.
        const result = await callLoader(new Request('https://example.test/signup'))
        assert.equal(result, null, `BP_SIGNUP_ENABLED=${JSON.stringify(value)} must enable signup`)
      } finally {
        process.env.BP_SIGNUP_ENABLED = '1'
      }
    }
  })
})

describe('signup loader', () => {
  it('renders (returns null) for an anonymous visitor', async () => {
    const result = await callLoader(new Request('https://example.test/signup'))
    assert.equal(result, null)
  })

  it('redirects an already-authenticated visitor to /student instead of rendering', async () => {
    const sealed = await sealBpSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'u',
      tenant: 't',
      accessTokenExpiresAt: Date.now() + 900_000,
    })
    const request = new Request('https://example.test/signup', {
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
})

describe('signup action — validation short-circuits the network', () => {
  it('returns all three field errors for a blank form and never calls the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(postForm({ email: '', password: '', name: '' }))
    assert.equal(data.ok, false)
    assert.deepEqual(data.fieldErrors, {
      email: 'Enter your email address.',
      password: 'Enter your password.',
      name: 'Enter your name.',
    })
    assert.equal(data.formError, undefined)
    assert.equal(calls.length, 0, 'a malformed form must not reach the gateway')
  })

  it('rejects a 7-character password without calling the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(postForm({ ...VALID, password: 'short12' }))
    assert.deepEqual(data.fieldErrors, { password: 'Use at least 8 characters.' })
    assert.equal(calls.length, 0)
  })

  it('rejects a whitespace-only name without calling the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(postForm({ ...VALID, name: '   ' }))
    assert.deepEqual(data.fieldErrors, { name: 'Enter your name.' })
    assert.equal(calls.length, 0)
  })

  it('rejects a malformed email without calling the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(postForm({ ...VALID, email: 'a@b' }))
    assert.deepEqual(data.fieldErrors, { email: "That doesn't look like an email address." })
    assert.equal(calls.length, 0)
  })

  it('does not 500 on a POST whose body is not a parseable form', async () => {
    // See the same test in `login.test.ts` — a bare `curl -X POST /signup`.
    refuseAllRequests()
    const request = new Request('https://example.test/signup', { method: 'POST' })
    const data = await expectActionData(request)
    assert.deepEqual(data.fieldErrors, {
      email: 'Enter your email address.',
      password: 'Enter your password.',
      name: 'Enter your name.',
    })
    assert.equal(calls.length, 0)
  })
})

describe('signup action — success', () => {
  it('redirects into onboarding with a bp-session cookie that round-trips', async () => {
    stub(() => json({ data: { signup: PAYLOAD } }))
    const before = Date.now()
    const response = await expectRedirect(postForm(VALID))
    const after = Date.now()

    assert.equal(response.status, 302)
    // A brand-new account has demonstrably not done onboarding, so unlike
    // login this destination needs no client-side decision (D6).
    assert.equal(response.headers.get('Location'), '/student/onboarding/this-space')

    const setCookie = required(response.headers.get('Set-Cookie'), 'a Set-Cookie header')
    assert.match(setCookie, /^bp-session=/)
    assert.match(setCookie, /; Max-Age=2592000; Path=\/; HttpOnly; SameSite=Lax; Secure$/)

    const value = setCookie.split(';')[0].slice('bp-session='.length)
    const session = await readBpSession(
      new Request('https://example.test/student', { headers: { cookie: `bp-session=${value}` } }),
    )
    if (session === null) throw new Error('the sealed cookie must be readable by readBpSession')
    assert.equal(session.accessToken, PAYLOAD.token)
    assert.equal(session.refreshToken, PAYLOAD.refresh_token)
    assert.equal(session.userId, PAYLOAD.user_id)
    assert.equal(session.tenant, PAYLOAD.tenant)
    assert.ok(session.accessTokenExpiresAt >= before + 900_000)
    assert.ok(session.accessTokenExpiresAt <= after + 900_000)
  })

  it('sends email, password and name — and no Authorization header (NO_USER)', async () => {
    stub(() => json({ data: { signup: PAYLOAD } }))
    await expectRedirect(postForm(VALID))
    assert.equal(calls.length, 1)
    assert.equal(new Headers(calls[0].init.headers).get('authorization'), null)
    const body = JSON.parse(String(calls[0].init.body)) as {
      query: string
      variables: Record<string, unknown>
    }
    assert.deepEqual(body.variables, {
      email: VALID.email,
      password: VALID.password,
      name: VALID.name,
    })
  })

  it('does NOT send org_name', () => {
    // The schema accepts it, but sending one would only name the unwanted
    // brand-new tenant that every self-service signup provisions. See the
    // warning in `signup.tsx` and `bpSignup`'s doc comment.
    stub(() => json({ data: { signup: PAYLOAD } }))
    return expectRedirect(postForm(VALID)).then(() => {
      const body = JSON.parse(String(calls[0].init.body)) as {
        query: string
        variables: Record<string, unknown>
      }
      assert.ok(!('org_name' in body.variables))
      assert.ok(!body.query.includes('org_name'))
    })
  })

  it('sends the trimmed email and name, and the untrimmed password', async () => {
    stub(() => json({ data: { signup: PAYLOAD } }))
    await expectRedirect(
      postForm({ email: ` ${VALID.email} `, password: '  spaces-kept  ', name: `  ${VALID.name} ` }),
    )
    const body = JSON.parse(String(calls[0].init.body)) as {
      variables: { email: string; password: string; name: string }
    }
    assert.equal(body.variables.email, VALID.email)
    assert.equal(body.variables.name, VALID.name)
    assert.equal(body.variables.password, '  spaces-kept  ')
  })
})

describe('signup action — gateway failures map to user-facing messages', () => {
  const cases: { label: string; kind: BpAiErrorKind; respond: () => Response }[] = [
    {
      label: 'duplicate email (the expected, recoverable case)',
      kind: 'duplicate_email',
      respond: () => gqlFailure('email already registered', 'EMAIL_ALREADY_REGISTERED'),
    },
    {
      label: 'duplicate email recognised from the message alone, with no extensions.code',
      kind: 'duplicate_email',
      respond: () => gqlFailure('email already registered'),
    },
    {
      label: 'invalid credentials (structurally impossible here)',
      kind: 'invalid_credentials',
      respond: () => gqlFailure('rpc error: code = Unknown desc = invalid credentials'),
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
      label: 'the signup gateway outage (live as of 2026-08-25)',
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
      throw new Error('ENOTFOUND')
    })
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.network)
  })

  it('never leaks the gateway’s raw message to the user', async () => {
    stub(() => gqlFailure('rpc error: code = Internal desc = internal error'))
    const data = await expectActionData(postForm(VALID))
    assert.ok(!String(data.formError).includes('rpc error'))
    assert.ok(!String(data.formError).includes('internal error'))
  })

  it('an AuthPayload missing its refresh token is rejected rather than sealed', async () => {
    stub(() => json({ data: { signup: { ...PAYLOAD, refresh_token: null } } }))
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.unknown)
  })
})

describe('signupFormError', () => {
  it('returns a non-empty message for every BpAiErrorKind', () => {
    for (const [kind, expected] of Object.entries(EXPECTED_MESSAGE)) {
      const message = signupFormError({ kind: kind as BpAiErrorKind, message: 'raw gateway text' })
      assert.equal(message, expected, `mismatch for kind=${kind}`)
      assert.ok(message.length > 0)
    }
  })

  it('points a duplicate email at the recovery path', () => {
    const message = signupFormError({ kind: 'duplicate_email', message: 'email already registered' })
    assert.match(message, /log(ging)? in/i)
  })
})
