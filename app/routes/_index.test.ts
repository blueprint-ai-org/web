/**
 * Loader tests for `/` — the public root, which is now only ever a signpost.
 *
 * Same harness as `login.test.ts`: `node:test` under `tsx`, real modules, no
 * mocks. This loader never touches the network, so there is no fetch stub here.
 *
 * Run: npx tsx --test app/routes/_index.test.ts
 *
 * The LTI half of the loader (role → destination) is `classifyRole`'s contract
 * and is covered by lms-connector's `CanonicalRole` table; what these tests own is the
 * **ordering** between the two session sources and the no-session default.
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

import { ONBOARDING_FIRST_PATH } from '../components/dashboard/student/onboarding-v2/steps.ts'
import { Role } from '../lib/bp-ai/gql/schema.ts'

// `session.server.ts` refuses to sign when these two match — that guard is the
// LTI/BP-AI separation (D10), so the fixtures must respect it.
process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-root-loader-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
// `config.server.ts` throws at module evaluation without a gateway URL, and
// nothing here may reach a real one.
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type IndexModule = typeof import('./_index.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let loader: IndexModule['loader']
let sealBpSession: SessionModule['sealBpSession']

before(async () => {
  loader = ((await import('./_index.tsx')) as IndexModule).loader
  sealBpSession = ((await import('../lib/bp-ai/session.server.ts')) as SessionModule).sealBpSession
})

function callLoader(request: Request) {
  return loader({ request, params: {}, context: {} as never } as never)
}

/** The loader always redirects, so every call is expected to throw a Response. */
async function expectRedirect(request: Request): Promise<Response> {
  let thrown: unknown
  try {
    await callLoader(request)
  } catch (err) {
    thrown = err
  }
  if (!(thrown instanceof Response)) {
    throw new Error('expected the loader to throw a redirect Response')
  }
  return thrown
}

function get(cookie?: string): Request {
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  return new Request('https://example.test/', { headers })
}

async function studentSession(role: Role = Role.Student): Promise<string> {
  return sealBpSession({
    accessToken: 'access',
    refreshToken: 'refresh',
    userId: '332a53ba-0000-4000-8000-00000000000a',
    tenant: '2ecc258c-0000-4000-8000-00000000000b',
    accessTokenExpiresAt: Date.now() + 900_000,
    role,
    refreshExpiresAt: Date.now() + 30 * 24 * 3_600_000,
  })
}

describe('root loader', () => {
  it('sends a visitor with no session at all to /login', async () => {
    const response = await expectRedirect(get())
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('Location'), '/login')
  })

  it('routes a credential session by its own role claim', async () => {
    // It used to be a flat `/student`, because `login` carried no role. Both
    // halves of this route take `pathForRole` now, so a student lands on the
    // exported first onboarding step — this file used to hard-code
    // `/student/onboarding/welcome`, a path that had drifted from `/app`'s.
    const response = await expectRedirect(get(`bp-session=${await studentSession()}`))
    assert.equal(response.headers.get('Location'), ONBOARDING_FIRST_PATH)
  })

  it('routes a TEACHER credential session to the teacher app', async () => {
    const response = await expectRedirect(
      get(`bp-session=${await studentSession(Role.Teacher)}`),
    )
    assert.equal(response.headers.get('Location'), '/teacher')
  })

  it('treats an unreadable bp-session as no session', async () => {
    // A tampered or stale-secret cookie must not strand somebody on a page that
    // no longer exists — `readBpSession` returns null and they get `/login`.
    const response = await expectRedirect(get('bp-session=not-a-jwt'))
    assert.equal(response.headers.get('Location'), '/login')
  })

  it('never renders — the module exports no component', async () => {
    // The placeholder landing is gone on purpose. If a component comes back,
    // one of the three paths above has stopped redirecting.
    const mod = (await import('./_index.tsx')) as Record<string, unknown>
    assert.equal(mod.default, undefined)
  })
})
