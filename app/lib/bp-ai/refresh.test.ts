/**
 * Unit tests for the transparent-refresh middleware.
 *
 * `node:test` under `tsx` — **vitest is intentionally not installed in this
 * repo**. Modeled on `app/routes/login.test.ts`: set env, stub
 * `globalThis.fetch`, then dynamic-import, so the whole real chain runs
 * (middleware → `bpRefresh` → `graphql` → transport) and the tests prove that
 * the pieces actually compose rather than that a mock matches a fiction.
 *
 * Run: npx tsx --test app/lib/bp-ai/refresh.test.ts
 *
 * **The load-bearing suite is "single-flight".** Everything else here fails
 * loudly if it regresses; a broken single-flight guard fails *silently* — two
 * concurrent requests each spend the same rotating refresh token, the gateway
 * revokes the family, and the user is signed out within fifteen minutes with no
 * error anywhere. That is why the concurrency case is asserted twice, at 2 and
 * at 10 requests, and why the in-flight map is checked for leaks after every
 * outcome.
 *
 * `assert.ok` / `assert.fail` cannot narrow types here: `tsconfig.vite.json`
 * omits `node` from its `types`, so `node:assert`'s `asserts` / `never`
 * signatures are unavailable. Narrowing is done with plain `if (…) throw`, as
 * the other bp-ai tests now do.
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import type { BpSession } from './types.ts'

// Set unconditionally, never `??=`: `config.server.ts` throws at module
// evaluation without the URL, and these tests must never reach the live
// gateway even when a real endpoint is in the ambient environment.
const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT
// `sealBpSession` refuses to sign when these two match — that guard is the
// LTI/BP-AI separation (D10), so the fixtures must respect it.
process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-refresh-middleware-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'

type RefreshModule = typeof import('./refresh.server.ts')
type SessionModule = typeof import('./session.server.ts')

let bpRefreshMiddleware: RefreshModule['bpRefreshMiddleware']
let bpAccessTokenNeedsRefresh: RefreshModule['bpAccessTokenNeedsRefresh']
let bpRefreshInFlightCount: RefreshModule['bpRefreshInFlightCount']
let BP_REFRESH_SKEW_SECONDS: RefreshModule['BP_REFRESH_SKEW_SECONDS']
let sealBpSession: SessionModule['sealBpSession']
let readBpSession: SessionModule['readBpSession']
let BP_SESSION_MAX_AGE_SECONDS: SessionModule['BP_SESSION_MAX_AGE_SECONDS']

before(async () => {
  const mod = (await import('./refresh.server.ts')) as RefreshModule
  bpRefreshMiddleware = mod.bpRefreshMiddleware
  bpAccessTokenNeedsRefresh = mod.bpAccessTokenNeedsRefresh
  bpRefreshInFlightCount = mod.bpRefreshInFlightCount
  BP_REFRESH_SKEW_SECONDS = mod.BP_REFRESH_SKEW_SECONDS
  const session = (await import('./session.server.ts')) as SessionModule
  sealBpSession = session.sealBpSession
  readBpSession = session.readBpSession
  BP_SESSION_MAX_AGE_SECONDS = session.BP_SESSION_MAX_AGE_SECONDS
})

// ── fetch stubbing ───────────────────────────────────────────────────────

const originalFetch = globalThis.fetch
let fetchCalls: string[] = []

/**
 * Install a `globalThis.fetch` stub. `respond` receives the 1-based call
 * number so a stub can return a different rotation each time — which is how
 * the concurrency tests detect a second upstream call even when it "works".
 * Throwing from `respond` rejects, i.e. a transport failure.
 */
function stub(respond: (callNumber: number) => Response | Promise<Response>): void {
  fetchCalls = []
  const impl = async (input: unknown, init?: unknown): Promise<Response> => {
    fetchCalls.push(String(input))
    const body = (init as { body?: unknown } | undefined)?.body
    assert.equal(typeof body, 'string', 'the client must send a JSON string body')
    return respond(fetchCalls.length)
  }
  globalThis.fetch = impl as unknown as typeof globalThis.fetch
}

/** A stub that fails the test if it is ever called. */
function refuseAllRequests(): void {
  stub(() => {
    throw new Error('the middleware must not reach the gateway in this case')
  })
}

