/**
 * Theme-mode cookie helper.
 *
 * Stores a per-role theme-mode preference in an unsigned JSON cookie:
 *
 *   theme={"counselor":"dark","teacher":"light"}
 *
 * Theme preference is not security-sensitive, so we deliberately skip the
 * JWT-signing step used by `lti-session.server.ts`. Modeled on that file's
 * `readCookie` pattern.
 */

import type { KnownRole, ThemeMode } from './theme-types'

export type { KnownRole, ThemeMode } from './theme-types'

const COOKIE_NAME = 'theme'
const ONE_YEAR_SECONDS = 31_536_000

export function defaultModeFor(role: KnownRole): ThemeMode {
  if (role === 'counselor') return 'dark'
  if (role === 'teacher') return 'light'
  if (role === 'student') return 'light'
  if (role === 'parent') return 'light'
  if (role === 'admin') return 'light'
  return 'dark'
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1))
  }
  return null
}

/**
 * Parse the raw cookie value (URL-decoded JSON) into a per-role record.
 * Returns `null` if absent, malformed, or not an object. Drops keys whose
 * values aren't valid `ThemeMode`s.
 */
export function parseThemeRecord(raw: string | null): Record<string, ThemeMode> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const out: Record<string, ThemeMode> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === 'light' || v === 'dark') out[k] = v
    }
    return out
  } catch {
    return null
  }
}

/**
 * Parse the full theme record from a request's cookie header, or `null`.
 * Used by `/api/theme` to preserve unknown-role keys during merge.
 */
export function readThemeRecord(request: Request): Record<string, ThemeMode> | null {
  const header = request.headers.get('cookie')
  const raw = readCookie(header, COOKIE_NAME)
  return parseThemeRecord(raw)
}

/**
 * Read the stored theme mode for `role` from the request's `theme` cookie.
 * Falls back to a per-role default if the cookie is absent, malformed, or
 * does not contain an entry for `role`.
 */
export function readThemeMode(request: Request, role: KnownRole): ThemeMode {
  const header = request.headers.get('cookie')
  const raw = readCookie(header, COOKIE_NAME)
  const record = parseThemeRecord(raw)
  const stored = record?.[role]
  if (stored === 'light' || stored === 'dark') return stored
  return defaultModeFor(role)
}

/**
 * Serialize a per-role theme record into a `Set-Cookie` header value.
 *
 * Attributes: `Max-Age=31536000`, `Path=/`, `SameSite=None`, `Secure`.
 * Intentionally NOT `HttpOnly` — phase 5 may need to read it client-side.
 */
export function serializeThemeCookie(record: Record<string, ThemeMode>): string {
  const value = encodeURIComponent(JSON.stringify(record))
  return `${COOKIE_NAME}=${value}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=None; Secure`
}
