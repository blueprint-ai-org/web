/**
 * Unit tests for the BP AI GraphQL client.
 *
 * `node:test` under `tsx` — **vitest is intentionally not installed in this
 * repo**. Modeled on `app/lib/theme-cookie.server.test.ts` (structure) and
 * `app/routes/app.test.ts:19-30` (set env, then dynamic-import the module).
 *
 * Run: npx tsx --test app/lib/bp-ai/client.test.ts
 *
 * Every error string asserted below was observed against the live gateway in
 * the Phase 0 spike and is transcribed from
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`. If the
 * backend rewords one of them these tests keep passing while production
 * silently degrades to `kind: 'unknown'` — that is the known fragility of
 * substring matching, recorded in `client.server.ts`.
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import type { BpAiError, BpAiErrorKind, GqlResult } from './types.ts'

// `config.server.ts` throws at module evaluation when the var is absent, so it
// must be set before the client is imported. Set unconditionally rather than
// `??=`: these tests assert the exact request URL, and must never reach the
// live gateway even when a real endpoint is in the ambient environment.
const ENDPOINT = 'https://bp-ai.test/graphql'
process.env.BP_AI_GRAPHQL_URL = ENDPOINT

type ClientModule = typeof import('./client.server.ts')
let graphql: ClientModule['graphql']

before(async () => {
  graphql = (await import('./client.server.ts')).graphql
})

// ── fetch stubbing ───────────────────────────────────────────────────────

type Call = { url: string; init: RequestInit }

const originalFetch = globalThis.fetch
let calls: Call[] = []

/** Install a `globalThis.fetch` stub. Throwing from `respond` rejects. */
function stub(respond: (call: Call) => Response | Promise<Response>): void {
  calls = []
  const impl = async (input: unknown, init?: unknown): Promise<Response> => {
    calls.push({ url: String(input), init: (init ?? {}) as RequestInit })
    return respond(calls[calls.length - 1])
  }
  globalThis.fetch = impl as unknown as typeof globalThis.fetch
}

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
function gqlFailure(message: string, code?: string, status = 200): Response {
  const entry = code === undefined ? { message } : { message, extensions: { code } }
  return json({ data: null, errors: [entry] }, status)
}

function onlyCall(): Call {
  assert.equal(calls.length, 1, 'expected exactly one fetch call')
  return calls[0]
}

function headersOf(call: Call): Headers {
  return new Headers(call.init.headers)
}

// Proves the Automated QA criterion "every BpAiError.kind is produced by at
// least one test case" rather than asserting it by eye.
const ALL_KINDS: readonly BpAiErrorKind[] = [
  'network',
  'invalid_credentials',
  'duplicate_email',
  'validation',
  'unauthenticated',
  'unknown',
]
const kindsSeen = new Set<BpAiErrorKind>()

function expectFailure<T>(result: GqlResult<T>): BpAiError {
  // Narrow with `throw`, not `assert.fail`: `tsconfig.vite.json` omits `node` from its `types`,
  // so node:assert's `never`/`asserts` signatures are unavailable and assert.fail cannot narrow.
  if (result.ok) throw new Error(`expected a failure, got data: ${JSON.stringify(result.data)}`)
  kindsSeen.add(result.error.kind)
  return result.error
}

// ── request shape ────────────────────────────────────────────────────────

describe('graphql — request shape', () => {
  it('POSTs the query and variables as JSON to the configured endpoint', async () => {
    stub(() => json({ data: { login: { token: 't' } } }))
    await graphql('mutation Login($email: String!) { login(email: $email) { token } }', {
      email: 'a@example.com',
    })

    const call = onlyCall()
    assert.equal(call.url, ENDPOINT)
    assert.equal(call.init.method, 'POST')
    assert.equal(headersOf(call).get('content-type'), 'application/json')
    assert.deepEqual(JSON.parse(String(call.init.body)), {
      query: 'mutation Login($email: String!) { login(email: $email) { token } }',
      variables: { email: 'a@example.com' },
    })
  })

  it('sends NO Authorization header when accessToken is omitted', async () => {
    // Load-bearing: login/signup/refreshToken are NO_USER operations and the
    // gateway rejects them outright with `BAD_REQUEST: User already
    // authenticated` if any credential rides along.
    stub(() => json({ data: { login: { token: 't' } } }))
    await graphql('mutation { login { token } }')

    assert.equal(headersOf(onlyCall()).has('authorization'), false)
  })

  it('sends an empty variables object when none are supplied', async () => {
    stub(() => json({ data: { validateToken: { user_id: 'u' } } }))
    await graphql('mutation { validateToken { user_id } }')

    assert.deepEqual(JSON.parse(String(onlyCall().init.body)).variables, {})
  })

  it('sends `Bearer <token>` by default', async () => {
    stub(() => json({ data: { logout: true } }))
    await graphql('mutation { logout }', {}, { accessToken: 'jwt-abc' })

    assert.equal(headersOf(onlyCall()).get('authorization'), 'Bearer jwt-abc')
  })

  it('sends the RAW token when authScheme is "raw" (the validateToken backend bug)', async () => {
    // `validateToken` feeds the whole header value to the JWT parser, so
    // `Bearer ` makes it fail base64 decoding at byte 6 (the space). Known
    // backend bug — see the AuthScheme docblock in client.server.ts.
    stub(() => json({ data: { validateToken: { user_id: 'u' } } }))
    await graphql('mutation { validateToken { user_id } }', {}, {
      accessToken: 'jwt-abc',
      authScheme: 'raw',
    })

    assert.equal(headersOf(onlyCall()).get('authorization'), 'jwt-abc')
  })
})

