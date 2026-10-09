/**
 * Student-app asset registry.
 *
 * Every asset under `app/assets/student-app/**` is migrated from the
 * `blueprint-prototype-main` prototype (see `MANIFEST.md` for the old→new
 * filename mapping). The prototype computes several asset paths dynamically at
 * runtime (`./components/${cfg.svg}.svg`, `./components/${key}-shape.svg`,
 * `./components/${cfg.svg}-${suffix}.svg`), so a static `import` per file is not
 * enough — this module eagerly globs the whole tree into URL lookup maps and
 * exposes typed helpers for the dynamically-computed families.
 *
 * Filenames were kebab-cased on copy, so callers pass the *migrated* base name
 * (or use the family helpers, which apply the same transform the migration
 * used).
 */

// Eager URL glob of every migrated asset. `query: '?url', import: 'default'`
// yields the emitted asset URL (hashed in build, dev-served path in dev).
//
// Wrapped in a `try` because this module is now reachable from a **route
// module**, and route modules are imported directly by `node:test` under `tsx`
// (`app/routes/login.test.ts` and friends — vitest is intentionally not
// installed). `import.meta.glob` is a Vite compile-time transform, so outside
// Vite there is no such function and the bare call throws a `TypeError` at
// module evaluation, taking every test in the file with it.
//
// The shape is a plain `try`/assignment rather than a `typeof` guard **on
// purpose**: Vite rewrites the *call expression* into an object literal, so a
// `typeof import.meta.glob === 'function'` test would be left in the output
// reading a property that no longer exists — and would come back `false` in the
// browser, emptying the registry in production. A `try` around the assignment is
// inert once the call has been replaced.
//
// The fallback is an empty map, not a throw: nothing in a route's `loader` or
// `action` resolves an asset, so tests never look one up. If anything ever does,
// `studentAsset` below throws its own named error, which says far more than
// `.glob is not a function` did.
let modules: Record<string, string> = {}
try {
  modules = import.meta.glob('./**/*.{svg,png,jpg}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>
} catch {
  modules = {}
}

/** Relative path (no leading `./`, e.g. `emotions/happy.svg`) → bundled URL. */
export const studentAssets: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.replace(/^\.\//, ''), url]),
)

/** Strict lookup by migrated relative path. Throws on an unknown key. */
export function studentAsset(relPath: string): string {
  const url = studentAssets[relPath]
  if (url === undefined) {
    throw new Error(`Unknown student asset: "${relPath}"`)
  }
  return url
}

/**
 * Kebab-cases a prototype base name the same way the migration did, so callers
 * can pass the prototype's raw `cfg.svg` values (e.g. `"Notice-y-w"`).
 */
export function kebabAssetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Dynamically-computed families ────────────────────────────────────────────

/**
 * Emotion background blob, keyed by emotion key (`mood-checkin.html:1079`,
 * `./components/${key}-shape.svg`). Returns `undefined` for keys with no shape.
 */
export function emotionShapeUrl(emotionKey: string): string | undefined {
  return studentAssets[`${emotionKey}-shape.svg`]
}

/**
 * Today-hub monster card variant (`today.html:882`,
 * `Property 1=M0X, Type=Y.svg` → `monster-m0X-y.svg`).
 * @param model card model, e.g. `"M01"` or `"m01"`.
 * @param type  `"Default" | "Sleepy" | "Done"` (case-insensitive).
 */
export function monsterCardUrl(model: string, type: string): string | undefined {
  return studentAssets[`monster-${model.toLowerCase()}-${type.toLowerCase()}.svg`]
}

/**
 * Daily-card art (`today.html`, `completed.html`,
 * `./components/${cfg.svg}[-${suffix}].svg`). Pass the prototype's raw base
 * (e.g. `"Notice-y-w"`, `"sleepy-1"`) and optional numeric suffix (`"02"`).
 */
export function cardArtUrl(base: string, suffix?: string): string | undefined {
  const stem = suffix ? `${kebabAssetName(base)}-${suffix}` : kebabAssetName(base)
  return studentAssets[`${stem}.svg`]
}
