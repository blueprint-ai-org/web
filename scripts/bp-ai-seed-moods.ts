/**
 * Seed the check-in's fifteen emotions into a tenant's BP AI mood catalogue.
 *
 * Reads `~/lib/student/emotions`, the same module the picker, the detail
 * screens and the journal render from, so a seeded row and the UI cannot drift.
 * The gateway row carries only what the gateway models — identifier, label,
 * category, colours, description, order. Everything the check-in needs and the
 * schema has no field for (per-level labels, per-level emojis, the grid emoji,
 * the reason chips, the blob geometry) stays in that module, keyed by
 * `identifier`.
 *
 * ## Why a new category
 *
 * Every tenant is auto-seeded with a 92-mood emotion wheel in nine `global`
 * categories (`happy`, `sad`, `angry`, `hurt`, `scared`, `disgusted`, `numb`,
 * `jealous`, `surprised`) — measured identical on Blueprint Media and on the
 * platform tenant, 2026-09-29. Those 92 are per-tenant rows, so deleting them
 * is a per-tenant treadmill that any re-seed undoes, and the nine categories
 * are `platform: global` and refuse deletion while referenced. A new category
 * is additive, survives re-seeding, and lets `listMoods(category:)` return
 * exactly these fifteen. When the backend replaces the seed with this
 * framework, {@link CATEGORY} simply becomes the seeded one — no migration.
 *
 * **Pick `CATEGORY.identifier` once.** `updateMoodCategory` refuses to rename an
 * identifier while any mood references it.
 *
 * ## Three gateway behaviours this script exists to get right
 *
 * All measured 2026-09-29 against `api-test`, all of them silent `INTERNAL_ERROR`
 * rather than a validation error:
 *
 *  1. **`CreateMoodInput.category` is the category's UUID, not its identifier**,
 *     contrary to `thoughts/…/2026-09-16-bp-ai-master-admin-contract-live.md`
 *     §13. Passing the identifier answers `INTERNAL_ERROR` *and writes the row
 *     anyway*, with a category reference that cannot resolve — after which
 *     `listMoods { moods { category { … } } }` fails **for the whole tenant**
 *     until the bad row is deleted. Hence {@link resolveCategoryId}.
 *  2. **`video` must be supplied even though it is optional on write.** It is
 *     `Asset!` on read, so a row without one poisons any query selecting it.
 *     This is why `listMoods{cover}` already fails on the 92 seeded rows.
 *  3. **A duplicate `identifier` answers `INTERNAL_ERROR`, not a conflict**, so
 *     idempotency has to be a read-then-decide rather than a create-and-catch.
 *
 * ## Why the identifiers are prefixed
 *
 * `Mood.identifier` is unique **per tenant**, not per category — measured, by
 * creating `excited` inside a second category and being refused. Six of the
 * fifteen (`excited`, `hopeful`, `tired`, `lonely`, `stressed`, `anxious`)
 * already exist among the auto-seeded 92, so a bare `EmotionKey` would either
 * be refused or, worse, silently hijack a seeded row and drag it into this
 * category. {@link moodIdentifier} prefixes instead: additive, collision-proof,
 * and it leaves the wheel exactly as provisioning left it. The app derives the
 * identifier from its `EmotionKey`, so this stays a one-line mapping rather
 * than a lookup table. When the wheel is eventually retired the prefix can be
 * dropped — `UpdateMoodInput.identifier` is writable (unlike a *category*
 * identifier, which is frozen while referenced).
 *
 * ## Idempotent
 *
 * Matches existing rows by `identifier` and updates rather than duplicating.
 * `--dry-run` prints the plan and calls nothing.
 *
 * ## Credentials
 *
 * Runs as the tenant's **owner admin** — `createMood` is `@auth(type: USER)`
 * plus `role: ADMIN`, so an API key cannot do this, and the student token is
 * refused (it answers `UNAUTHORIZED`, which is a misleading code for a role
 * failure). Same choice as `bp-ai-seed-avatars.ts`: the owner admin, never a
 * platform `assumeTenant` pass, whose subject is the platform admin.
 *
 * Run:
 *   cd lti-server-test
 *   npx tsx --env-file=<creds> scripts/bp-ai-seed-moods.ts [--dry-run]
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD.
 */
import 'dotenv/config'

import { moodIdentifier } from '../app/lib/student/checkin-catalogue.js'
import { EMOTION_KEYS, EMOTIONS, type EmotionKey } from '../app/lib/student/emotions.js'