// ── success ──────────────────────────────────────────────────────────────

describe('graphql — success', () => {
  it('returns ok:true with the parsed data payload', async () => {
    const payload = {
      login: {
        token: 'access-jwt',
        refresh_token: 'a'.repeat(64),
        user_id: 'c0d5b335-0000-0000-0000-000000000000',
        tenant: 'ee97c4ea-0000-0000-0000-000000000000',
      },
    }
    stub(() => json({ data: payload }))

    const result = await graphql<typeof payload>('mutation { login { token } }')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}: ${result.error.message}`)
    assert.deepEqual(result.data, payload)
  })
})

// ── GraphQL error mapping (the Phase 0 table) ────────────────────────────

describe('graphql — error mapping', () => {
  it('maps extensions.code EMAIL_ALREADY_REGISTERED to duplicate_email', async () => {
    stub(() => gqlFailure('email already registered', 'EMAIL_ALREADY_REGISTERED'))

    const error = expectFailure(await graphql('mutation { signup { token } }'))
    assert.equal(error.kind, 'duplicate_email')
    assert.equal(error.code, 'EMAIL_ALREADY_REGISTERED')
    assert.equal(error.message, 'email already registered')
    assert.equal(error.status, 200)
  })

  it('maps duplicate_email on the message alone when no code is supplied', async () => {
    stub(() => gqlFailure('email already registered'))

    const error = expectFailure(await graphql('mutation { signup { token } }'))
    assert.equal(error.kind, 'duplicate_email')
    assert.equal(error.code, undefined)
  })

  it('maps "invalid credentials" to invalid_credentials and strips the rpc prefix', async () => {
    const raw = 'rpc error: code = Unknown desc = invalid credentials'
    stub(() => gqlFailure(raw))

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'invalid_credentials')
    assert.equal(error.message, 'invalid credentials')
    assert.equal(error.raw, raw, 'the untouched gateway message is kept for logs')
  })

  it('maps "BAD_REQUEST: User already authenticated" to validation', async () => {
    stub(() => gqlFailure('BAD_REQUEST: User already authenticated'))

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'validation')
  })

  it('maps "UNAUTHORIZED: Authentication required" to unauthenticated', async () => {
    stub(() => gqlFailure('UNAUTHORIZED: Authentication required'))

    const error = expectFailure(await graphql('mutation { logout }'))
    assert.equal(error.kind, 'unauthenticated')
  })

  it('maps a reused refresh token to unauthenticated', async () => {
    stub(() =>
      gqlFailure('rpc error: code = Unknown desc = refresh token reuse detected; family revoked'),
    )

    const error = expectFailure(await graphql('mutation { refreshToken { token } }'))
    assert.equal(error.kind, 'unauthenticated')
    assert.equal(error.message, 'refresh token reuse detected; family revoked')
  })

  it('maps a revoked access token (post-logout) to unauthenticated', async () => {
    stub(() => gqlFailure('rpc error: code = Unknown desc = token revoked'))

    const error = expectFailure(await graphql('mutation { validateToken { user_id } }'))
    assert.equal(error.kind, 'unauthenticated')
  })

  it('maps the validateToken Bearer-prefix bug to unauthenticated', async () => {
    stub(() =>
      gqlFailure(
        'failed to validate token: token is malformed: could not base64 decode header: illegal base64 data at input byte 6',
      ),
    )

    const error = expectFailure(await graphql('mutation { validateToken { user_id } }'))
    assert.equal(error.kind, 'unauthenticated')
  })

  it('falls back to unknown for an unrecognised message, keeping it verbatim', async () => {
    stub(() => gqlFailure('something the backend has not said before'))

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'unknown')
    assert.equal(error.message, 'something the backend has not said before')
  })

  it('classifies on the payload even when the status is not 200', async () => {
    // This gateway answers 200 for application errors, but a spec-compliant
    // 4xx carrying a usable errors[] must not be flattened into `network`.
    stub(() => gqlFailure('rpc error: code = Unknown desc = invalid credentials', undefined, 400))

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'invalid_credentials')
    assert.equal(error.status, 400)
  })
})

// ── transport failures ───────────────────────────────────────────────────

describe('graphql — transport failures', () => {
  it('maps a rejected fetch to network', async () => {
    stub(() => {
      throw new TypeError('fetch failed')
    })

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'network')
    assert.match(error.message, /fetch failed/)
  })

  it('maps a non-2xx response with no usable errors[] to network', async () => {
    stub(() => new Response('<html>502 Bad Gateway</html>', { status: 502 }))

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'network')
    assert.equal(error.status, 502)
    assert.match(error.raw ?? '', /Bad Gateway/)
  })

  it('maps a 200 with a malformed JSON body to network', async () => {
    stub(() => new Response('{"data": ', { status: 200 }))

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'network')
    assert.match(error.message, /non-JSON body/)
  })

  it('maps a 200 with neither data nor errors to unknown', async () => {
    stub(() => json({ data: null }))

    const error = expectFailure(await graphql('mutation { login { token } }'))
    assert.equal(error.kind, 'unknown')
  })
})

// ── coverage of the kind union ────────────────────────────────────────────

describe('BpAiError.kind coverage', () => {
  it('every kind in the union is produced by at least one case above', () => {
    const missing = ALL_KINDS.filter((k) => !kindsSeen.has(k))
    assert.deepEqual(missing, [], `kinds never produced by any test: ${missing.join(', ')}`)
  })
})
