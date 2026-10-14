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
 * Server: today in the zone {@link TZ_COOKIE} names, or `undefined` (the
 * gateway's UTC day) when the browser has not told us yet or sent nonsense.
 */
export function localDateFor(request: Request, now = new Date()): string | undefined {
  const match = (request.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${TZ_COOKIE}=([^;]+)`))
  if (!match) return undefined
  try {
    // An unknown zone throws, which is the validation.
    return now.toLocaleDateString('en-CA', { timeZone: decodeURIComponent(match[1]) })
  } catch {
    return undefined
  }
}
