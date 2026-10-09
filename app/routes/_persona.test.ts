/**
 * Regression test for the `_persona` loader's role resolution.
 *
 * Verifies that the loader computes `role` via `classifyRole(...)` against the
 * LTI token's `platformContext.roles` and `platformContext.custom`, instead of
 * the previously-hardcoded `'teacher'` literal. The loader doesn't return the
 * role directly — it returns `{ token, themeMode }` — so we assert via
 * `themeMode`, which goes through `defaultModeFor(role)` when no `theme`
 * cookie is present. Per-role defaults differ enough that they uniquely
 * identify each role:
 *
 *   teacher   → 'light'
 *   counselor → 'dark'
 *   student   → 'light'  (matches teacher, so we cross-check with custom field)
 *   parent    → 'light'
 *   admin     → 'light'
 *
 * For roles whose default is `'light'` we also verify by setting an explicit
 * stored value in the `theme` cookie for that role and confirming the loader
 * picks the stored value (proving the role argument to `readThemeMode` was
 * the expected one).
 *
 * ---
 *
 * Phase 7 widened the gate to accept a credential session as well as an LTI
 * launch (`getAppSession`). The role-resolution suite below is **unchanged from
 * before that phase** and is the primary regression evidence for it: an LTI
 * launch must resolve, classify and theme exactly as it always did. Two new
 * suites cover what changed — the credential path, and the session-less fork
 * between the Canvas-iframe 401 and the new `/login` redirect.
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'

import { ROLE_URIS } from '~/lib/roles'

// The loader pulls `LTI_KEY` at import time via `lti-session.server.ts`, so we
// MUST set it before importing the route module.
// `_persona.tsx` resolves the profile name, which pulls in the BP AI client —
// and `config.server.ts` throws at module evaluation without a URL. Set to a
// host nothing can reach: these tests must never touch the real gateway.
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'
process.env.LTI_KEY = process.env.LTI_KEY ?? 'test-key-for-_persona-loader-tests'
// The credential half of the gate signs/verifies with its own secret. Read
// lazily by `bpSecret()`, so it only has to be in place before the first call —
// but it must DIFFER from `LTI_KEY` or `bpSecret()` refuses to run, which is
// the guard that keeps the two session systems from cross-authenticating.
process.env.BP_SESSION_SECRET =
  process.env.BP_SESSION_SECRET ?? 'bp-secret-for-_persona-loader-tests'

// Dynamic import so the secret is in place before module evaluation.
type PersonaModule = typeof import('./_persona.tsx')
let loader: PersonaModule['loader']
let shouldRevalidate: PersonaModule['shouldRevalidate']

before(async () => {
  const mod = (await import('./_persona.tsx')) as PersonaModule
  loader = mod.loader
  shouldRevalidate = mod.shouldRevalidate
})

async function signLtiSession(payload: {
  roles?: string[]
  customFields?: Record<string, string>
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.LTI_KEY ?? '')
  const token = {
    platformContext: {
      roles: payload.roles ?? [],
      custom: payload.customFields ?? {},
    },
  }
  return new SignJWT({ token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}

async function callLoader(opts: {
  roles?: string[]
  customFields?: Record<string, string>
  themeCookie?: string
}) {
  const jwt = await signLtiSession({
    roles: opts.roles,
    customFields: opts.customFields,
  })
  const headers = new Headers()
  if (opts.themeCookie !== undefined) {
    headers.set('cookie', `theme=${encodeURIComponent(opts.themeCookie)}`)
  }
  const request = new Request(
    `https://example.test/teacher?lti_session=${encodeURIComponent(jwt)}`,
    { headers },
  )
  // The real `Route.LoaderArgs` has extra fields we don't use; cast through
  // `unknown` to satisfy the loader signature in tests.
  return loader({ request, params: {}, context: {} as never } as never)
}

/**
 * A `bp-session`-shaped JWT, signed the way `sealBpSession` signs one.
 *
 * Built with `SignJWT` here rather than by importing `sealBpSession`, matching
 * how `signLtiSession` above hand-rolls the LTI cookie: the point of these
 * tests is the *loader's* behaviour given a well-formed cookie, and inlining the
 * shape keeps the fixture readable next to the LTI one. Claim names must match
 * `BpSessionClaims` in `app/lib/bp-ai/session.server.ts`.
 */
