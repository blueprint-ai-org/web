/**
 * Seed the four student avatars into a tenant's BP AI avatar catalogue.
 *
 * The gateway stores an avatar as a row pointing at art hosted elsewhere — it
 * has no upload of any kind (no `Upload` scalar, no presign, nothing across
 * 172 mutations; measured 2026-09-23). The art therefore lives in this app's
 * `public/student/avatars/`, and what goes in the row is an absolute URL on
 * this app's public origin, so a client that is not this web app can still
 * resolve it.
 *
 * Reads the catalogue from `~/lib/student/avatars`, the same module the
 * onboarding picker and the settings page render from, so a seeded row and the
 * UI cannot drift.
 *
 * ## Idempotent
 *
 * Matches existing rows by `name` (the slug) and updates rather than
 * duplicating, so re-running after an origin change repoints the URLs instead
 * of creating a second set. `--dry-run` prints the plan and calls nothing.
 *
 * ## Credentials
 *
 * Runs as the tenant's **owner admin**, not the student and not a platform
 * pass. bp-admin's own avatar screen calls these same three operations under an
 * `assumeTenant` pass, and a pass token's subject is the platform admin — which
 * is exactly what broke `inviteUser` (DEV-1941). Seeding with the owner admin
 * keeps this first-ever live run of `createAvatar` off that known-bad path.
 *
 * Run:
 *   cd lti-server-test
 *   npx tsx --env-file=<creds> scripts/bp-ai-seed-avatars.ts [--dry-run]
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD,
 *      PUBLIC_BASE_URL (or BASE_URL).
 */
import 'dotenv/config'

import { STUDENT_AVATARS } from '../app/lib/student/avatars.js'

const ENDPOINT = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_ADMIN_EMAIL
const PASSWORD = process.env.BP_AI_ADMIN_PASSWORD
const ORIGIN = (process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '').trim().replace(/\/$/, '')
const DRY_RUN = process.argv.includes('--dry-run')

if (!ENDPOINT || !EMAIL || !PASSWORD) {
  console.error('Need BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD.')
  process.exit(1)
}
if (!ORIGIN) {
  console.error('Need PUBLIC_BASE_URL (or BASE_URL) — the row stores an absolute URL.')
  process.exit(1)
}
if (!/^https:\/\//.test(ORIGIN)) {
  console.error(`Origin must be https — got ${ORIGIN}. A stored URL outlives this machine.`)
  process.exit(1)
}

const AVATAR_FIELDS = 'id name image_url background order status'

const LOGIN = `mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) { token user_id tenant }
}`
const LIST = `query ListAvatars($pageSize: Int) {
  listAvatars(pageSize: $pageSize) { avatars { ${AVATAR_FIELDS} } }
}`
const CREATE = `mutation CreateAvatar($input: CreateAvatarInput!) {
  createAvatar(input: $input) { ${AVATAR_FIELDS} }
}`
const UPDATE = `mutation UpdateAvatar($input: UpdateAvatarInput!) {
  updateAvatar(input: $input) { ${AVATAR_FIELDS} }
}`

interface Avatar {
  id: string
  name: string
  image_url: string | null
  background: string | null
  order: number | null
  status: string | null
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

function describe(a: Avatar): string {
  return `${a.name.padEnd(10)} order=${a.order}  bg=${a.background}  ${a.image_url || '(no image_url)'}`
}

async function main() {
  const plan = STUDENT_AVATARS.map((a, i) => ({
    name: a.slug,
    image_url: `${ORIGIN}${a.src}`,
    background: a.bg,
    order: i,
    status: 'active',
  }))

  console.log(`\nendpoint  ${ENDPOINT}`)
  console.log(`origin    ${ORIGIN}`)
  console.log(`seeding   ${plan.length} avatars\n`)
  for (const p of plan) console.log(`  ${p.name}  ${p.background}  ${p.image_url}`)

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing was called.\n')
    return
  }

  const auth = await gql<{ login: { token: string; user_id: string; tenant: string } }>(
    LOGIN,
    { email: EMAIL, password: PASSWORD },
  )
  const { token, tenant } = auth.login
  console.log(`\nlogged in as owner admin — tenant ${tenant}`)

  const before = await gql<{ listAvatars: { avatars: Avatar[] } }>(LIST, { pageSize: 100 }, token)
  const existing = new Map(before.listAvatars.avatars.map((a) => [a.name, a]))
  console.log(`catalogue holds ${existing.size} avatar(s) before seeding\n`)

  for (const input of plan) {
    const match = existing.get(input.name)
    try {
      if (match) {
        const out = await gql<{ updateAvatar: Avatar }>(UPDATE, { input: { id: match.id, ...input } }, token)
        console.log(`  updated  ${describe(out.updateAvatar)}`)
      } else {
        const out = await gql<{ createAvatar: Avatar }>(CREATE, { input }, token)
        console.log(`  created  ${describe(out.createAvatar)}`)
      }
    } catch (e) {
      console.error(`  FAILED   ${input.name} — ${(e as Error).message}`)
    }
  }

  const after = await gql<{ listAvatars: { avatars: Avatar[] } }>(LIST, { pageSize: 100 }, token)
  console.log(`\ncatalogue now holds ${after.listAvatars.avatars.length} avatar(s):`)
  for (const a of after.listAvatars.avatars) console.log(`  ${a.id}  ${describe(a)}`)
  console.log()
}

main().catch((e) => {
  console.error(`\nseed failed: ${(e as Error).message}\n`)
  process.exit(1)
})
