/**
 * Shared theme-mode types. Lives outside `theme-cookie.server.ts` so the
 * client-side `useThemeMode` hook can import these without crossing the
 * `.server` convention boundary.
 *
 * `KnownRole` is the strict six-persona union, aligned with `~/lib/roles`'s
 * `KnownRole`. The two modules are not yet unified (tracked as a follow-up
 * in sub-plan E's appendix); for now we keep the literal unions in sync.
 */

export type ThemeMode = 'light' | 'dark'

export type KnownRole =
  | 'teacher'
  | 'counselor'
  | 'student'
  | 'parent'
  | 'admin'
  | 'unknown'
