/**
 * `localDateFor` — the student's day for `dailyCards`, from the zone cookie.
 *
 * The gateway's default is the UTC day, so near midnight a student east or
 * west of London would see yesterday's (or tomorrow's) cards. These pin that
 * the cookie's zone, not UTC, names the day.
 *
 * Run: npx tsx --test --test-force-exit app/lib/student/time-zone.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { localDateFor, TZ_COOKIE } from './time-zone.ts'

// 23:30 UTC on the 14th: already the 15th in Auckland, still the 14th in UTC.
const NOW = new Date('2026-10-14T23:30:00Z')

function request(cookie?: string): Request {
  return new Request('https://example.test/student', cookie ? { headers: { cookie } } : {})
}

describe('localDateFor', () => {
  it("names the day in the cookie's zone, not UTC's", () => {
    const cookie = `other=1; ${TZ_COOKIE}=${encodeURIComponent('Pacific/Auckland')}`
    assert.equal(localDateFor(request(cookie), NOW), '2026-10-15')
  })

  it("leaves the day to the gateway when there is no zone, or one that isn't real", () => {
    assert.equal(localDateFor(request(), NOW), undefined)
    assert.equal(localDateFor(request(`${TZ_COOKIE}=Not%2FA_Zone`), NOW), undefined)
  })
})
