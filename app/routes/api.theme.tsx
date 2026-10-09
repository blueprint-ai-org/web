/**
 * `/api/theme` — action-only route that persists a per-role theme preference
 * into the unsigned `theme` cookie. The hook in `app/hooks/useThemeMode.ts`
 * POSTs `{ role, mode }` JSON here via `useFetcher`.
 *
 * GET is intentionally 405 — there is no useful read endpoint; route loaders
 * call `readThemeMode(request, role)` directly.
 */

import type { Route } from './+types/api.theme'
import { readThemeRecord, serializeThemeCookie } from '~/lib/theme-cookie.server'
import type { KnownRole, ThemeMode } from '~/lib/theme-types'

function jsonError(status: number, error: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

// Used by `isKnownRole` to validate the *incoming* role on a write. The merge
// no longer iterates this list — it preserves whatever keys are already in
// the cookie via `readThemeRecord`.
const KNOWN_ROLES: readonly KnownRole[] = ['counselor', 'teacher']

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function isKnownRole(value: unknown): value is KnownRole {
  return typeof value === 'string' && (KNOWN_ROLES as readonly string[]).includes(value)
}

/** Merge incoming { role, mode } into the existing per-role record, preserving any unknown keys already in the cookie. */
function buildMergedRecord(
  request: Request,
  updateRole: KnownRole,
  updateMode: ThemeMode,
): Record<string, ThemeMode> {
  const existing = readThemeRecord(request) ?? {}
  return { ...existing, [updateRole]: updateMode }
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return jsonError(405, 'method-not-allowed', { Allow: 'POST' })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'invalid-json')
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400, 'invalid-body')
  }

  const { role, mode } = body as { role?: unknown; mode?: unknown }
  if (!isKnownRole(role) || !isThemeMode(mode)) {
    return jsonError(400, 'invalid-fields')
  }

  const merged = buildMergedRecord(request, role, mode)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': serializeThemeCookie(merged),
    },
  })
}

export async function loader() {
  return jsonError(405, 'method-not-allowed', { Allow: 'POST' })
}
