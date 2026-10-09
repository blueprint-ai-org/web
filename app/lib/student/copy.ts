/**
 * Baked student copy.
 *
 * Replaces the prototype's runtime Google-Sheet CMS (`content-loader.js`). Copy
 * comes from two sources, per the migration's copy-source rule:
 *
 *  - `sheetCopy` — AUTO-GENERATED from `content-sheet.tsv` by
 *    `scripts/import-student-copy.ts`. Canonical for the 10 prototype pages that
 *    actually loaded the CMS. Do not hand-edit `copy.sheet.ts`.
 *  - `pageCopy` — hand-authored here. Canonical for the pages that rendered
 *    hardcoded fallback text (today, onboarding, toolkit-video, …). Page ports
 *    add their strings here under new keys as each page lands in later phases.
 *
 * `studentCopy` merges both. `copyLines()` splits a value on the literal `\n`
 * token (which denotes a line break in the sheet), replacing the loader's old
 * `\n` → `<br>` injection — callers render the returned lines with `<br/>`
 * between them.
 */

import { sheetCopy } from './copy.sheet'

/**
 * Hand-authored, page-hardcoded copy. Empty at the end of Phase 1; each page
 * phase adds the strings it needs here. Keys must not collide with `sheetCopy`.
 */
export const pageCopy = {} as const

export const studentCopy = { ...sheetCopy, ...pageCopy }

export type StudentCopyKey = keyof typeof studentCopy

/** Raw copy string for a key (may contain literal `\n` line-break tokens). */
export function copyText(key: StudentCopyKey): string {
  return studentCopy[key]
}

/**
 * Copy split into display lines on the literal `\n` token. Render with `<br/>`
 * between lines (replaces the prototype loader's `<br>` injection).
 */
export function copyLines(key: StudentCopyKey): string[] {
  return studentCopy[key].split('\\n')
}
