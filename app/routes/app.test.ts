/**
 * `/app` — the launch dispatcher, after step-7 moved role classification out.
 *
 * ## What these tests stopped testing, and why that is the point
 *
 * They used to sign a launch with `ROLE_URIS.institutionAdmin` and assert the
 * redirect, or set `customFields.lti_role = 'admin'` and assert that it did
 * NOT grant the privileged persona. Both were really tests of `app/lib/roles.ts`
 * — a classifier this app kept alongside the one in lms-connector, which had
 * already drifted from it. The classifier is gone; the rules now live in
 * `lms-connector/internal/ltiauth/domain/canonical_role_test.go`, with
 * `custom.lti_role = "admin"` among them.
 *
 * What is left here is this route's own job, and all of it: a launch resolves
 * to a role via the gateway, and a role maps to a path. The mapping lives in
 * `~/lib/personas` and is shared with `/` and `/unsupported-role`; before
 * step-7 each of the three carried its own `switch` and they had drifted too.
 */

import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'

// The loader pulls `LTI_KEY` at import time via `lti-session.server.ts`, so we
// MUST set it before importing the route module.
process.env.LTI_KEY = process.env.LTI_KEY ?? 'test-key-for-app-loader-tests'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type AppModule = typeof import('./app.tsx')
let loader: AppModule['loader']
let clearCache: () => void

before(async () => {
  loader = ((await import('./app.tsx')) as AppModule).loader
  clearCache = (await import('~/lib/bp-ai/lti-role.server')).__clearLtiRoleCache
})

const originalFetch = globalThis.fetch

/** Answer every `ltiLaunchRole` with this role (or `null` for "no role"). */
function stubRole(role: string | null): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: { ltiLaunchRole: { role } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
}

beforeEach(() => {
  // The lookup is cached per launch token, and every test here signs a fresh
  // one — but clearing is cheap and a shared cache between tests is the kind
  // of coupling that fails one test only when another ran first.
  clearCache()
})

after(() => {
  globalThis.fetch = originalFetch
})

async function callLoader(): Promise<Response> {
  const secret = new TextEncoder().encode(process.env.LTI_KEY ?? '')
  const jwt = await new SignJWT({ token: { platformContext: { roles: [], custom: {} } } })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)

  const request = new Request(`https://example.test/app?lti_session=${encodeURIComponent(jwt)}`)
  try {
    // The real `Route.LoaderArgs` has extra fields we don't use; cast through
    // `unknown` to satisfy the loader signature in tests.
    await loader({ request, params: {}, context: {} as never } as never)
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw new Error('expected the loader to throw a Response')
    return thrown
  }
  throw new Error('the loader returned instead of redirecting')
}

describe('/app routes a launch by the role the gateway answers', () => {
  for (const [role, prefix] of [
    ['STUDENT', '/student/onboarding/'],
    ['TEACHER', '/teacher'],
    ['COUNSELOR', '/counselor'],
    ['PARENT', '/parent'],
    // No admin surface exists, and the counselor dashboard is the useful one.
    // The single product decision in the table.
    ['ADMIN', '/counselor'],
  ] as const) {
    it(`${role} → ${prefix}`, async () => {
      stubRole(role)
      const response = await callLoader()
      assert.equal(response.status, 302)
      const location = response.headers.get('Location') ?? ''
      assert.ok(location.startsWith(prefix), `got ${location}`)
    })
  }

  for (const [label, role] of [
    ['a role this app has no screens for', 'SCHOOL_ADMIN'],
    ['a launch the gateway would not place', null],
  ] as const) {
    it(`${label} → /unsupported-role`, async () => {
      // Never a guess, and never STUDENT in particular: it is the narrowest
      // role and therefore the tempting default, but it is a real persona with
      // an onboarding flow that would start writing records for this person.
      stubRole(role)
      const response = await callLoader()
      const location = response.headers.get('Location') ?? ''
      assert.ok(location.startsWith('/unsupported-role'), `got ${location}`)
    })
  }

  it('forwards the URL token, so a cookieless browser keeps its session', async () => {
    // Safari ITP and Firefox Strict ETP drop `lti-claims` in an iframe, so the
    // `?lti_session=` transport is the only one the persona route will have.
    stubRole('TEACHER')
    const response = await callLoader()
    assert.match(response.headers.get('Location') ?? '', /\?lti_session=/)
  })

  it('401s without a launch, rather than redirecting somewhere useless', async () => {
    stubRole('TEACHER')
    try {
      await loader({
        request: new Request('https://example.test/app'),
        params: {},
        context: {} as never,
      } as never)
      assert.fail('expected a 401')
    } catch (thrown) {
      assert.ok(thrown instanceof Response)
      assert.equal((thrown as Response).status, 401)
    }
  })
})
