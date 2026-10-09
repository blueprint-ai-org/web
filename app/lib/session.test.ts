/**
 * Tests for the unified gate helper (`session.server.ts`).
 *
 * Three things are worth locking down here, and only one of them is obvious:
 *
 *  1. **Precedence.** LTI wins when both cookies are present. This is the
 *     property that keeps decision D2 true in the one situation where the two
 *     session systems physically coexist — a developer who logged in with
 *     credentials and then launched from Canvas in the same browser. If this
 *     ever flips, a Canvas launch starts resolving to a credential session and
 *     nothing else in the suite would notice.
 *  2. **Role resolution per kind.** LTI keeps going through `classifyRole`
 *     untouched; credential sessions are flatly `'student'` (D5).
 *  3. **`isEmbeddedLtiRequest`.** The predicate that decides whether a
 *     session-less request gets the old 401 or the new `/login` redirect. Its
 *     false negatives send an LTI user to a login page that cannot work; its
 *     false positives 401 a real credential user. Both directions are asserted.
 *
 * `assert.ok` does not narrow in this repo's TS config, so every narrowing step
 * is a plain `if (…) throw new Error(…)`.
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'

import { ROLE_URIS } from './roles'

// Both modules read their secret from the environment — `lti-session.server.ts`
// at *import time* (module-scope `TextEncoder().encode(...)`), so these MUST be
// set before the dynamic import below. The two values must also differ:
// `bpSecret()` refuses to run when `BP_SESSION_SECRET === LTI_KEY`, which is
// the guard that stops the two systems from ever cross-authenticating.
process.env.LTI_KEY = 'lti-key-for-session-server-tests'
process.env.BP_SESSION_SECRET = 'bp-secret-for-session-server-tests'

type SessionModule = typeof import('./session.server')
let getAppSession: SessionModule['getAppSession']
let getRoleFor: SessionModule['getRoleFor']
let isEmbeddedLtiRequest: SessionModule['isEmbeddedLtiRequest']

before(async () => {
  const mod = (await import('./session.server')) as SessionModule
  getAppSession = mod.getAppSession
  getRoleFor = mod.getRoleFor
  isEmbeddedLtiRequest = mod.isEmbeddedLtiRequest
})

// ── Fixtures ────────────────────────────────────────────────────────────────

/** An `lti-claims`-shaped JWT: Canvas claims nested under a `token` claim. */
async function signLtiClaims(
  opts: { roles?: string[]; customFields?: Record<string, string> } = {},
): Promise<string> {
  const secret = new TextEncoder().encode(process.env.LTI_KEY ?? '')
  const token = {
    platformContext: {
      roles: opts.roles ?? [ROLE_URIS.learner],
      custom: opts.customFields ?? {},
    },
  }
  return new SignJWT({ token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}

/**
 * A `bp-session`-shaped JWT. Built here with `SignJWT` rather than through
 * `sealBpSession` so this file tests the *reader path* end to end (cookie →
 * verify → shape check) instead of trusting the writer it would otherwise be
 * paired with. Claim names must match `BpSessionClaims`.
 */
async function signBpSession(
  overrides: Partial<{
    access_token: string
    refresh_token: string
    user_id: string
    tenant: string
    access_expires_at: number
  }> = {},
): Promise<string> {
  const secret = new TextEncoder().encode(process.env.BP_SESSION_SECRET ?? '')
  return new SignJWT({
    access_token: 'access-token-abc',
    refresh_token: 'refresh-token-def',
    user_id: 'user-123',
    tenant: 'tenant-xyz',
    access_expires_at: Date.now() + 900_000,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

function requestWith(opts: {
  url?: string
  cookies?: Record<string, string>
  headers?: Record<string, string>
}): Request {
  const headers = new Headers(opts.headers ?? {})
  if (opts.cookies) {
    const jar = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ')
    headers.set('cookie', jar)
  }
  return new Request(opts.url ?? 'https://example.test/student', { headers })
}

// ── getAppSession ───────────────────────────────────────────────────────────

describe('getAppSession — session resolution', () => {
  it('resolves an LTI session from the ?lti_session= URL token', async () => {
    const jwt = await signLtiClaims()
    const session = await getAppSession(
      requestWith({ url: `https://example.test/student?lti_session=${encodeURIComponent(jwt)}` }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'lti')
    if (session.kind !== 'lti') throw new Error('expected an LTI session')
    assert.deepEqual(session.token.platformContext.roles, [ROLE_URIS.learner])
  })

  it('resolves an LTI session from the lti-claims cookie', async () => {
    const jwt = await signLtiClaims({ roles: [ROLE_URIS.instructor] })
    const session = await getAppSession(requestWith({ cookies: { 'lti-claims': jwt } }))
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'lti')
  })

  it('resolves a credential session from the bp-session cookie', async () => {
    const sealed = await signBpSession()
    const session = await getAppSession(requestWith({ cookies: { 'bp-session': sealed } }))
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'bp')
    if (session.kind !== 'bp') throw new Error('expected a credential session')
    assert.equal(session.session.userId, 'user-123')
    assert.equal(session.session.tenant, 'tenant-xyz')
    assert.equal(session.session.accessToken, 'access-token-abc')
    assert.equal(session.session.refreshToken, 'refresh-token-def')
  })

  it('returns null when neither cookie is present', async () => {
    assert.equal(await getAppSession(requestWith({})), null)
  })

  it('prefers the LTI session when BOTH sessions are present (D2)', async () => {
    // The regression that matters: a `bp-session` cookie must never be able to
    // change what a Canvas launch resolves to.
    const lti = await signLtiClaims({ roles: [ROLE_URIS.instructor] })
    const bp = await signBpSession()
    const session = await getAppSession(
      requestWith({ cookies: { 'lti-claims': lti, 'bp-session': bp } }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'lti')
  })

  it('prefers the LTI URL token over a bp-session cookie', async () => {
    const lti = await signLtiClaims()
    const bp = await signBpSession()
    const session = await getAppSession(
      requestWith({
        url: `https://example.test/student?lti_session=${encodeURIComponent(lti)}`,
        cookies: { 'bp-session': bp },
      }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'lti')
  })

  it('falls back to the credential session when the LTI token is garbage', async () => {
    // An expired or malformed `lti-claims` must not shadow a working
    // credential session — `getLtiToken` returns null for it, so the fallback
    // is what runs.
    const bp = await signBpSession()
    const session = await getAppSession(
      requestWith({ cookies: { 'lti-claims': 'not-a-jwt', 'bp-session': bp } }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'bp')
  })

  it('returns null for a bp-session signed with the wrong secret', async () => {
    const secret = new TextEncoder().encode('some-other-secret-entirely')
    const forged = await new SignJWT({
      access_token: 'a',
      refresh_token: 'b',
      user_id: 'c',
      tenant: 'd',
      access_expires_at: Date.now(),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret)
    assert.equal(await getAppSession(requestWith({ cookies: { 'bp-session': forged } })), null)
  })

  it('returns null for a correctly-signed bp-session of the wrong shape', async () => {
    const sealed = await signBpSession({ refresh_token: '' })
    assert.equal(await getAppSession(requestWith({ cookies: { 'bp-session': sealed } })), null)
  })

  it('resolves a credential session whose access token has already expired', async () => {
    // "Needs a refresh" is not "logged out": the cookie tracks the 30-day
    // refresh token, and Phase 4's middleware has already run by this point.
    const sealed = await signBpSession({ access_expires_at: Date.now() - 60_000 })
    const session = await getAppSession(requestWith({ cookies: { 'bp-session': sealed } }))
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'bp')
  })

  it('never throws — a malformed cookie header reads as no session', async () => {
    const headers = new Headers()
    headers.set('cookie', '=;;;bp-session;lti-claims=')
    const request = new Request('https://example.test/student', { headers })
    assert.equal(await getAppSession(request), null)
  })
})

// ── getRoleFor ──────────────────────────────────────────────────────────────

describe('getRoleFor — role resolution per session kind', () => {
  it('classifies an LTI Instructor as teacher', async () => {
    const session = await getAppSession(
      requestWith({ cookies: { 'lti-claims': await signLtiClaims({ roles: [ROLE_URIS.instructor] }) } }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(getRoleFor(session), 'teacher')
  })

  it('classifies an LTI Learner as student', async () => {
    const session = await getAppSession(
      requestWith({ cookies: { 'lti-claims': await signLtiClaims({ roles: [ROLE_URIS.learner] }) } }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(getRoleFor(session), 'student')
  })

  it('honours the LTI custom_fields.lti_role override', async () => {
    const session = await getAppSession(
      requestWith({
        cookies: {
          'lti-claims': await signLtiClaims({
            roles: [ROLE_URIS.instructor],
            customFields: { lti_role: 'counselor' },
          }),
        },
      }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(getRoleFor(session), 'counselor')
  })

  it('returns unknown for an unrecognised LTI role', async () => {
    const session = await getAppSession(
      requestWith({
        cookies: {
          'lti-claims': await signLtiClaims({
            roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Designer'],
          }),
        },
      }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(getRoleFor(session), 'unknown')
  })

  it('tolerates an LTI token with no platformContext at all', async () => {
    // `classifyRole` is fed `?? []` / `?? {}` defaults; a launch missing the
    // claim must degrade to 'unknown', not throw.
    const secret = new TextEncoder().encode(process.env.LTI_KEY ?? '')
    const jwt = await new SignJWT({ token: {} })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret)
    const session = await getAppSession(requestWith({ cookies: { 'lti-claims': jwt } }))
    if (!session) throw new Error('expected a session')
    assert.equal(getRoleFor(session), 'unknown')
  })

  it('classifies every credential session as student (D5)', async () => {
    const session = await getAppSession(
      requestWith({ cookies: { 'bp-session': await signBpSession() } }),
    )
    if (!session) throw new Error('expected a session')
    assert.equal(session.kind, 'bp')
    assert.equal(getRoleFor(session), 'student')
  })
})

// ── isEmbeddedLtiRequest ────────────────────────────────────────────────────

describe('isEmbeddedLtiRequest — 401 vs /login', () => {
  it('is true for a request carrying an ?lti_session= param, however stale', () => {
    // The param is present precisely when the JWT inside it failed to verify —
    // that is the case that reaches the gate with no session.
    assert.equal(
      isEmbeddedLtiRequest(requestWith({ url: 'https://example.test/student?lti_session=expired' })),
      true,
    )
  })

  it('is true when an lti-claims cookie is present but unverifiable', () => {
    assert.equal(
      isEmbeddedLtiRequest(requestWith({ cookies: { 'lti-claims': 'no-longer-valid' } })),
      true,
    )
  })

  it('is true for Sec-Fetch-Dest: iframe (the Safari ITP reload)', () => {
    assert.equal(
      isEmbeddedLtiRequest(requestWith({ headers: { 'sec-fetch-dest': 'iframe' } })),
      true,
    )
  })

  it('is true for Sec-Fetch-Dest: frame', () => {
    assert.equal(
      isEmbeddedLtiRequest(requestWith({ headers: { 'sec-fetch-dest': 'frame' } })),
      true,
    )
  })

  it('is true for a Referer on a Canvas host', () => {
    assert.equal(
      isEmbeddedLtiRequest(
        requestWith({ headers: { referer: 'https://blueprint.instructure.com/courses/1' } }),
      ),
      true,
    )
  })

  it('is true for the bare instructure.com apex as Referer', () => {
    assert.equal(
      isEmbeddedLtiRequest(requestWith({ headers: { referer: 'https://instructure.com/' } })),
      true,
    )
  })

  it('is FALSE for a plain top-level document request', () => {
    // The whole point of the change: this request gets `/login`, not a 401.
    assert.equal(
      isEmbeddedLtiRequest(
        requestWith({
          headers: { 'sec-fetch-dest': 'document', 'sec-fetch-site': 'none' },
        }),
      ),
      false,
    )
  })

  it('is FALSE for a bp-session cookie on its own', () => {
    assert.equal(
      isEmbeddedLtiRequest(requestWith({ cookies: { 'bp-session': 'whatever' } })),
      false,
    )
  })

  it('is FALSE for a same-origin in-app navigation', () => {
    assert.equal(
      isEmbeddedLtiRequest(
        requestWith({
          headers: { referer: 'https://example.test/student', 'sec-fetch-site': 'same-origin' },
        }),
      ),
      false,
    )
  })

  it('is FALSE for a lookalike host that merely contains the Canvas domain', () => {
    // `endsWith('.instructure.com')` and not `includes` — `instructure.com.evil.tld`
    // must not be treated as Canvas.
    assert.equal(
      isEmbeddedLtiRequest(
        requestWith({ headers: { referer: 'https://instructure.com.evil.tld/x' } }),
      ),
      false,
    )
  })

  it('is FALSE for a malformed Referer rather than throwing', () => {
    assert.equal(isEmbeddedLtiRequest(requestWith({ headers: { referer: 'not a url' } })), false)
  })

  it('does not mistake a cookie whose NAME merely ends in lti-claims', () => {
    assert.equal(
      isEmbeddedLtiRequest(requestWith({ cookies: { 'xlti-claims': 'v' } })),
      false,
    )
  })
})
