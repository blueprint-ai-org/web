/**
 * Regression test for the `/app` dispatcher loader's admin redirect target.
 *
 * The `/app` dispatcher routes LTI launches by classified role. Admins
 * (resolved via either an institution/system `#Administrator` URI or
 * `customFields.lti_role = 'admin'`) used to redirect to `/admin` — a debug
 * placeholder. They now redirect to `/counselor`, the most useful operational
 * dashboard until a real admin UI exists.
 *
 * Mirrors the JWT-mocking pattern in `app/routes/_persona.test.ts`.
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'

import { ROLE_URIS } from '~/lib/roles'

// The loader pulls `LTI_KEY` at import time via `lti-session.server.ts`, so we
// MUST set it before importing the route module.
process.env.LTI_KEY = process.env.LTI_KEY ?? 'test-key-for-app-loader-tests'

// Dynamic import so the secret is in place before module evaluation.
type AppModule = typeof import('./app.tsx')
let loader: AppModule['loader']

before(async () => {
  const mod = (await import('./app.tsx')) as AppModule
  loader = mod.loader
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
}) {
  const jwt = await signLtiSession({
    roles: opts.roles,
    customFields: opts.customFields,
  })
  const request = new Request(
    `https://example.test/app?lti_session=${encodeURIComponent(jwt)}`,
  )
  // The real `Route.LoaderArgs` has extra fields we don't use; cast through
  // `unknown` to satisfy the loader signature in tests.
  return loader({ request, params: {}, context: {} as never } as never)
}

describe('/app loader — admin redirect target', () => {
  it('redirects admins (via ROLE_URIS.institutionAdmin) to /counselor', async () => {
    try {
      await callLoader({ roles: [ROLE_URIS.institutionAdmin] })
      assert.fail('loader should have thrown a redirect Response')
    } catch (thrown) {
      assert.ok(thrown instanceof Response, 'expected loader to throw a Response')
      const response = thrown as Response
      assert.equal(response.status, 302)
      const location = response.headers.get('Location') ?? ''
      assert.ok(
        location.startsWith('/counselor'),
        `expected Location to start with /counselor, got: ${location}`,
      )
    }
  })

  // step-12: `custom_fields.lti_role` is launch-payload data and can no longer
  // grant the privileged persona on its own — only a platform-asserted
  // Administrator role does (see app/lib/admin-roles.ts). Against the previous
  // code the first of these two returned /counselor.
  it('does NOT grant admin from customFields.lti_role = "admin"', async () => {
    try {
      await callLoader({
        roles: [ROLE_URIS.instructor],
        customFields: { lti_role: 'admin' },
      })
      assert.fail('loader should have thrown a redirect Response')
    } catch (thrown) {
      assert.ok(thrown instanceof Response, 'expected loader to throw a Response')
      const response = thrown as Response
      assert.equal(response.status, 302)
      const location = response.headers.get('Location') ?? ''
      assert.ok(
        location.startsWith('/teacher'),
        `expected Location to start with /teacher, got: ${location}`,
      )
    }
  })

  it('redirects platform-asserted administrators to /counselor', async () => {
    try {
      await callLoader({ roles: [ROLE_URIS.institutionAdmin] })
      assert.fail('loader should have thrown a redirect Response')
    } catch (thrown) {
      assert.ok(thrown instanceof Response, 'expected loader to throw a Response')
      const response = thrown as Response
      assert.equal(response.status, 302)
      const location = response.headers.get('Location') ?? ''
      assert.ok(
        location.startsWith('/counselor'),
        `expected Location to start with /counselor, got: ${location}`,
      )
    }
  })
})
