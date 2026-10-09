/**
 * Action + loader tests for `/invite`.
 *
 * Same harness as `login.test.ts` — `node:test` under `tsx`, real chain with a
 * stubbed `globalThis.fetch`, no module mocks. Read that file's header for why.
 *
 * Run: npx tsx --test app/routes/invite.test.ts
 *
 * **What these tests can and cannot prove.** The *refusal* path is measured: a
 * token `api-test` will not redeem answers `UNAUTHORIZED` / "Authentication
 * required" (2026-09-22), which is what the `unauthenticated` case below
 * asserts the copy for. The *success* path is not: no invitation email has ever
 * been sent, because `inviteUser` answers `BAD_REQUEST / InvalidArgument` for
 * every caller on that environment — a real user, a bogus id, a JWT admin and
 * an API key alike. So every assertion about a redeemed token below is an
 * assertion about a payload shaped like the one the schema promises, and the
 * end-to-end proof is still outstanding.
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import type { BpAiErrorKind } from '../lib/bp-ai/types.ts'

const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT
process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-invite-action-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'

type InviteModule = typeof import('./invite.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let action: InviteModule['action']
let loader: InviteModule['loader']
let inviteFormError: InviteModule['inviteFormError']
let sealBpSession: SessionModule['sealBpSession']
let readBpSession: SessionModule['readBpSession']

before(async () => {
  const mod = (await import('./invite.tsx')) as InviteModule
  action = mod.action
  loader = mod.loader
  inviteFormError = mod.inviteFormError
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

const TOKEN = 'invitation-token-from-the-email'
const VALID = { token: TOKEN, password: 'Passw0rd-long-enough', confirm: 'Passw0rd-long-enough' }

function postForm(fields: Record<string, string>, cookie?: string): Request {
  const body = new URLSearchParams(fields)
  const headers = new Headers({ 'content-type': 'application/x-www-form-urlencoded' })
  if (cookie) headers.set('cookie', cookie)
  return new Request('https://example.test/invite', { method: 'POST', headers, body })
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

/**
 * The user-facing message for every failure kind. A `Record<BpAiErrorKind, …>`
 * on purpose — see the note on login's copy of this table.
 */
const EXPECTED_MESSAGE: Record<BpAiErrorKind, string> = {
  // Measured 2026-09-22: this is what a token the platform will not redeem
  // actually produces (`UNAUTHORIZED` / "Authentication required").
  unauthenticated:
    'That invitation link has expired or has already been used. Ask your school to send you a new one.',
  // Same sentence: this action sends no credential, so a BAD_REQUEST can only
  // be about the token either.
  validation:
    'That invitation link has expired or has already been used. Ask your school to send you a new one.',
  network: 'We couldn’t reach Spark EQ. Check your connection and try again.',
  duplicate_email: 'Something went wrong setting your password. Please try again.',
  invalid_credentials: 'Something went wrong setting your password. Please try again.',
  unknown: 'Something went wrong setting your password. Please try again.',
}

describe('invite loader', () => {
  it('hands the screen the token from the link', async () => {
    const result = await callLoader(new Request(`https://example.test/invite?token=${TOKEN}`))
    assert.deepEqual(result, { token: TOKEN })
  })

  it('trims whitespace a mail client wrapped into the link', async () => {
    const result = await callLoader(
      new Request(`https://example.test/invite?token=${encodeURIComponent(`  ${TOKEN}\n`)}`),
    )
    assert.deepEqual(result, { token: TOKEN })
  })

  it('reports an empty token for a visitor who arrived without one', async () => {
    assert.deepEqual(await callLoader(new Request('https://example.test/invite')), { token: '' })
  })

  it('does NOT bounce an already-authenticated visitor', async () => {
    // The deliberate difference from `/login` and `/signup`. The token names a
    // specific person; a stale session on a shared device is not theirs, and
    // redirecting would leave them with no way to accept. See the route header.
    const sealed = await sealBpSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'u',
      tenant: 't',
      accessTokenExpiresAt: Date.now() + 900_000,
    })
    const result = await callLoader(
      new Request(`https://example.test/invite?token=${TOKEN}`, {
        headers: { cookie: `bp-session=${sealed}` },
      }),
    )
    assert.deepEqual(result, { token: TOKEN })
  })
})

