/**
 * Unit tests for the `bp-session` cookie codec.
 *
 * `node:test` under `tsx` — **vitest is intentionally not installed in this
 * repo**. Modeled on `app/lib/bp-ai/client.test.ts` (env-then-dynamic-import)
 * and `app/lib/theme-cookie.server.test.ts` (cookie-string assertions).
 *
 * Run: npx tsx --test app/lib/bp-ai/session.test.ts
 *
 * The load-bearing suite here is **"cross-authentication"**. It proves in both
 * directions that the LTI session and the BP AI session cannot be swapped, and
 * each direction carries a *control* assertion showing the fixture really is a
 * valid token for its own system — without that control, the test would pass
 * just as happily against two pieces of garbage.
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

import { SignJWT } from 'jose'
import type { JWTPayload } from 'jose'

import type { BpSession } from './types.ts'

// Both secrets must be set before either module is imported: the LTI reader
// reads `process.env.LTI_KEY` at module evaluation
// (`app/lib/lti-session.server.ts:3`). Set unconditionally, never `??=` — the
// cross-authentication proof is only meaningful if we know both values and
// know they differ.
const BP_SECRET = 'bp-session-test-secret-0000000000000000000000000000'
const LTI_SECRET = 'lti-key-test-secret-1111111111111111111111111111'
process.env.BP_SESSION_SECRET = BP_SECRET
process.env.LTI_KEY = LTI_SECRET

type SessionModule = typeof import('./session.server.ts')
type LtiSessionModule = typeof import('../lti-session.server.ts')

let sealBpSession: SessionModule['sealBpSession']
let readBpSession: SessionModule['readBpSession']
let bpSessionCookie: SessionModule['bpSessionCookie']
let clearBpSessionCookie: SessionModule['clearBpSessionCookie']
let BP_SESSION_MAX_AGE_SECONDS: SessionModule['BP_SESSION_MAX_AGE_SECONDS']
let getLtiToken: LtiSessionModule['getLtiToken']

before(async () => {
  const mod = await import('./session.server.ts')
  sealBpSession = mod.sealBpSession
  readBpSession = mod.readBpSession
  bpSessionCookie = mod.bpSessionCookie
  clearBpSessionCookie = mod.clearBpSessionCookie
  BP_SESSION_MAX_AGE_SECONDS = mod.BP_SESSION_MAX_AGE_SECONDS
  getLtiToken = (await import('../lti-session.server.ts')).getLtiToken
})

// ── fixtures ─────────────────────────────────────────────────────────────

/**
 * A session shaped like a real one: a 64-char hex refresh token and UUID
 * user/tenant ids, as measured in the Phase 0 spike. `accessTokenExpiresAt` is
 * epoch **milliseconds**.
 */
function session(overrides: Partial<BpSession> = {}): BpSession {
  return {
    accessToken: 'header.payload.signature',
    refreshToken: 'a1b2c3d4'.repeat(8),
    userId: 'c0d5b335-0000-4000-8000-000000000001',
    tenant: 'ee97c4ea-0000-4000-8000-000000000002',
    accessTokenExpiresAt: 1_770_000_000_000,
    ...overrides,
  }
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

/** Sign an arbitrary payload with an arbitrary secret and lifetime. */
async function sign(
  payload: JWTPayload,
  secret: string,
  { expiresInSeconds }: { expiresInSeconds: number },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(key(secret))
}

/**
 * An `lti-claims` JWT exactly as `lti/session.ts:25-29` mints one: the Canvas
 * claims nested under `token`, HS256 over `LTI_KEY`, 1h.
 */
function ltiClaimsJwt(): Promise<string> {
  const claims = {
    userId: 'canvas-user-42',
    roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
    platformContext: { context: { id: 'course-1' } },
  }
  return sign({ token: claims }, LTI_SECRET, { expiresInSeconds: 3600 })
}

function requestWithCookie(cookie?: string): Request {
  const headers = new Headers()
  if (cookie !== undefined) headers.set('cookie', cookie)
  return new Request('https://example.test/student', { headers })
}

/**
 * Turn a `Set-Cookie` header value into the `Cookie` header a browser would
 * send back on the next request: keep the first `name=value` pair, drop the
 * attributes.
 */
function asCookieHeader(setCookie: string): string {
  return setCookie.split(';')[0]
}

/** Flip one character of the JWT's signature segment. */
function tamperSignature(jwt: string): string {
  const [head, body, sig] = jwt.split('.')
  const flipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)
  return `${head}.${body}.${flipped}`
}

