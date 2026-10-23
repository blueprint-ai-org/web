/**
 * `/counselor/class-health` — el filtro de clase (step-30, C2-R06).
 *
 * Tres reglas:
 *
 *  1. con `?group=` de la lista, el clima se pide con `scopeType: GROUP` y ese
 *     id; sin él, con `SCHOOL`;
 *  2. un `?group=` que no está en la lista se IGNORA — el gateway contestaría
 *     FORBIDDEN y la tarjeta entera se vaciaría por un enlace viejo;
 *  3. un fallo leyendo los grupos deja la lista VACÍA, nunca profesores
 *     inventados.
 *
 * Run: npx tsx --test --test-force-exit app/routes/counselor.class-health.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { Role } from '../lib/bp-ai/gql/schema.ts'

process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-class-health-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type RouteModule = typeof import('./counselor.class-health.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let loader: RouteModule['loader']
let cookie: string

before(async () => {
  loader = ((await import('./counselor.class-health.tsx')) as RouteModule).loader
  const { sealBpSession } = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  cookie = `bp-session=${await sealBpSession({
    accessToken: 'access',
    refreshToken: 'refresh',
    userId: '332a53ba-0000-4000-8000-00000000000a',
    tenant: '2ecc258c-0000-4000-8000-00000000000b',
    accessTokenExpiresAt: Date.now() + 900_000,
    role: Role.Counselor,
    refreshExpiresAt: Date.now() + 30 * 24 * 3_600_000,
  })}`
})

const originalFetch = globalThis.fetch
after(() => {
  globalThis.fetch = originalFetch
})

const CLIMATE = {
  cohortMetrics: { cohortSize: 12, metrics: [{ metricName: 'MOOD_BASELINE', score: 70 }] },
  metricDefinitions: [{ name: 'MOOD_BASELINE', label: 'Mood', description: 'how it feels' }],
}

interface Call {
  op: string
  variables: Record<string, unknown>
}

/** Responde las cuatro lecturas. `groupsFail` hace fallar `listGroups`. */
function stubGateway(opts: { groupsFail?: boolean; ownersFail?: boolean } = {}): Call[] {
  const calls: Call[] = []
  globalThis.fetch = (async (_url: unknown, init: { body?: string } = {}) => {
    const body = JSON.parse(String(init.body ?? '{}')) as { query?: string; variables?: Record<string, unknown> }
    const query = String(body.query)
    const variables = body.variables ?? {}

    if (query.includes('listSchoolsForUser')) {
      calls.push({ op: 'schools', variables })
      return Response.json({ data: { listSchoolsForUser: { schools: [{ id: 's1', name: 'Oak' }] } } })
    }

    if (query.includes('listGroups')) {
      calls.push({ op: 'groups', variables })
      if (opts.groupsFail) return Response.json({ errors: [{ message: 'boom' }] })
      return Response.json({
        data: {
          listGroups: {
            groups: [
              { id: 'g1', name: '5B', owner: 'u-ana' },
              { id: 'g2', name: '6A', owner: 'u-luis' },
            ],
          },
        },
      })
    }

    if (query.includes('listUsers')) {
      calls.push({ op: 'owners', variables })
      if (opts.ownersFail) return Response.json({ errors: [{ message: 'boom' }] })
      return Response.json({
        data: {
          listUsers: {
            users: [
              { id: 'u-ana', display_name: null, first_name: 'Ana', last_name: 'Ruiz' },
              { id: 'u-luis', display_name: 'Luis P.', first_name: null, last_name: null },
            ],
          },
        },
      })
    }

    calls.push({ op: 'climate', variables })
    return Response.json({ data: CLIMATE })
  }) as unknown as typeof globalThis.fetch

  return calls
}

async function load(url: string) {
  const request = new Request(url, { headers: { cookie } })
  return loader({ request, params: {}, context: {} as never } as never)
}

describe('/counselor/class-health loader', () => {
  it('scopes the climate to the school when no group is asked for', async () => {
    const calls = stubGateway()

    const data = await load('https://example.test/counselor/class-health')

    assert.equal(data.group, null)
    const climate = calls.find((c) => c.op === 'climate')
    assert.deepEqual(climate?.variables, { scopeType: 'SCHOOL', scopeId: 's1' })
  })

  it('scopes the climate to the group when the id is one of the caller’s', async () => {
    const calls = stubGateway()

    const data = await load('https://example.test/counselor/class-health?group=g2')

    assert.equal(data.group, 'g2')
    const climate = calls.find((c) => c.op === 'climate')
    assert.deepEqual(climate?.variables, { scopeType: 'GROUP', scopeId: 'g2' })
  })

  it('ignores a group outside the list and falls back to the school', async () => {
    const calls = stubGateway()

    const data = await load('https://example.test/counselor/class-health?group=g-someone-else')

    assert.equal(data.group, null)
    const climate = calls.find((c) => c.op === 'climate')
    assert.deepEqual(climate?.variables, { scopeType: 'SCHOOL', scopeId: 's1' })
  })

  it('labels every group with its owner, in one listUsers for all of them', async () => {
    const calls = stubGateway()

    const data = await load('https://example.test/counselor/class-health')

    assert.deepEqual(data.groups, [
      { id: 'g1', label: 'Ana Ruiz · 5B' },
      { id: 'g2', label: 'Luis P. · 6A' },
    ])
    assert.equal(calls.filter((c) => c.op === 'owners').length, 1)
    assert.deepEqual(calls.find((c) => c.op === 'owners')?.variables, { ids: ['u-ana', 'u-luis'] })
  })

  it('falls back to the group name when the owner cannot be named', async () => {
    stubGateway({ ownersFail: true })

    const data = await load('https://example.test/counselor/class-health')

    assert.deepEqual(data.groups, [
      { id: 'g1', label: '5B' },
      { id: 'g2', label: '6A' },
    ])
  })

  it('leaves the list empty when listGroups fails — never invented teachers', async () => {
    const calls = stubGateway({ groupsFail: true })

    const data = await load('https://example.test/counselor/class-health')

    assert.deepEqual(data.groups, [])
    assert.equal(calls.filter((c) => c.op === 'owners').length, 0)
    // La tarjeta sigue leyéndose: el filtro roto no vacía el clima.
    assert.ok(data.climate)
  })
})
