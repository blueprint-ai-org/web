/**
 * The student's day, for `dailyCards(date:)`.
 *
 * The gateway wants the date in the STUDENT's zone and defaults to the UTC
 * day, which flips "today" at the wrong hour everywhere but London. The server
 * does not know the zone, so the client tells it once, in a cookie, and every
 * later loader can name the day — including a document load, which runs before
 * any client code.
 */

export const TZ_COOKIE = 'bp-tz'

/** Client: store the browser's IANA zone. A year: it changes only when the student travels. */
export function rememberTimeZone(): void {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
  } catch {
    // No zone, or cookies blocked: the server falls back to the UTC day.
  }
}

/** Client: today as the browser sees it (`YYYY-MM-DD`; `en-CA` formats that way). */
export function browserToday(): string {
  return new Date().toLocaleDateString('en-CA')
}

/**
 * Server: the IANA zone {@link TZ_COOKIE} names, or `undefined` when the
 * browser has not told us yet or sent nonsense (an unknown zone throws in
 * `Intl`, which is the validation).
 */
export function timeZoneFor(request: Request): string | undefined {
  const match = (request.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${TZ_COOKIE}=([^;]+)`))
  if (!match) return undefined
  try {
    const tz = decodeURIComponent(match[1])
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    return tz
  } catch {
    return undefined
  }
}

/**
 * Server: today in the zone {@link TZ_COOKIE} names, or `undefined` (the
 * gateway's UTC day) when the browser has not told us yet or sent nonsense.
 */
export function localDateFor(request: Request, now = new Date()): string | undefined {
  const tz = timeZoneFor(request)
  return tz ? now.toLocaleDateString('en-CA', { timeZone: tz }) : undefined
}

/** `YYYY-MM-DD` plus `days` (negative goes back). Calendar arithmetic, no zone involved. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/**
 * The instant a local day starts, as RFC 3339 — for the reads that take an
 * instant rather than a date (`moodCounts`). One correction step: exact except
 * inside the hour a DST change skips, where it lands an hour off.
 */
export function zonedMidnight(date: string, timeZone: string | undefined): string {
  const [y, m, d] = date.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d)
  if (!timeZone) return new Date(guess).toISOString()
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(guess)
      .map((p) => [p.type, p.value]),
  )
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return new Date(guess - (wall - guess)).toISOString()
}