const ENDPOINT = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_ADMIN_EMAIL
const PASSWORD = process.env.BP_AI_ADMIN_PASSWORD
const DRY_RUN = process.argv.includes('--dry-run')

if (!ENDPOINT || !EMAIL || !PASSWORD) {
  console.error('Need BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD.')
  process.exit(1)
}

/** The category these fifteen live in. Its `identifier` is effectively permanent. */
const CATEGORY = { identifier: 'daily_checkin', label: 'Daily check-in', order: 10 } as const

/**
 * `cover` is required on write and `video` is non-null on read, but the app
 * renders its own local `${key}-shape.svg` and reads neither. They are set to a
 * single inert placeholder rather than to `studentAsset()` output, which is a
 * Vite-hashed build-specific URL and must never be persisted, or to a
 * `public/student/**` path, which no environment serves (DEV-1974).
 */
const PLACEHOLDER_ASSET = { type: 'image', url: 'https://assets.blueprinteq.ai/moods/placeholder.svg' }
const PLACEHOLDER_VIDEO = { type: 'video', url: 'https://assets.blueprinteq.ai/moods/placeholder.mp4' }

/**
 * One line per emotion for the catalogue's `description` (required, `String!`).
 * Written for an operator reading the admin console, not for the student — the
 * student never sees this field; they see the three level labels in
 * `~/lib/student/emotions`.
 */
const DESCRIPTIONS: Record<EmotionKey, string> = {
  curious: 'Wanting to know more — interest through to needing an answer.',
  happy: 'Feeling good — quiet contentment through to joy.',
  excited: 'Energised anticipation — looking forward to something through to pumped.',
  okay: 'Steady and fine — nothing much wrong, nothing much to report.',
  grateful: 'Warmth towards someone or something — appreciative through to thankful.',
  hopeful: 'Expecting things to get better — a flicker through to optimism.',
  meh: 'Flat and unmoved — not bad, not good, just not much.',
  neutral: 'Even — no strong feeling in either direction.',
  idontknow: 'Unable to name it yet. A valid answer, not a skipped one.',
  sad: 'Low — a dip through to real sadness.',
  tired: 'Low energy — a bit drained through to exhausted.',
  lonely: 'Disconnected from people — left out through to genuinely alone.',
  angry: 'Anger — irritation through to fury.',
  stressed: 'Under pressure — stretched through to overwhelmed.',
  anxious: 'Worry about what is coming — uneasy through to very anxious.',
}

const MOOD_FIELDS = 'id identifier label order color text_color description'
const CATEGORY_FIELDS = 'id identifier label order'

const LOGIN = `mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) { token user_id tenant }
}`
const LIST_CATEGORIES = `query { listMoodCategories { categories { ${CATEGORY_FIELDS} } } }`
const CREATE_CATEGORY = `mutation CreateMoodCategory($input: CreateMoodCategoryInput!) {
  createMoodCategory(input: $input) { ${CATEGORY_FIELDS} }
}`
// Deliberately NOT selecting `category`, `cover` or `video`: all three are
// non-null on read and unset on the 92 auto-seeded rows, so selecting any of
// them fails the whole query for the tenant.
const LIST_MOODS = `query { listMoods { moods { ${MOOD_FIELDS} } } }`
const CREATE_MOOD = `mutation CreateMood($input: CreateMoodInput!) {
  createMood(input: $input) { ${MOOD_FIELDS} }
}`
const UPDATE_MOOD = `mutation UpdateMood($input: UpdateMoodInput!) {
  updateMood(input: $input) { ${MOOD_FIELDS} }
}`

interface MoodCategoryRow {
  id: string
  identifier: string
  label: string
  order: number | null
}
interface MoodRow {
  id: string
  identifier: string
  label: string
  order: number | null
  color: string | null
  text_color: string | null
  description: string | null
}

async function gql<T>(query: string, variables: Record<string, unknown>, token?: string): Promise<T> {
  const res = await fetch(ENDPOINT as string, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  })
  const body = (await res.json()) as { data?: T; errors?: Array<Record<string, unknown>> }
  if (body.errors?.length) {
    const first = body.errors[0] as { message?: string; extensions?: { code?: string } }
    throw new Error(`${first.extensions?.code ?? res.status}: ${first.message ?? 'unknown'}`)
  }
  if (!body.data) throw new Error(`${res.status}: no data`)
  return body.data
}