async function signBpSessionCookie(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.BP_SESSION_SECRET ?? '')
  return new SignJWT({
    access_token: 'persona-test-access-token',
    refresh_token: 'persona-test-refresh-token',
    user_id: 'persona-test-user',
    tenant: 'persona-test-tenant',
    access_expires_at: Date.now() + 900_000,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

async function callLoaderWithBpSession(opts: { themeCookie?: string } = {}) {
  const jwt = await signBpSessionCookie()
  const jar = [`bp-session=${encodeURIComponent(jwt)}`]
  if (opts.themeCookie !== undefined) {
    jar.push(`theme=${encodeURIComponent(opts.themeCookie)}`)
  }
  const headers = new Headers()
  headers.set('cookie', jar.join('; '))
  const request = new Request('https://example.test/student', { headers })
  return loader({ request, params: {}, context: {} as never } as never)
}

describe('_persona loader — role resolution', () => {
  it('classifies an Instructor LTI role as teacher (themeMode default → light)', async () => {
    const result = await callLoader({ roles: [ROLE_URIS.instructor] })
    assert.equal(result.themeMode, 'light')
  })

  it('classifies custom_fields.lti_role = "counselor" as counselor (themeMode default → dark)', async () => {
    const result = await callLoader({
      roles: [ROLE_URIS.instructor], // present, but the custom field overrides
      customFields: { lti_role: 'counselor' },
    })
    assert.equal(result.themeMode, 'dark')
  })

  it('classifies a Learner LTI role as student and reads the student slot from the theme cookie', async () => {
    // Default for student is 'light'; set the cookie to 'dark' to prove the
    // loader passes role='student' (not 'teacher') to readThemeMode.
    const result = await callLoader({
      roles: [ROLE_URIS.learner],
      themeCookie: JSON.stringify({ student: 'dark', teacher: 'light' }),
    })
    assert.equal(result.themeMode, 'dark')
  })

  it('returns role-specific default themeMode for an unknown role (default → dark)', async () => {
    const result = await callLoader({
      roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Designer'],
    })
    assert.equal(result.themeMode, 'dark')
  })

  it('reports the session kind as "lti" and carries the token through', async () => {
    const result = await callLoader({ roles: [ROLE_URIS.instructor] })
    assert.equal(result.sessionKind, 'lti')
    assert.deepEqual(result.token.platformContext.roles, [ROLE_URIS.instructor])
  })
})

// ── Phase 7: the credential path ────────────────────────────────────────────

describe('_persona loader — credential session', () => {
  it('accepts a bp-session cookie and resolves the student persona', async () => {
    const result = await callLoaderWithBpSession()
    assert.equal(result.sessionKind, 'bp')
    // Every credential user is a student (D5); the student theme default is
    // 'light', same as teacher — the cookie cross-check below is what proves
    // the role argument was 'student'.
    assert.equal(result.themeMode, 'light')
  })

  it('passes role="student" to readThemeMode (proved via the theme cookie)', async () => {
    const result = await callLoaderWithBpSession({
      themeCookie: JSON.stringify({ student: 'dark', teacher: 'light' }),
    })
    assert.equal(result.themeMode, 'dark')
  })

  it('hands out a null LTI token — there are no Canvas claims to give', async () => {
    const result = await callLoaderWithBpSession()
    assert.equal(result.token, null)
  })

  it('prefers the LTI session when both are present (D2 regression)', async () => {
    // A developer who logged in and then launched from Canvas in the same
    // browser: the launch must win, or a `bp-session` cookie could quietly
    // change what a Canvas launch resolves to.
    const ltiJwt = await signLtiSession({ roles: [ROLE_URIS.instructor] })
    const bpJwt = await signBpSessionCookie()
    const headers = new Headers()
    headers.set('cookie', `bp-session=${encodeURIComponent(bpJwt)}`)
    const request = new Request(
      `https://example.test/teacher?lti_session=${encodeURIComponent(ltiJwt)}`,
      { headers },
    )
    const result = await loader({ request, params: {}, context: {} as never } as never)
    assert.equal(result.sessionKind, 'lti')
  })
})

// ── Phase 7: the session-less fork ──────────────────────────────────────────

describe('_persona loader — no session', () => {
  it('redirects a plain browser request to /login', async () => {
    const request = new Request('https://example.test/student/journal', {
      headers: { 'sec-fetch-dest': 'document' },
    })
    try {
      await loader({ request, params: {}, context: {} as never } as never)
      throw new Error('loader should have thrown a redirect')
    } catch (thrown) {
      if (!(thrown instanceof Response)) throw new Error('expected loader to throw a Response')
      assert.equal(thrown.status, 302)
      assert.equal(thrown.headers.get('location'), '/login')
    }
  })

  it('redirects a bare request (no Sec-Fetch headers) to /login', async () => {
    // The pre-Phase-7 shape of this test asserted a 401 here. A request with no
    // LTI transport and no embedding signal is a normal browser, and normal
    // browsers now get the login page.
    const request = new Request('https://example.test/teacher')
    try {
      await loader({ request, params: {}, context: {} as never } as never)
      throw new Error('loader should have thrown a redirect')
    } catch (thrown) {
      if (!(thrown instanceof Response)) throw new Error('expected loader to throw a Response')
      assert.equal(thrown.status, 302)
      assert.equal(thrown.headers.get('location'), '/login')
    }
  })

  it('still returns the 401 inside the Canvas iframe (Sec-Fetch-Dest: iframe)', async () => {
    // The behaviour Canvas sees must be unchanged (D2): `/login` cannot work in
    // a cross-site iframe (SameSite=Lax), so the blunt 401 is the honest answer.
    const request = new Request('https://example.test/student', {
      headers: { 'sec-fetch-dest': 'iframe' },
    })
    try {
      await loader({ request, params: {}, context: {} as never } as never)
      throw new Error('loader should have thrown a 401 Response')
    } catch (thrown) {
      if (!(thrown instanceof Response)) throw new Error('expected loader to throw a Response')
      assert.equal(thrown.status, 401)
      assert.equal(await thrown.text(), 'No active LTI session')
      assert.equal(
        thrown.headers.get('Content-Security-Policy'),
        'frame-ancestors https://*.instructure.com',
      )
    }
  })

  it('still returns the 401 for an expired ?lti_session= token', async () => {
    const request = new Request('https://example.test/student?lti_session=expired-or-malformed')
    try {
      await loader({ request, params: {}, context: {} as never } as never)
      throw new Error('loader should have thrown a 401 Response')
    } catch (thrown) {
      if (!(thrown instanceof Response)) throw new Error('expected loader to throw a Response')
      assert.equal(thrown.status, 401)
    }
  })

  it('still returns the 401 when a stale lti-claims cookie is present', async () => {
    const headers = new Headers()
    headers.set('cookie', 'lti-claims=no-longer-valid')
    const request = new Request('https://example.test/student', { headers })
    try {
      await loader({ request, params: {}, context: {} as never } as never)
      throw new Error('loader should have thrown a 401 Response')
    } catch (thrown) {
      if (!(thrown instanceof Response)) throw new Error('expected loader to throw a Response')
      assert.equal(thrown.status, 401)
    }
  })
})

describe('_persona shouldRevalidate — Safari iframe gate skip', () => {
  // The real `ShouldRevalidateFunctionArgs` has many fields (currentUrl,
  // nextUrl, params, etc.) we don't exercise; cast through `unknown`/`as never`
  // for the unused fields, mirroring the `callLoader` casting convention above.
  function callShouldRevalidate(args: {
    formMethod?: string
    defaultShouldRevalidate: boolean
  }): boolean {
    return shouldRevalidate({
      formMethod: args.formMethod,
      defaultShouldRevalidate: args.defaultShouldRevalidate,
    } as never)
  }

  it('skips revalidation on a plain GET navigation (no formMethod)', () => {
    // A bare navigate() within the persona subtree must NOT re-run the gate —
    // this is the fix: no `.data` request → no Safari 401 mid-onboarding.
    const result = callShouldRevalidate({
      formMethod: undefined,
      defaultShouldRevalidate: true,
    })
    assert.equal(result, false)
  })

  it('defers to the default (revalidates) on a POST submission', () => {
    // The /api/theme fetcher POST must still revalidate so `themeMode` updates
    // live; we defer to defaultShouldRevalidate rather than forcing false.
    const result = callShouldRevalidate({
      formMethod: 'POST',
      defaultShouldRevalidate: true,
    })
    assert.equal(result, true)
  })

  it('defers to the default (false) on a POST submission when default is false', () => {
    // Proves we defer to the default rather than forcing revalidation on
    // submissions.
    const result = callShouldRevalidate({
      formMethod: 'POST',
      defaultShouldRevalidate: false,
    })
    assert.equal(result, false)
  })
})
