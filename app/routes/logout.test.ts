/**
 * Action + loader tests for `/logout`.
 *
 * **Not in the plan's Phase 3 file list** — added deliberately. The plan named
 * `validate`, `login` and `signup` tests, but `logout.tsx` carries the one rule
 * in this phase that is easiest to break and worst to get wrong: **the cookie
 * is cleared whether or not the gateway call succeeds.** A regression there
 * leaves a user who pressed "log out" still logged in, silently. That is worth
 * a test file.
 *
 * Same harness as `login.test.ts`. Run: npx tsx --test app/routes/logout.test.ts
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT
process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-logout-action-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'

type LogoutModule = typeof import('./logout.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let action: LogoutModule['action']
let loader: LogoutModule['loader']
let sealBpSession: SessionModule['sealBpSession']
let readBpSession: SessionModule['readBpSession']

before(async () => {
  const mod = (await import('./logout.tsx')) as LogoutModule
  action = mod.action
  loader = mod.loader
  const session = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  sealBpSession = session.sealBpSession
  readBpSession = session.readBpSession
})

// ── stubbing ─────────────────────────────────────────────────────────────

type Call = { url: string; init: RequestInit }

const originalFetch = globalThis.fetch
const originalWarn = console.warn
let calls: Call[] = []
let warnings: string[] = []

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
    throw new Error('the action must not reach the gateway with no session')
  })
}

beforeEach(() => {
  calls = []
  warnings = []
  // Captured rather than silenced: the two failure paths below assert that a
  // best-effort failure is actually logged, not swallowed.
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
  }
})

after(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const ACCESS_TOKEN = 'access-token-jwt'
const REFRESH_TOKEN = 'c'.repeat(64)

async function sessionCookie(): Promise<string> {
  const sealed = await sealBpSession({
    accessToken: ACCESS_TOKEN,
    refreshToken: REFRESH_TOKEN,
    userId: 'u',
    tenant: 't',
    accessTokenExpiresAt: Date.now() + 900_000,
  })
  return `bp-session=${sealed}`
}

function callAction(request: Request) {
  return action({ request, params: {}, context: {} as never } as never)
}

function post(cookie?: string, method = 'POST'): Request {
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  return new Request('https://example.test/logout', { method, headers })
}

const CLEARING_COOKIE = 'bp-session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure'

/** Assert the response logs the user out locally, whatever else happened. */
function assertLoggedOut(response: Response): void {
  assert.equal(response.status, 302)
  assert.equal(response.headers.get('Location'), '/login')
  assert.equal(response.headers.get('Set-Cookie'), CLEARING_COOKIE)
}

describe('logout loader', () => {
  it('answers 405 with Allow: POST on GET', async () => {
    // A GET logout is triggerable by an <img>, a prefetch or a preconnect.
    const res = loader()
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('Allow'), 'POST')
    const body = (await res.json()) as { ok: boolean; error: string }
    assert.deepEqual(body, { ok: false, error: 'method-not-allowed' })
  })
})

describe('logout action', () => {
  it('answers 405 on a non-POST method', async () => {
    refuseAllRequests()
    const res = await callAction(post(undefined, 'DELETE'))
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('Allow'), 'POST')
    assert.equal(calls.length, 0)
  })

  it('calls the gateway with the RAW access token, not Bearer', async () => {
    // Raw is the only variant observed to actually revoke the access token —
    // with `Bearer` the gateway returns true and silently skips revocation.
    stub(() => json({ data: { logout: true } }))
    const res = await callAction(post(await sessionCookie()))
    assertLoggedOut(res)

    assert.equal(calls.length, 1)
    const authorization = new Headers(calls[0].init.headers).get('authorization')
    assert.equal(authorization, ACCESS_TOKEN)
    assert.ok(!String(authorization).startsWith('Bearer'))

    const body = JSON.parse(String(calls[0].init.body)) as {
      variables: { refresh_token: string }
    }
    assert.equal(body.variables.refresh_token, REFRESH_TOKEN)
  })

  it('clears the cookie even when the gateway rejects the call', async () => {
    stub(() => json({ data: null, errors: [{ message: 'UNAUTHORIZED: Authentication required' }] }))
    const res = await callAction(post(await sessionCookie()))
    assertLoggedOut(res)
    assert.equal(calls.length, 1)
    assert.equal(warnings.length, 1, 'a best-effort failure must still be logged')
    assert.match(warnings[0], /\[logout\]/)
  })

  it('clears the cookie even when the network is down', async () => {
    stub(() => {
      throw new Error('ECONNREFUSED')
    })
    const res = await callAction(post(await sessionCookie()))
    assertLoggedOut(res)
    assert.equal(warnings.length, 1)
  })

  it('clears the cookie and skips the gateway when there is no session', async () => {
    refuseAllRequests()
    assertLoggedOut(await callAction(post()))
    assert.equal(calls.length, 0)
    assert.equal(warnings.length, 0)
  })

  it('sweeps an unreadable bp-session cookie without calling the gateway', async () => {
    // A cookie signed with a rotated secret is unreadable but still present in
    // the browser. If we skipped the Set-Cookie here it could never be removed.
    refuseAllRequests()
    assertLoggedOut(await callAction(post('bp-session=not-a-jwt')))
    assert.equal(calls.length, 0)
  })

  it('the clearing cookie really does clear the session', async () => {
    stub(() => json({ data: { logout: true } }))
    const res = await callAction(post(await sessionCookie()))
    const setCookie = res.headers.get('Set-Cookie') ?? ''
    const value = setCookie.split(';')[0].slice('bp-session='.length)
    const session = await readBpSession(
      new Request('https://example.test/student', { headers: { cookie: `bp-session=${value}` } }),
    )
    assert.equal(session, null)
  })
})
