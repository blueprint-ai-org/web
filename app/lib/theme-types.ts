/**
 * Shared theme-mode types. Lives outside `theme-cookie.server.ts` so the
 * client-side `useThemeMode` hook can import these without crossing the
 * `.server` convention boundary.
 *
 * `KnownRole` is the strict six-persona union. Since step-7 it is the ONE
 * lowercase persona vocabulary in the app: `~/lib/roles`'s copy of it went with
 * that module, and `~/lib/personas` derives `Persona` from this union
 * (`Exclude<KnownRole, 'unknown'>`) so the theme and the routing cannot name
 * different sets.
 */

export type ThemeMode = 'light' | 'dark'

export type KnownRole =
  | 'teacher'
  | 'counselor'
  | 'student'
  | 'parent'
  | 'admin'
  | 'unknown'