describe('invite action — validation short-circuits the network', () => {
  it('returns both field errors for a blank form and never calls the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(postForm({ token: TOKEN, password: '', confirm: '' }))
    assert.equal(data.ok, false)
    assert.deepEqual(data.fieldErrors, {
      password: 'Enter your password.',
      confirm: 'Type your password again.',
    })
    assert.equal(calls.length, 0, 'a malformed form must not reach the gateway')
  })

  it('rejects a password under the minimum without reporting a mismatch as well', async () => {
    refuseAllRequests()
    const data = await expectActionData(
      postForm({ token: TOKEN, password: 'short', confirm: 'different' }),
    )
    // One problem at a time: "those don't match" under "too short" describes
    // something the user cannot fix until they fix the other.
    assert.deepEqual(data.fieldErrors, { password: 'Use at least 8 characters.' })
    assert.equal(calls.length, 0)
  })

  it('reports a mismatch on the confirmation field', async () => {
    refuseAllRequests()
    const data = await expectActionData(
      postForm({ token: TOKEN, password: VALID.password, confirm: `${VALID.password}x` }),
    )
    assert.deepEqual(data.fieldErrors, { confirm: 'Those passwords don’t match.' })
    assert.equal(calls.length, 0)
  })

  it('keeps whitespace inside a password rather than trimming it', async () => {
    stub(() => json({ data: { acceptInvitation: PAYLOAD } }))
    const spaced = ' a password with spaces '
    await expectRedirect(postForm({ token: TOKEN, password: spaced, confirm: spaced }))
    const body = JSON.parse(String(required(calls[0].init.body, 'a request body')))
    assert.equal(body.variables.password, spaced)
  })

  it('refuses a POST with no token without calling the API', async () => {
    refuseAllRequests()
    const data = await expectActionData(
      postForm({ password: VALID.password, confirm: VALID.password }),
    )
    assert.match(required(data.formError, 'a form error'), /missing its token/)
    assert.equal(calls.length, 0)
  })

  it('treats entirely missing form fields as blank rather than throwing', async () => {
    refuseAllRequests()
    const request = new Request('https://example.test/invite', { method: 'POST' })
    const data = await expectActionData(request)
    assert.equal(data.ok, false)
    assert.equal(calls.length, 0)
  })
})