/**
 * The category's UUID — creating it if this tenant has not got one yet.
 * `createMood` needs the id; passing the identifier corrupts the row (see the
 * module docblock).
 */
async function resolveCategoryId(token: string): Promise<string> {
  const { listMoodCategories } = await gql<{ listMoodCategories: { categories: MoodCategoryRow[] } }>(
    LIST_CATEGORIES,
    {},
    token,
  )
  const existing = listMoodCategories.categories.find((c) => c.identifier === CATEGORY.identifier)
  if (existing) {
    console.log(`category  ${CATEGORY.identifier} already exists (${existing.id})`)
    return existing.id
  }
  if (DRY_RUN) {
    console.log(`category  ${CATEGORY.identifier} would be created`)
    return '(dry-run)'
  }
  const { createMoodCategory } = await gql<{ createMoodCategory: MoodCategoryRow }>(
    CREATE_CATEGORY,
    { input: { label: CATEGORY.label, identifier: CATEGORY.identifier, order: CATEGORY.order } },
    token,
  )
  console.log(`category  ${CATEGORY.identifier} created (${createMoodCategory.id})`)
  return createMoodCategory.id
}

async function main() {
  const plan = EMOTION_KEYS.map((key, i) => {
    const e = EMOTIONS[key]
    return {
      identifier: moodIdentifier(e.key),
      label: e.name,
      color: e.color,
      text_color: '#000000',
      description: DESCRIPTIONS[key],
      order: i + 1,
    }
  })

  console.log(`\nendpoint  ${ENDPOINT}`)
  console.log(`category  ${CATEGORY.identifier} — "${CATEGORY.label}"`)
  console.log(`seeding   ${plan.length} moods\n`)
  for (const p of plan) {
    console.log(`  ${String(p.order).padStart(2)}  ${p.identifier.padEnd(12)} ${p.label.padEnd(14)} ${p.color}  ${p.description}`)
  }

  const { login } = await gql<{ login: { token: string; tenant?: string } }>(
    LOGIN,
    { email: EMAIL, password: PASSWORD },
    undefined,
  )
  console.log(`\nlogged in as ${EMAIL}${login.tenant ? ` (tenant ${login.tenant})` : ''}`)

  const categoryId = await resolveCategoryId(login.token)

  const { listMoods } = await gql<{ listMoods: { moods: MoodRow[] } }>(LIST_MOODS, {}, login.token)
  const byIdentifier = new Map(listMoods.moods.map((m) => [m.identifier, m]))
  console.log(`catalogue holds ${listMoods.moods.length} moods before this run\n`)

  if (DRY_RUN) {
    for (const p of plan) {
      const existing = byIdentifier.get(p.identifier)
      console.log(`  ${existing ? 'update' : 'create'}  ${p.identifier}${existing ? ` (${existing.id})` : ''}`)
    }
    console.log('\n--dry-run — nothing was written.')
    return
  }

  let created = 0
  let updated = 0
  for (const p of plan) {
    const existing = byIdentifier.get(p.identifier)
    if (existing) {
      await gql(
        UPDATE_MOOD,
        {
          input: {
            id: existing.id,
            label: p.label,
            color: p.color,
            text_color: p.text_color,
            description: p.description,
            order: p.order,
            category: categoryId,
            cover: PLACEHOLDER_ASSET,
            video: PLACEHOLDER_VIDEO,
          },
        },
        login.token,
      )
      updated++
      console.log(`  updated  ${p.identifier}`)
    } else {
      await gql(
        CREATE_MOOD,
        {
          input: {
            identifier: p.identifier,
            label: p.label,
            category: categoryId,
            color: p.color,
            text_color: p.text_color,
            description: p.description,
            order: p.order,
            cover: PLACEHOLDER_ASSET,
            video: PLACEHOLDER_VIDEO,
            tips: [],
          },
        },
        login.token,
      )
      created++
      console.log(`  created  ${p.identifier}`)
    }
  }

  console.log(`\n${created} created, ${updated} updated.`)

  // Read back through the category filter — the call the app will make, and the
  // one that proves no row was written with an unresolvable category.
  const { listMoods: after } = await gql<{ listMoods: { moods: MoodRow[] } }>(
    'query($c: String) { listMoods(category: $c) { moods { identifier order } } }',
    { c: categoryId },
    login.token,
  )
  console.log(`listMoods(category: "${CATEGORY.identifier}") -> ${after.moods.length} moods`)
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
