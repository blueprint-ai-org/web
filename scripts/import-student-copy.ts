/**
 * Import the prototype content sheet into a baked, typed copy module.
 *
 * The prototype hydrated copy at runtime from a Google Apps Script endpoint
 * (`content-loader.js`) that fetched `content-sheet.tsv` as JSON and injected
 * each value into `[data-content]` nodes, replacing `\n` with `<br>`. This
 * migration drops the runtime fetch: the sheet is parsed once, at build time,
 * into `app/lib/student/copy.sheet.ts` (an `as const` map). `copyLines()` in
 * `copy.ts` replaces the loader's `<br>` injection.
 *
 * Usage:
 *   npx tsx scripts/import-student-copy.ts            # regenerate copy.sheet.ts
 *   npx tsx scripts/import-student-copy.ts --verify   # assert 465 keys, no write
 *   npx tsx scripts/import-student-copy.ts --tsv <path>
 *
 * The TSV is canonical only for the 10 pages that loaded the CMS. Per-page
 * hardcoded fallback copy for the other pages is hand-authored in `copy.ts`
 * (the `pageCopy` object) and is NOT touched by this generator.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const EXPECTED_KEYS = 465

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')

const args = process.argv.slice(2)
const verifyOnly = args.includes('--verify')
const tsvFlagIdx = args.indexOf('--tsv')
const tsvPath =
  tsvFlagIdx !== -1 && args[tsvFlagIdx + 1]
    ? resolve(args[tsvFlagIdx + 1])
    : resolve(repoRoot, '..', 'blueprint-prototype-main', 'content-sheet.tsv')

const outPath = resolve(repoRoot, 'app', 'lib', 'student', 'copy.sheet.ts')

function fail(msg: string): never {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

/** Parse the headerless `key<TAB>value` TSV into an ordered entry list. */
function parseTsv(raw: string): Array<[string, string]> {
  const lines = raw.split('\n')
  // A trailing newline yields a final empty element — drop empties.
  const entries: Array<[string, string]> = []
  const seen = new Set<string>()
  lines.forEach((line, i) => {
    if (line === '') return
    const tab = line.indexOf('\t')
    if (tab === -1) fail(`row ${i + 1} has no tab separator: ${JSON.stringify(line)}`)
    const key = line.slice(0, tab)
    const value = line.slice(tab + 1)
    if (seen.has(key)) fail(`duplicate key "${key}" at row ${i + 1}`)
    seen.add(key)
    entries.push([key, value])
  })
  return entries
}

if (!existsSync(tsvPath)) fail(`content sheet not found: ${tsvPath}`)

const entries = parseTsv(readFileSync(tsvPath, 'utf8'))

if (entries.length !== EXPECTED_KEYS) {
  fail(`expected ${EXPECTED_KEYS} keys, parsed ${entries.length} from ${tsvPath}`)
}

if (verifyOnly) {
  // Also guard against drift between the TSV and the committed module.
  if (existsSync(outPath)) {
    const committed = readFileSync(outPath, 'utf8')
    const committedKeys = committed.match(/^\s{2}"[^"]+":/gm)?.length ?? 0
    if (committedKeys !== EXPECTED_KEYS) {
      fail(
        `copy.sheet.ts has ${committedKeys} keys but the TSV has ${EXPECTED_KEYS} — run the importer without --verify to regenerate`,
      )
    }
  } else {
    fail(`copy.sheet.ts missing at ${outPath} — run the importer without --verify`)
  }
  console.log(`✓ ${EXPECTED_KEYS} copy keys verified (TSV + copy.sheet.ts in sync)`)
  process.exit(0)
}

const body = entries
  .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n')

const out = `/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Source: blueprint-prototype-main/content-sheet.tsv (${EXPECTED_KEYS} rows).
 * Regenerate: npx tsx scripts/import-student-copy.ts
 *
 * Literal "\\n" in a value denotes a line break (see \`copyLines\` in copy.ts).
 */

export const sheetCopy = {
${body}
} as const
`

writeFileSync(outPath, out)
console.log(`✓ wrote ${entries.length} keys → ${outPath}`)