describe('invite action — the gateway call', () => {
  it('sends token and password as variables, never inlined into the document', async () => {
    stub(() => json({ data: { acceptInvitation: PAYLOAD } }))
    await expectRedirect(postForm(VALID))

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, ENDPOINT)
    const body = JSON.parse(String(required(calls[0].init.body, 'a request body')))
    assert.match(body.query, /acceptInvitation\(token: \$token, password: \$password\)/)
    assert.deepEqual(body.variables, { token: TOKEN, password: VALID.password })
    assert.doesNotMatch(body.query, /Passw0rd/, 'the password must never be inlined into the query')
  })

  it('sends NO Authorization header — the token IS the credential', async () => {
    // `acceptInvitation` is NO_USER. A stale `bp-session` on the device must not
    // turn a redemption into `BAD_REQUEST: User already authenticated`, and a
    // shared device is exactly where this happens.
    stub(() => json({ data: { acceptInvitation: PAYLOAD } }))
    const sealed = await sealBpSession({
      accessToken: 'somebody-elses-access-token',
      refreshToken: 'refresh',
      userId: 'someone-else',
      tenant: 't',
      accessTokenExpiresAt: Date.now() + 900_000,
    })
    await expectRedirect(postForm(VALID, `bp-session=${sealed}`))

    const headers = new Headers(calls[0].init.headers as HeadersInit)
    assert.equal(headers.get('authorization'), null)
  })

  it('seals a session and redirects into onboarding', async () => {
    stub(() => json({ data: { acceptInvitation: PAYLOAD } }))
    const response = await expectRedirect(postForm(VALID))

    assert.equal(response.status, 302)
    assert.equal(response.headers.get('Location'), '/student/onboarding/this-space')

    const cookie = required(response.headers.get('Set-Cookie'), 'a Set-Cookie header')
    assert.match(cookie, /^bp-session=/)
    assert.match(cookie, /HttpOnly/)

    // The cookie must be readable as the session the payload describes — proof
    // the invitee is signed in, not merely redirected.
    const sealed = cookie.slice('bp-session='.length).split(';')[0]
    const session = await readBpSession(
      new Request('https://example.test/student', { headers: { cookie: `bp-session=${sealed}` } }),
    )
    assert.equal(required(session, 'a readable session').userId, PAYLOAD.user_id)
    assert.equal(required(session, 'a readable session').tenant, PAYLOAD.tenant)
  })

  it('replaces an existing session rather than keeping the old one', async () => {
    stub(() => json({ data: { acceptInvitation: PAYLOAD } }))
    const stale = await sealBpSession({
      accessToken: 'somebody-elses-access-token',
      refreshToken: 'refresh',
      userId: 'someone-else',
      tenant: 'another-tenant',
      accessTokenExpiresAt: Date.now() + 900_000,
    })
    const response = await expectRedirect(postForm(VALID, `bp-session=${stale}`))
    const cookie = required(response.headers.get('Set-Cookie'), 'a Set-Cookie header')
    const sealed = cookie.slice('bp-session='.length).split(';')[0]
    const session = await readBpSession(
      new Request('https://example.test/student', { headers: { cookie: `bp-session=${sealed}` } }),
    )
    assert.equal(required(session, 'a readable session').userId, PAYLOAD.user_id)
  })

  it('rejects a half-populated AuthPayload instead of sealing a holed session', async () => {
    // `validateToken` genuinely returns an empty `token`, so the gateway will
    // resolve an AuthPayload with holes in it. Sealing one would produce a
    // session that 401s on every later request.
    stub(() => json({ data: { acceptInvitation: { ...PAYLOAD, token: '' } } }))
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.unknown)
  })
})

describe('invite action — failure copy', () => {
  it('maps the measured UNAUTHORIZED refusal to the expired-or-used message', async () => {
    // Verbatim from `api-test`, 2026-09-22, for a token it would not redeem.
    stub(() => gqlFailure('Authentication required', 'UNAUTHORIZED'))
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.unauthenticated)
    assert.deepEqual(data.fieldErrors, {})
  })

  it('maps a BAD_REQUEST to the same message — it can only be the token', async () => {
    stub(() => gqlFailure('BAD_REQUEST: invitation token is invalid'))
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.validation)
    assert.deepEqual(data.fieldErrors, {})
  })

  it('maps a transport failure to the network message', async () => {
    stub(() => {
      throw new TypeError('fetch failed')
    })
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.network)
  })

  it('never shows the gateway’s own words', async () => {
    stub(() => gqlFailure('rpc error: code = Unknown desc = something internal'))
    const data = await expectActionData(postForm(VALID))
    assert.equal(data.formError, EXPECTED_MESSAGE.unknown)
    assert.doesNotMatch(required(data.formError, 'a form error'), /rpc error/)
  })

  it('covers every BpAiErrorKind exhaustively', () => {
    for (const kind of Object.keys(EXPECTED_MESSAGE) as BpAiErrorKind[]) {
      assert.equal(inviteFormError({ kind, message: 'whatever' }), EXPECTED_MESSAGE[kind])
    }
  })
})
