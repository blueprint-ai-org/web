/**
 * Action + loader tests for `/signup` — join my school (`joinTenant`).
 *
 * Same harness and rationale as `app/routes/login.test.ts` — read that file's
 * header for why `globalThis.fetch` is stubbed instead of the `bpJoinTenant`
 * module. **Vitest is intentionally not installed in this repo.**
 *
 * Run: npx tsx --test app/routes/signup.test.ts
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { Role } from '../lib/bp-ai/gql/schema.ts'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT
process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-signup-action-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'

type SignupModule = typeof import('./signup.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let action: SignupModule['action']
let loader: SignupModule['loader']
let JOIN_CODE_INVALID_MESSAGE: SignupModule['JOIN_CODE_INVALID_MESSAGE']
let sealBpSession: SessionModule['sealBpSession']

before(async () => {
  const mod = (await import('./signup.tsx')) as SignupModule
  action = mod.action
  loader = mod.loader
  JOIN_CODE_INVALID_MESSAGE = mod.JOIN_CODE_INVALID_MESSAGE
  const session = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  sealBpSession = session.sealBpSession
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

function gqlFailure(message: string, code?: string, reason?: string, field?: string): Response {
  const extensions: Record<string, string> = {}
  if (code !== undefined) extensions.code = code
  if (reason !== undefined) extensions.reason = reason
  if (field !== undefined) extensions.field = field
  const entry = Object.keys(extensions).length === 0 ? { message } : { message, extensions }
  return json({ data: null, errors: [entry] })
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

const VALID = {
  code: 'K7QX2MPR9D',
  name: 'Ada Lovelace',
  email: 'newstudent@example.com',
}

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
      role: Role.Student,
      refreshExpiresAt: null,
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
    const data = await expectActionData(postForm({ code: '', name: '', email: '' }))
    assert.deepEqual(data, {
      ok: false,
      fieldErrors: {
        code: 'Enter the code your school gave you.',
        name: 'Enter your name.',
        email: 'Enter your email address.',
      },
    })
    assert.equal(calls.length, 0, 'a malformed form must not reach the gateway')
  })

  it('does not 500 on a POST whose body is not a parseable form', async () => {
    // See the same test in `login.test.ts` — a bare `curl -X POST /signup`.
    refuseAllRequests()
    const data = await expectActionData(new Request('https://example.test/signup', { method: 'POST' }))
    assert.equal(data.ok, false)
    assert.equal(calls.length, 0)
  })
})

describe('signup action — joinTenant', () => {
  it('sends the trimmed code, email and name — no password, no Authorization (NO_USER)', async () => {
    stub(() => json({ data: { joinTenant: true } }))
    await expectActionData(postForm({ code: ` ${VALID.code} `, name: ` ${VALID.name} `, email: ` ${VALID.email} ` }))
    assert.equal(calls.length, 1)
    assert.equal(new Headers(calls[0].init.headers).get('authorization'), null)
    const body = JSON.parse(String(calls[0].init.body)) as { variables: Record<string, unknown> }
    assert.deepEqual(body.variables, VALID)
  })

  it('answers "sent" with the address, and sets no session — the password comes at /invite', async () => {
    stub(() => json({ data: { joinTenant: true } }))
    const result = await callAction(postForm(VALID))
    if (result instanceof Response) throw new Error('expected action data, not a redirect or cookie')
    assert.deepEqual(result, { ok: true, email: VALID.email })
  })

  it('puts JOIN_CODE_INVALID under the code field, not in the banner', async () => {
    stub(() => gqlFailure('join code invalid', 'BAD_REQUEST', 'JOIN_CODE_INVALID', 'code'))
    const data = await expectActionData(postForm(VALID))
    assert.deepEqual(data, { ok: false, fieldErrors: { code: JOIN_CODE_INVALID_MESSAGE } })
  })

  it('any other failure is a banner, and never the gateway’s own words', async () => {
    stub(() => gqlFailure('rpc error: code = Internal desc = internal error'))
    const data = await expectActionData(postForm(VALID))
    if (data.ok) throw new Error('expected a failure')
    assert.deepEqual(data.fieldErrors, {})
    assert.doesNotMatch(required(data.formError, 'a banner'), /rpc error|internal error/)
  })
})
