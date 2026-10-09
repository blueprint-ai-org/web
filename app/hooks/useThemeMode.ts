/**
 * Client-side theme-mode hook.
 *
 * Owns a local `useState` mirror of the server-rendered theme mode and
 * persists changes by POSTing `{ role, mode }` JSON to `/api/theme`, which
 * updates the unsigned `theme` cookie via `serializeThemeCookie`.
 *
 * Intentional non-features:
 *  - No `localStorage` — the cookie is the source of truth on every render.
 *  - No `typeof window` guards — the hook is only called from client
 *    components, and the initial value always comes from a route loader
 *    that reads the cookie server-side.
 */

import { useState } from 'react'
import { useFetcher } from 'react-router'
import type { KnownRole, ThemeMode } from '~/lib/theme-types'

export function useThemeMode(
  role: KnownRole,
  initial: ThemeMode,
): [ThemeMode, (next: ThemeMode) => void] {
  const [mode, setLocalMode] = useState<ThemeMode>(initial)
  const fetcher = useFetcher()

  // TODO: rollback local state on fetcher failure (e.g. when fetcher.state === 'idle' && fetcher.data?.ok === false). Acceptable for theme prefs; revisit when this pattern is copied for stakier preferences.
  const setMode = (next: ThemeMode) => {
    setLocalMode(next)
    fetcher.submit(
      { role, mode: next },
      { method: 'POST', action: '/api/theme', encType: 'application/json' },
    )
  }

  return [mode, setMode]
}
