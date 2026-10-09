import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { action, loader } from './api.theme.tsx'

function makeRequest(opts: { method: string; body?: unknown; cookie?: string }): Request {
  const headers = new Headers()
  if (opts.cookie) headers.set('cookie', opts.cookie)
  const init: RequestInit = { method: opts.method, headers }
  if (opts.body !== undefined) {
    headers.set('content-type', 'application/json')
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)
  }
  return new Request('https://example.test/api/theme', init)
}

// Helper to call action with the React Router shape. The real `Route.ActionArgs`
// also carries route-specific generics; for these tests we only exercise
// `request`, so a narrow cast is sufficient.
function callAction(request: Request) {
  return action({ request, params: {}, context: {} as never } as never)
}

function decodeSetCookie(setCookie: string): Record<string, string> {
  const value = setCookie.split(';')[0].slice('theme='.length)
  return JSON.parse(decodeURIComponent(value)) as Record<string, string>
}

describe('api.theme loader', () => {
  it('returns 405 with Allow: POST on GET', async () => {
    const res = await loader()
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('Allow'), 'POST')
    const body = (await res.json()) as { ok: boolean; error: string }
    assert.deepEqual(body, { ok: false, error: 'method-not-allowed' })
  })
})

describe('api.theme action', () => {
  it('returns 405 with Allow: POST on non-POST methods', async () => {
    const res = await callAction(makeRequest({ method: 'GET' }))
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('Allow'), 'POST')
    const body = (await res.json()) as { ok: boolean; error: string }
    assert.deepEqual(body, { ok: false, error: 'method-not-allowed' })
  })

  it('returns 400 invalid-json on a POST with non-JSON body', async () => {
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    const req = new Request('https://example.test/api/theme', {
      method: 'POST',
      headers,
      body: 'not-json{',
    })
    const res = await callAction(req)
    assert.equal(res.status, 400)
    const body = (await res.json()) as { ok: boolean; error: string }
    assert.deepEqual(body, { ok: false, error: 'invalid-json' })
  })

  it('returns 400 invalid-body on a POST with array body', async () => {
    const res = await callAction(makeRequest({ method: 'POST', body: ['counselor', 'dark'] }))
    assert.equal(res.status, 400)
    const body = (await res.json()) as { ok: boolean; error: string }
    assert.deepEqual(body, { ok: false, error: 'invalid-body' })
  })

  it('returns 400 invalid-fields on a POST with an unknown role', async () => {
    const res = await callAction(
      makeRequest({ method: 'POST', body: { role: 'admin', mode: 'dark' } }),
    )
    assert.equal(res.status, 400)
    const body = (await res.json()) as { ok: boolean; error: string }
    assert.deepEqual(body, { ok: false, error: 'invalid-fields' })
  })

  it('returns 400 invalid-fields on a POST with an invalid mode', async () => {
    const res = await callAction(
      makeRequest({ method: 'POST', body: { role: 'counselor', mode: 'sepia' } }),
    )
    assert.equal(res.status, 400)
    const body = (await res.json()) as { ok: boolean; error: string }
    assert.deepEqual(body, { ok: false, error: 'invalid-fields' })
  })

  it('returns 200 and a Set-Cookie with counselor:light when no existing cookie is present', async () => {
    const res = await callAction(
      makeRequest({ method: 'POST', body: { role: 'counselor', mode: 'light' } }),
    )
    assert.equal(res.status, 200)
    const body = (await res.json()) as { ok: boolean }
    assert.deepEqual(body, { ok: true })

    const setCookie = res.headers.get('Set-Cookie')
    assert.ok(setCookie, 'expected Set-Cookie header')
    const decoded = decodeSetCookie(setCookie!)
    assert.deepEqual(decoded, { counselor: 'light' })
  })

  it('preserves an unknown role key already in the cookie after a counselor update', async () => {
    const existing = encodeURIComponent(JSON.stringify({ custom: 'dark' }))
    const res = await callAction(
      makeRequest({
        method: 'POST',
        body: { role: 'counselor', mode: 'light' },
        cookie: `theme=${existing}`,
      }),
    )
    assert.equal(res.status, 200)
    const setCookie = res.headers.get('Set-Cookie')
    assert.ok(setCookie, 'expected Set-Cookie header')
    const decoded = decodeSetCookie(setCookie!)
    assert.deepEqual(decoded, { custom: 'dark', counselor: 'light' })
  })

  it('overwrites the same role when re-set', async () => {
    const existing = encodeURIComponent(JSON.stringify({ counselor: 'dark', teacher: 'light' }))
    const res = await callAction(
      makeRequest({
        method: 'POST',
        body: { role: 'counselor', mode: 'light' },
        cookie: `theme=${existing}`,
      }),
    )
    assert.equal(res.status, 200)
    const setCookie = res.headers.get('Set-Cookie')
    assert.ok(setCookie, 'expected Set-Cookie header')
    const decoded = decodeSetCookie(setCookie!)
    assert.deepEqual(decoded, { counselor: 'light', teacher: 'light' })
  })
})
