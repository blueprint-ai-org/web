import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { readThemeMode, serializeThemeCookie } from './theme-cookie.server.ts'

function requestWithCookie(cookie?: string): Request {
  const headers = new Headers()
  if (cookie !== undefined) headers.set('cookie', cookie)
  return new Request('https://example.test/', { headers })
}

describe('readThemeMode', () => {
  it('returns the per-role default when no cookie is present', () => {
    const req = requestWithCookie()
    assert.equal(readThemeMode(req, 'counselor'), 'dark')
    assert.equal(readThemeMode(req, 'teacher'), 'light')
    assert.equal(readThemeMode(req, 'student'), 'light')
    assert.equal(readThemeMode(req, 'parent'), 'light')
    assert.equal(readThemeMode(req, 'admin'), 'light')
    assert.equal(readThemeMode(req, 'unknown'), 'dark')
  })

  it('returns the stored value when the cookie contains an entry for the role', () => {
    const payload = encodeURIComponent(
      JSON.stringify({ counselor: 'light', teacher: 'dark' }),
    )
    const req = requestWithCookie(`theme=${payload}`)
    assert.equal(readThemeMode(req, 'counselor'), 'light')
    assert.equal(readThemeMode(req, 'teacher'), 'dark')
  })

  it('returns the per-role default when the cookie value is malformed JSON', () => {
    const req = requestWithCookie('theme=not-json')
    assert.equal(readThemeMode(req, 'counselor'), 'dark')
    assert.equal(readThemeMode(req, 'teacher'), 'light')
  })

  it('returns the per-role default when the cookie is present but lacks the role key', () => {
    const payload = encodeURIComponent(JSON.stringify({ teacher: 'dark' }))
    const req = requestWithCookie(`theme=${payload}`)
    assert.equal(readThemeMode(req, 'counselor'), 'dark')
    assert.equal(readThemeMode(req, 'teacher'), 'dark')
  })
})

describe('serializeThemeCookie', () => {
  it('emits a valid Set-Cookie string with Max-Age, Path, SameSite=None, and Secure', () => {
    const out = serializeThemeCookie({ counselor: 'dark', teacher: 'light' })
    assert.match(out, /^theme=/)
    assert.match(out, /Max-Age=31536000/)
    assert.match(out, /Path=\//)
    assert.match(out, /SameSite=None/)
    assert.match(out, /(?:^|;\s*)Secure(?:;|$)/)
    assert.doesNotMatch(out, /HttpOnly/i)

    // Round-trip: the encoded value must decode back to the original record.
    const value = out.split(';')[0].slice('theme='.length)
    const decoded = JSON.parse(decodeURIComponent(value)) as Record<string, string>
    assert.deepEqual(decoded, { counselor: 'dark', teacher: 'light' })
  })
})
