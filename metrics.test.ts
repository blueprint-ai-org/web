// The health and metrics listeners in `metrics.ts`, each on a port of its own.
//
// Run: npx tsx --test --test-force-exit metrics.test.ts
import { after, before, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { listenHealth, listenMetrics } from './metrics.js'

mock.method(console, 'log', () => {})

const url = (server: Server, path: string) => `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()))

describe('listenHealth', () => {
  let readiness: true | string = 'starting'
  let server: Server
  before(async () => {
    server = await listenHealth(0, () => readiness)
  })
  after(() => close(server))

  for (const path of ['/api/health/startup', '/api/health/liveness']) {
    it(`answers ${path} with 200 whatever the readiness`, async () => {
      for (const state of ['starting', true, 'shutting down'] as const) {
        readiness = state
        const res = await fetch(url(server, path))
        assert.equal(res.status, 200)
        assert.match(res.headers.get('content-type') ?? '', /^application\/json/)
        assert.deepEqual(await res.json(), { status: 'ok' })
      }
    })
  }

  it('answers readiness 503 while starting, 200 once ready, 503 again while draining', async () => {
    readiness = 'starting'
    let res = await fetch(url(server, '/api/health/readiness'))
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { status: 'down', reason: 'starting' })

    readiness = true
    res = await fetch(url(server, '/api/health/readiness'))
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { status: 'ok' })

    readiness = 'shutting down'
    res = await fetch(url(server, '/api/health/readiness'))
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { status: 'down', reason: 'shutting down' })
  })

  it('ignores the query string', async () => {
    readiness = true
    const res = await fetch(url(server, '/api/health/readiness?probe=kubelet'))
    assert.equal(res.status, 200)
  })

  it('answers HEAD like GET, without a body', async () => {
    readiness = true
    const ok = await fetch(url(server, '/api/health/readiness'), { method: 'HEAD' })
    assert.equal(ok.status, 200)
    assert.equal(await ok.text(), '')

    readiness = 'starting'
    const down = await fetch(url(server, '/api/health/readiness'), { method: 'HEAD' })
    assert.equal(down.status, 503)
  })

  it('answers 405 to other methods on a health path', async () => {
    const res = await fetch(url(server, '/api/health/liveness'), { method: 'POST' })
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('allow'), 'GET, HEAD')
  })

  for (const path of ['/', '/metrics', '/api/health', '/api/health/other', '/healthz']) {
    it(`answers 404 to ${path}`, async () => {
      const res = await fetch(url(server, path))
      assert.equal(res.status, 404)
    })
  }
})

describe('listenMetrics', () => {
  let server: Server
  before(async () => {
    server = await listenMetrics(0)
  })
  after(() => close(server))

  it('serves the registry on /metrics', async () => {
    const res = await fetch(url(server, '/metrics'))
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /^text\/plain/)
    assert.match(await res.text(), /^up\{app_process_name="web"\} 1$/m)
  })

  for (const path of ['/api/health/startup', '/api/health/liveness', '/api/health/readiness']) {
    it(`does not serve ${path}`, async () => {
      const res = await fetch(url(server, path))
      assert.equal(res.status, 404)
    })
  }
})

describe('a port already in use', () => {
  let busy: Server
  before(async () => {
    busy = await listenMetrics(0)
  })
  after(() => close(busy))

  it('rejects listenHealth', async () => {
    const port = (busy.address() as AddressInfo).port
    await assert.rejects(listenHealth(port, () => true), { code: 'EADDRINUSE' })
  })

  it('rejects listenMetrics', async () => {
    const port = (busy.address() as AddressInfo).port
    await assert.rejects(listenMetrics(port), { code: 'EADDRINUSE' })
  })
})