beforeEach(() => {
  fetchCalls = []
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

/** A successful `refreshToken` response. `n` distinguishes rotations. */
function rotation(n: number): Response {
  return json({
    data: {
      refreshToken: {
        token: `access-token-${n}`,
        refresh_token: `refresh-token-${n}`,
        user_id: USER_ID,
        tenant: TENANT_ID,
      },
    },
  })
}

/** A GraphQL error response, in the gateway's real `rpc error:` shape. */
function gqlError(message: string): Response {
  return json({ data: null, errors: [{ message: `rpc error: code = Unknown desc = ${message}` }] })
}

// ── fixtures ─────────────────────────────────────────────────────────────

const USER_ID = 'c0d5b335-0000-4000-8000-000000000001'
const TENANT_ID = 'ee97c4ea-0000-4000-8000-000000000002'
/** 64-char hex, the shape the gateway really issues. */
const REFRESH_TOKEN = 'a1b2c3d4'.repeat(8)

function sessionFixture(overrides: Partial<BpSession> = {}): BpSession {
  return {
    accessToken: 'original.access.token',
    refreshToken: REFRESH_TOKEN,
    userId: USER_ID,
    tenant: TENANT_ID,
    accessTokenExpiresAt: Date.now() + 10 * 60 * 1000,
    ...overrides,
  }
}

/**
 * A `Cookie` request header carrying a sealed session whose access token
 * expires `msFromNow` from now. Negative values mean already expired.
 *
 * Two neighbours ride along in every fixture: the theme cookie and
 * `lti-claims`. They are not decoration — the middleware rewrites this header
 * in place, and losing an unrelated cookie (`lti-claims` above all) would be a
 * silent, nasty regression.
 */
async function cookieHeader(msFromNow: number, refreshToken = REFRESH_TOKEN): Promise<string> {
  const sealed = await sealBpSession(
    sessionFixture({ accessTokenExpiresAt: Date.now() + msFromNow, refreshToken }),
  )
  return `theme=dark; bp-session=${sealed}; lti-claims=some.lti.jwt`
}

// ── fake Express req / res / next ────────────────────────────────────────

interface FakeRequest {
  path: string
  headers: { cookie?: string | undefined }
}

interface FakeResponse {
  appended: Array<[string, string]>
  append(field: string, value: string): void
}

function fakeRequest(cookie: string | undefined, path = '/student'): FakeRequest {
  return { path, headers: cookie === undefined ? {} : { cookie } }
}

function fakeResponse(): FakeResponse {
  return {
    appended: [],
    append(field: string, value: string): void {
      this.appended.push([field, value])
    },
  }
}

interface Run {
  req: FakeRequest
  res: FakeResponse
  nextCalls: number
}

/** Drive the middleware once and report everything it touched. */
async function run(req: FakeRequest): Promise<Run> {
  const res = fakeResponse()
  const out: Run = { req, res, nextCalls: 0 }
  await bpRefreshMiddleware(req, res, () => {
    out.nextCalls += 1
  })
  return out
}

/** Every `Set-Cookie` value the middleware appended. */
function setCookies(res: FakeResponse): string[] {
  return res.appended.filter(([field]) => field === 'Set-Cookie').map(([, value]) => value)
}

/** Read the session back out of the (possibly rewritten) request header. */
function sessionFromRequest(req: FakeRequest): Promise<BpSession | null> {
  const cookie = req.headers.cookie
  return readBpSession(
    new Request('http://test.internal/', cookie === undefined ? {} : { headers: { cookie } }),
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── the expiry predicate ─────────────────────────────────────────────────

describe('bpAccessTokenNeedsRefresh', () => {
  const now = 1_770_000_000_000

  it('leaves a token with a full lifetime ahead of it alone', () => {
    assert.equal(bpAccessTokenNeedsRefresh(sessionFixture({ accessTokenExpiresAt: now + 900_000 }), now), false)
  })

  it('scales the skew to milliseconds — 59s out is inside a 60s window', () => {
    // The regression this pins: `accessTokenExpiresAt` is epoch **ms**, so a
    // skew compared without the ×1000 would treat 59s as "plenty of time" and
    // never refresh until the token was already dead.
    assert.equal(bpAccessTokenNeedsRefresh(sessionFixture({ accessTokenExpiresAt: now + 59_000 }), now), true)
  })

  it('refreshes exactly at the skew boundary and not one millisecond earlier', () => {
    const boundary = BP_REFRESH_SKEW_SECONDS * 1000
    assert.equal(bpAccessTokenNeedsRefresh(sessionFixture({ accessTokenExpiresAt: now + boundary }), now), true)
    assert.equal(
      bpAccessTokenNeedsRefresh(sessionFixture({ accessTokenExpiresAt: now + boundary + 1 }), now),
      false,
    )
  })

  it('refreshes an already-expired token rather than giving up on it', () => {
    assert.equal(bpAccessTokenNeedsRefresh(sessionFixture({ accessTokenExpiresAt: now - 60_000 }), now), true)
  })
})

// ── no-op paths ──────────────────────────────────────────────────────────

describe('no-op paths', () => {
  it('does nothing at all with no bp-session cookie', async () => {
    refuseAllRequests()
    const r = await run(fakeRequest('theme=dark; lti-claims=some.lti.jwt'))

    assert.equal(fetchCalls.length, 0)
    assert.deepEqual(r.res.appended, [])
    assert.equal(r.req.headers.cookie, 'theme=dark; lti-claims=some.lti.jwt')
    assert.equal(r.nextCalls, 1)
    assert.equal(bpRefreshInFlightCount(), 0)
  })

  it('does nothing at all with no Cookie header whatsoever', async () => {
    refuseAllRequests()
    const r = await run(fakeRequest(undefined))

    assert.equal(fetchCalls.length, 0)
    assert.deepEqual(r.res.appended, [])
    assert.equal(r.req.headers.cookie, undefined)
    assert.equal(r.nextCalls, 1)
  })

  it('leaves a fresh token alone', async () => {
    refuseAllRequests()
    const cookie = await cookieHeader(10 * 60 * 1000)
    const r = await run(fakeRequest(cookie))

    assert.equal(fetchCalls.length, 0)
    assert.deepEqual(r.res.appended, [])
    assert.equal(r.req.headers.cookie, cookie)
    assert.equal(r.nextCalls, 1)
  })

  it('leaves an unreadable bp-session cookie alone — there is no refresh token to spend', async () => {
    refuseAllRequests()
    const cookie = 'theme=dark; bp-session=not.a.jwt'
    const r = await run(fakeRequest(cookie))

    assert.equal(fetchCalls.length, 0)
    assert.deepEqual(r.res.appended, [])
    assert.equal(r.req.headers.cookie, cookie, 'clearing it is the route gate’s call, not ours')
    assert.equal(r.nextCalls, 1)
  })

  it('is a no-op for /lti/* even when a near-expiry session is present', async () => {
    // The LTI immunity assertion. `bp-session` is SameSite=Lax so a Canvas
    // launch cannot carry it in the first place — this proves the middleware
    // does not depend on the browser honouring that.
    refuseAllRequests()
    const cookie = await cookieHeader(1_000)

    for (const path of ['/lti', '/lti/login', '/lti/launch', '/lti/validate', '/lti/register']) {
      const r = await run(fakeRequest(cookie, path))
      assert.equal(fetchCalls.length, 0, `${path} must not reach the gateway`)
      assert.deepEqual(r.res.appended, [], `${path} must not touch the response`)
      assert.equal(r.req.headers.cookie, cookie, `${path} must not touch the request`)
      assert.equal(r.nextCalls, 1)
    }
  })
})

// ── the happy path ───────────────────────────────────────────────────────

describe('near-expiry refresh', () => {
  it('refreshes once, sets the new cookie, and rewrites req.headers.cookie', async () => {
    stub((n) => rotation(n))
    const before = Date.now()
    const r = await run(fakeRequest(await cookieHeader(30_000)))

    // Exactly one upstream call, to the configured endpoint.
    assert.equal(fetchCalls.length, 1)
    assert.equal(fetchCalls[0], ENDPOINT)
    assert.equal(r.nextCalls, 1)

    // 1. The response carries the new cookie, with the full attribute set.
    const cookies = setCookies(r.res)
    assert.equal(cookies.length, 1)
    const sealed = cookies[0]
    if (sealed === undefined) throw new Error('expected a Set-Cookie value')
    assert.match(sealed, /^bp-session=[\w-]+\.[\w-]+\.[\w-]+; /)
    assert.match(
      sealed,
      new RegExp(`; Max-Age=${BP_SESSION_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax; Secure$`),
    )

    // 2. The request now carries the fresh token, so loaders later in this
    //    same request see it. This is the half that is easy to forget.
    const rewritten = await sessionFromRequest(r.req)
    if (!rewritten) throw new Error('expected the rewritten cookie to still hold a session')
    assert.equal(rewritten.accessToken, 'access-token-1')
    assert.equal(rewritten.refreshToken, 'refresh-token-1')
    assert.equal(rewritten.userId, USER_ID)
    assert.equal(rewritten.tenant, TENANT_ID)

    // The stamped expiry is ~900s out in **milliseconds**. A seconds-based
    // expiry would land in 1970 and make every later request refresh again.
    assert.ok(
      rewritten.accessTokenExpiresAt >= before + 899_000,
      `expiry ${rewritten.accessTokenExpiresAt} should be ~900s past ${before}`,
    )
    assert.ok(rewritten.accessTokenExpiresAt <= Date.now() + 900_000)

    // Neighbouring cookies survive the rewrite.
    const cookie = r.req.headers.cookie ?? ''
    assert.ok(cookie.includes('theme=dark'), 'the theme cookie must survive')
    assert.ok(cookie.includes('lti-claims=some.lti.jwt'), 'lti-claims must survive')
    assert.equal(cookie.match(/bp-session=/g)?.length, 1, 'exactly one bp-session in the header')

    assert.equal(bpRefreshInFlightCount(), 0, 'the in-flight entry must be released')
  })

  it('refreshes an access token that has already expired', async () => {
    stub((n) => rotation(n))
    const r = await run(fakeRequest(await cookieHeader(-5 * 60 * 1000)))

    assert.equal(fetchCalls.length, 1)
    const rewritten = await sessionFromRequest(r.req)
    if (!rewritten) throw new Error('expected a refreshed session')
    assert.equal(rewritten.accessToken, 'access-token-1')
    assert.equal(r.nextCalls, 1)
  })

  it('sends the refresh token from the cookie as the refreshToken variable', async () => {
    let sentBody = ''
    globalThis.fetch = (async (_input: unknown, init?: unknown): Promise<Response> => {
      fetchCalls.push('called')
      sentBody = String((init as { body?: unknown }).body)
      return rotation(1)
    }) as unknown as typeof globalThis.fetch

    await run(fakeRequest(await cookieHeader(1_000, 'ff00'.repeat(16))))

    assert.equal(fetchCalls.length, 1)
    const parsed = JSON.parse(sentBody) as { query: string; variables: { refresh_token: string } }
    assert.match(parsed.query, /refreshToken\(refresh_token: \$refresh_token\)/)
    assert.equal(parsed.variables.refresh_token, 'ff00'.repeat(16))
  })

  it('refreshes again on a later request, once the first rotation has settled', async () => {
    // Proves the in-flight entry is torn down rather than memoised forever: a
    // Map that never deletes would serve request two the *stale* first result.
    stub((n) => rotation(n))
    const first = await run(fakeRequest(await cookieHeader(1_000)))
    const second = await run(fakeRequest(await cookieHeader(1_000, 'bb11'.repeat(16))))

    assert.equal(fetchCalls.length, 2)
    const a = await sessionFromRequest(first.req)
    const b = await sessionFromRequest(second.req)
    assert.equal(a?.accessToken, 'access-token-1')
    assert.equal(b?.accessToken, 'access-token-2')
    assert.equal(bpRefreshInFlightCount(), 0)
  })
})

// ── single-flight: the reason this middleware exists ─────────────────────

describe('single-flight guard', () => {
  it('collapses two concurrent requests onto exactly one upstream refresh', async () => {
    // The stub is deliberately slow so the two requests genuinely overlap; a
    // guard that only worked synchronously would pass with an instant stub.
    stub(async (n) => {
      await sleep(25)
      return rotation(n)
    })

    const cookie = await cookieHeader(1_000)
    const [a, b] = await Promise.all([run(fakeRequest(cookie)), run(fakeRequest(cookie))])

    assert.equal(fetchCalls.length, 1, 'the rotating refresh token must be spent exactly once')

    // Both requests must come out authenticated, on the *same* rotation.
    for (const r of [a, b]) {
      assert.equal(r.nextCalls, 1)
      assert.equal(setCookies(r.res).length, 1)
      const s = await sessionFromRequest(r.req)
      if (!s) throw new Error('both concurrent requests must end up with a session')
      assert.equal(s.accessToken, 'access-token-1')
      assert.equal(s.refreshToken, 'refresh-token-1')
    }
    assert.equal(bpRefreshInFlightCount(), 0)
  })

  it('collapses ten concurrent requests onto exactly one upstream refresh', async () => {
    stub(async (n) => {
      await sleep(25)
      return rotation(n)
    })

    const cookie = await cookieHeader(1_000)
    const runs = await Promise.all(Array.from({ length: 10 }, () => run(fakeRequest(cookie))))

    assert.equal(fetchCalls.length, 1)
    for (const r of runs) {
      assert.equal(r.nextCalls, 1)
      const s = await sessionFromRequest(r.req)
      assert.equal(s?.accessToken, 'access-token-1')
    }
    assert.equal(bpRefreshInFlightCount(), 0)
  })

  it('does not collapse two requests holding different refresh tokens', async () => {
    // The guard must key on the token, not on "a refresh is happening" —
    // otherwise two different users would share one another's session.
    stub(async (n) => {
      await sleep(25)
      return rotation(n)
    })

    const [a, b] = await Promise.all([
      run(fakeRequest(await cookieHeader(1_000, 'aaaa'.repeat(16)))),
      run(fakeRequest(await cookieHeader(1_000, 'bbbb'.repeat(16)))),
    ])

    assert.equal(fetchCalls.length, 2)
    const sa = await sessionFromRequest(a.req)
    const sb = await sessionFromRequest(b.req)
    assert.notEqual(sa?.accessToken, sb?.accessToken)
    assert.equal(bpRefreshInFlightCount(), 0)
  })

  it('shares a failure too — one revoked family, one upstream call, both logged out', async () => {
    stub(async () => {
      await sleep(25)
      return gqlError('refresh token reuse detected; family revoked')
    })

    const cookie = await cookieHeader(1_000)
    const runs = await Promise.all([run(fakeRequest(cookie)), run(fakeRequest(cookie))])

    assert.equal(fetchCalls.length, 1)
    for (const r of runs) {
      assert.equal(r.nextCalls, 1, 'a shared rejection must never surface as a throw')
      assert.deepEqual(setCookies(r.res), ['bp-session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure'])
      assert.equal(await sessionFromRequest(r.req), null)
    }
    assert.equal(bpRefreshInFlightCount(), 0)
  })
})

// ── failure is a logout, never an error ──────────────────────────────────

describe('failed refresh', () => {
  const cases: Array<{ name: string; respond: () => Response }> = [
    {
      name: 'a revoked refresh family',
      respond: () => gqlError('refresh token reuse detected; family revoked'),
    },
    { name: 'an unauthenticated refresh token', respond: () => gqlError('Authentication required') },
    { name: 'an unrecognised gateway error', respond: () => gqlError('internal error') },
    { name: 'HTTP 502 from a proxy', respond: () => json({}, 502) },
    { name: 'a non-JSON body', respond: () => new Response('<html>nope</html>', { status: 200 }) },
  ]

  for (const { name, respond } of cases) {
    it(`clears the cookie and continues unauthenticated on ${name}`, async () => {
      stub(respond)
      const r = await run(fakeRequest(await cookieHeader(1_000)))

      assert.equal(r.nextCalls, 1, 'the request must continue')
      assert.deepEqual(setCookies(r.res), [
        'bp-session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure',
      ])

      // Stripped from the request too: leaving it would let loaders read a
      // session whose access token is seconds from expiry and whose refresh
      // token is spent, turning one clean redirect into a page of 401s.
      assert.equal(await sessionFromRequest(r.req), null)
      const cookie = r.req.headers.cookie ?? ''
      assert.ok(!cookie.includes('bp-session'), 'bp-session must be gone from the request header')
      assert.ok(cookie.includes('theme=dark'), 'unrelated cookies must survive')
      assert.ok(cookie.includes('lti-claims=some.lti.jwt'), 'lti-claims must survive')
      assert.equal(bpRefreshInFlightCount(), 0)
    })
  }

  it('clears the cookie and continues unauthenticated on a transport failure', async () => {
    stub(() => {
      throw new Error('ECONNREFUSED')
    })
    const r = await run(fakeRequest(await cookieHeader(1_000)))

    assert.equal(r.nextCalls, 1)
    assert.deepEqual(setCookies(r.res), [
      'bp-session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure',
    ])
    assert.equal(await sessionFromRequest(r.req), null)
    assert.equal(bpRefreshInFlightCount(), 0)
  })

  it('clears the cookie when the gateway returns an unusable AuthPayload', async () => {
    // The gateway really does resolve AuthPayloads with holes in them
    // (`validateToken` returns an empty `token`), so a half-populated refresh
    // response must be a logout rather than a session with an empty token.
    stub(() =>
      json({ data: { refreshToken: { token: '', refresh_token: 'r', user_id: 'u', tenant: 't' } } }),
    )
    const r = await run(fakeRequest(await cookieHeader(1_000)))

    assert.equal(r.nextCalls, 1)
    assert.deepEqual(setCookies(r.res), [
      'bp-session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure',
    ])
    assert.equal(await sessionFromRequest(r.req), null)
  })

  it('never rejects, whatever the gateway does', async () => {
    // Belt and braces on the middleware's central promise: an unhandled
    // rejection here would 500 a page for a signed-in user.
    stub(() => {
      throw new Error('boom')
    })
    const req = fakeRequest(await cookieHeader(1_000))
    await assert.doesNotReject(() => bpRefreshMiddleware(req, fakeResponse(), () => {}))
  })
})
