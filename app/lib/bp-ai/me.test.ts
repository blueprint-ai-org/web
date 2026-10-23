/**
 * `bpMe` — the one call that replaced two.
 *
 * Three properties, and each one is a thing the old pair got wrong or had to
 * argue about:
 *
 *  1. **No user id travels.** `bpProfile` and `bpMyAvatarId` both took one and
 *     each carried a paragraph explaining why `getUser(id:)` was safe to call
 *     with it. `me` resolves the caller from the token, so there is nothing to
 *     widen and nothing to explain.
 *  2. **A null `user` is a real answer**, not a failure: the tenant owner has no
 *     tenant-internal record, and neither does a support pass. The avatar is
 *     `null` there and the greeting still works.
 *  3. **One round-trip.** The avatar screen used to pay for two.
 */

import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type MeModule = typeof import('./me.server.ts')
let bpMe: MeModule['bpMe']

before(async () => {
  bpMe = ((await import('./me.server.ts')) as MeModule).bpMe
})

const originalFetch = globalThis.fetch
let calls: Array<{ body: string; headers: Headers }> = []

function stub(payload: unknown): void {
  globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
    calls.push({ body: String(init.body ?? ''), headers: new Headers(init.headers) })
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch
}

beforeEach(() => {
  calls = []
})

after(() => {
  globalThis.fetch = originalFetch
})

describe('bpMe', () => {
  it('sends the token and NO user id', async () => {
    stub({
      data: {
        me: {
          preferredName: 'Ada',
          user: {
            avatar_id: 'avatar-7',
            // Resolved by the gateway since step-11, so a screen that needs the
            // ART does not have to find the row in a paged `listAvatars`.
            avatar: { id: 'avatar-7', name: 'fox', image_url: '/fox.png', background: '#b8c0ed' },
          },
        },
      },
    })

    const result = await bpMe('access.jwt.value')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)
    assert.deepEqual(result.data, {
      preferredName: 'Ada',
      avatarId: 'avatar-7',
      avatar: { id: 'avatar-7', name: 'fox', imageUrl: '/fox.png', background: '#b8c0ed' },
      onboardingCompletedAt: null,
      hasUserRecord: true,
    })

    assert.equal(calls.length, 1, 'one round-trip, where the old pair took two')
    const call = calls[0]
    if (!call) throw new Error('expected a call')
    assert.equal(call.headers.get('authorization'), 'Bearer access.jwt.value')
    const sent = JSON.parse(call.body) as { query: string; variables: Record<string, unknown> }
    assert.deepEqual(sent.variables, {}, 'no id may travel — that is the whole point')
    assert.doesNotMatch(sent.query, /getUser/)
  })

  it('reads a null user as "no avatar", not as a failure', async () => {
    // The owner of a tenant, and anybody inside a support pass.
    stub({ data: { me: { preferredName: 'Ada', user: null } } })

    const result = await bpMe('access.jwt.value')
    if (!result.ok) throw new Error('expected success')
    assert.equal(result.data.avatarId, null)
    assert.equal(result.data.preferredName, 'Ada')
  })

  it('treats a blank name as absent, so the caller renders its own default', async () => {
    // "Hi !" and "Hi Sophie!" are different kinds of wrong, and only the
    // surface knows which it can carry.
    stub({ data: { me: { preferredName: '   ', user: { avatar_id: '  ', avatar: null } } } })

    const result = await bpMe('access.jwt.value')
    if (!result.ok) throw new Error('expected success')
    // `avatar: null` is also what an avatar removed from the library reads as:
    // both render "none", which is what the student sees.
    assert.deepEqual(result.data, {
      preferredName: null,
      avatarId: null,
      avatar: null,
      onboardingCompletedAt: null,
      hasUserRecord: true,
    })
  })

  it('surfaces a gateway failure as a GqlResult rather than throwing', async () => {
    // A stale token: the greeting is cosmetic, so `_persona.tsx` logs this and
    // renders without a name rather than failing the whole layout.
    stub({
      data: null,
      errors: [{ message: 'Authentication required', extensions: { code: 'UNAUTHORIZED' } }],
    })

    const result = await bpMe('stale.jwt')
    if (result.ok) throw new Error('expected a failure')
    assert.equal(result.error.kind, 'unauthenticated')
  })
})