/** Re-encode the payload segment with a different `user_id`, keeping the old signature. */
function tamperPayload(jwt: string): string {
  const [head, body, sig] = jwt.split('.')
  const decoded: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  const payload = { ...(decoded as Record<string, unknown>), user_id: 'attacker' }
  const reencoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${head}.${reencoded}.${sig}`
}

// ── round trip ───────────────────────────────────────────────────────────

describe('sealBpSession / readBpSession', () => {
  it('round-trips all five fields', async () => {
    const original = session()
    const sealed = await sealBpSession(original)
    const read = await readBpSession(requestWithCookie(`bp-session=${sealed}`))

    assert.deepEqual(read, original)
  })

  it('preserves accessTokenExpiresAt as epoch milliseconds, not seconds', async () => {
    // Guards the one field with a unit ambiguity: the sealed claim is ms, while
    // the JWT's own `exp` (which governs the cookie, not the access token) is
    // seconds. Truncating to seconds here would silently make every access
    // token look ~54 years stale to Phase 4's refresh check.
    const sealed = await sealBpSession(session({ accessTokenExpiresAt: 1_770_000_000_123 }))
    const read = await readBpSession(requestWithCookie(`bp-session=${sealed}`))

    assert.equal(read?.accessTokenExpiresAt, 1_770_000_000_123)
  })

  it('finds the cookie among others', async () => {
    const sealed = await sealBpSession(session())
    const read = await readBpSession(
      requestWithCookie(`theme=%7B%7D; bp-session=${sealed}; other=x`),
    )

    assert.equal(read?.userId, session().userId)
  })

  it('seals a value that does not need cookie escaping', async () => {
    // A compact JWS is base64url + dots. If that ever stopped being true the
    // cookie would need encoding, and `readCookie`'s `decodeURIComponent`
    // would be doing real work instead of being a no-op.
    const sealed = await sealBpSession(session())
    assert.match(sealed, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    assert.equal(encodeURIComponent(sealed), sealed)
  })
})

// ── rejection ────────────────────────────────────────────────────────────

describe('readBpSession — rejects and never throws', () => {
  it('returns null when there is no cookie header at all', async () => {
    assert.equal(await readBpSession(requestWithCookie()), null)
  })

  it('returns null when the cookie header carries no bp-session', async () => {
    assert.equal(await readBpSession(requestWithCookie('theme=%7B%7D; lti-claims=x')), null)
  })

  it('returns null for a tampered signature', async () => {
    const sealed = await sealBpSession(session())
    const forged = tamperSignature(sealed)
    assert.notEqual(forged, sealed)

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${forged}`)), null)
  })

  it('returns null for a tampered payload', async () => {
    const sealed = await sealBpSession(session())
    const forged = tamperPayload(sealed)

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${forged}`)), null)
  })

  it('returns null for an expired seal', async () => {
    const expired = await sign(
      {
        access_token: 'header.payload.signature',
        refresh_token: 'a1b2c3d4'.repeat(8),
        user_id: 'c0d5b335-0000-4000-8000-000000000001',
        tenant: 'ee97c4ea-0000-4000-8000-000000000002',
        access_expires_at: 1_770_000_000_000,
      },
      BP_SECRET,
      { expiresInSeconds: -60 },
    )

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${expired}`)), null)
  })

  it('returns null for a valid signature over an incomplete payload', async () => {
    // Our own secret, our own claim names, but a field short. Must read as "no
    // session" rather than a half-built one.
    const partial = await sign(
      { access_token: 'a', refresh_token: 'b', user_id: 'c', tenant: 'd' },
      BP_SECRET,
      { expiresInSeconds: 3600 },
    )

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${partial}`)), null)
  })

  it('returns null when access_expires_at is not a number', async () => {
    const wrongType = await sign(
      {
        access_token: 'a',
        refresh_token: 'b',
        user_id: 'c',
        tenant: 'd',
        access_expires_at: '1770000000000',
      },
      BP_SECRET,
      { expiresInSeconds: 3600 },
    )

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${wrongType}`)), null)
  })

  it('returns null for a value that is not a JWT at all', async () => {
    assert.equal(await readBpSession(requestWithCookie('bp-session=not-a-jwt')), null)
    assert.equal(await readBpSession(requestWithCookie('bp-session=')), null)
  })

  it('returns null for a session signed with an unrelated secret', async () => {
    const foreign = await sign(
      {
        access_token: 'a',
        refresh_token: 'b',
        user_id: 'c',
        tenant: 'd',
        access_expires_at: 1,
      },
      'some-other-service-secret-2222222222222222222222',
      { expiresInSeconds: 3600 },
    )

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${foreign}`)), null)
  })
})

// ── cross-authentication (Automated QA) ──────────────────────────────────

describe('cross-authentication is impossible in both directions', () => {
  it('a bp-session value is rejected by getLtiToken (cookie and URL transport)', async () => {
    const sealed = await sealBpSession(session())

    // Control: it really is a valid bp-session.
    assert.ok(await readBpSession(requestWithCookie(`bp-session=${sealed}`)))

    // Presented on the LTI cookie…
    assert.equal(await getLtiToken(requestWithCookie(`lti-claims=${sealed}`)), null)
    // …and on the LTI URL transport, which wins over the cookie.
    assert.equal(
      await getLtiToken(new Request(`https://example.test/app?lti_session=${sealed}`)),
      null,
    )
  })

  it('an lti-claims value is rejected by readBpSession', async () => {
    const lti = await ltiClaimsJwt()

    // Control: it really is a valid LTI session token.
    const claims = await getLtiToken(requestWithCookie(`lti-claims=${lti}`))
    assert.ok(claims, 'fixture must be a genuine lti-claims JWT for this test to mean anything')

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${lti}`)), null)
  })

  it('an lti-claims payload re-signed with BP_SESSION_SECRET is still rejected', async () => {
    // The shape check is the second line of defence: even granted a perfect
    // signature, LTI claims cannot become a BpSession. This is also why the
    // sealed access token is named `access_token` and not `token` — a `token`
    // claim is exactly what `getLtiToken` returns.
    const resigned = await sign({ token: { userId: 'canvas-user-42' } }, BP_SECRET, {
      expiresInSeconds: 3600,
    })

    assert.equal(await readBpSession(requestWithCookie(`bp-session=${resigned}`)), null)
  })
})

// ── the Set-Cookie string ────────────────────────────────────────────────

describe('bpSessionCookie / clearBpSessionCookie', () => {
  it('emits the exact attribute string, HttpOnly and SameSite=Lax included', () => {
    assert.equal(BP_SESSION_MAX_AGE_SECONDS, 2_592_000)
    assert.equal(
      bpSessionCookie('SEALED'),
      'bp-session=SEALED; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax; Secure',
    )

    // Asserted individually too, so a failure names the attribute that moved.
    const out = bpSessionCookie('SEALED')
    assert.match(out, /(?:^|;\s*)HttpOnly(?:;|$)/)
    assert.match(out, /(?:^|;\s*)Secure(?:;|$)/)
    assert.match(out, /(?:^|;\s*)SameSite=Lax(?:;|$)/)
    assert.match(out, /(?:^|;\s*)Path=\/(?:;|$)/)
    // Deliberately NOT the LTI cookie's SameSite=None (D1: top-level pages).
    assert.doesNotMatch(out, /SameSite=None/)
  })

  it('honours an explicit maxAge', () => {
    assert.equal(
      bpSessionCookie('SEALED', 60),
      'bp-session=SEALED; Max-Age=60; Path=/; HttpOnly; SameSite=Lax; Secure',
    )
  })

  it('clears with Max-Age=0 and otherwise identical attributes', () => {
    assert.equal(
      clearBpSessionCookie(),
      'bp-session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure',
    )

    // Attributes must match the setter or the browser keeps the old cookie
    // instead of overwriting it.
    const attrs = (s: string) => s.split('; ').slice(2).join('; ')
    assert.equal(attrs(clearBpSessionCookie()), attrs(bpSessionCookie('SEALED')))
  })

  it('a sealed session survives serialise → Set-Cookie → re-parse → verify', async () => {
    const original = session()
    const setCookie = bpSessionCookie(await sealBpSession(original))
    const request = requestWithCookie(asCookieHeader(setCookie))

    assert.deepEqual(await readBpSession(request), original)
  })

  it('a cleared cookie read back yields no session', async () => {
    const request = requestWithCookie(asCookieHeader(clearBpSessionCookie()))

    assert.equal(await readBpSession(request), null)
  })
})

// ── secret misconfiguration ──────────────────────────────────────────────

describe('BP_SESSION_SECRET misconfiguration', () => {
  /** Run `fn` with the env var temporarily set, then restore. */
  async function withSecret(value: string | undefined, fn: () => Promise<void>): Promise<void> {
    const previous = process.env.BP_SESSION_SECRET
    if (value === undefined) delete process.env.BP_SESSION_SECRET
    else process.env.BP_SESSION_SECRET = value
    try {
      await fn()
    } finally {
      process.env.BP_SESSION_SECRET = previous
    }
  }

  it('sealBpSession throws when the secret is absent, readBpSession returns null', async () => {
    const sealed = await sealBpSession(session())

    await withSecret(undefined, async () => {
      await assert.rejects(() => sealBpSession(session()), /Missing env BP_SESSION_SECRET/)
      // The read path stays forgiving: logged out, not a 500.
      assert.equal(await readBpSession(requestWithCookie(`bp-session=${sealed}`)), null)
    })
  })

  it('sealBpSession throws when the secret equals LTI_KEY', async () => {
    // A shared secret is the one configuration in which the two session systems
    // could cross-authenticate, so it is refused rather than trusted to the
    // shape check alone.
    await withSecret(LTI_SECRET, async () => {
      await assert.rejects(() => sealBpSession(session()), /must not equal LTI_KEY/)
    })
  })

  it('recovers once the secret is restored', async () => {
    const sealed = await sealBpSession(session())
    assert.ok(await readBpSession(requestWithCookie(`bp-session=${sealed}`)))
  })
})
