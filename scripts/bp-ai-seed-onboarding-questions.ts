/**
 * Seed the onboarding questions this app renders into a tenant's BP AI
 * question catalogue.
 *
 * Every spec in `app/lib/student/onboarding-questions.ts` is seeded — the
 * baseline-mood scale behind `/student/onboarding/baseline-mood` and the
 * feel-good cards behind `/student/onboarding/helpers`. Those screens have
 * always carried their labels and options as baked copy; this puts them where
 * every Blueprint client can read them, and
 * `app/lib/bp-ai/questions.server.ts` reads them back.
 *
 * ## Conventions, measured rather than invented
 *
 * Read off the ten questions already in Blueprint Media on 2026-09-24:
 *
 *  - **`category` is snake_case** — `about_you`, `gratitude`, `journal`,
 *    `mood_reason`, `onboarding`, `sleep`. `onboarding` already exists.
 *  - **`order` is 1-based within a category.** `onboarding` order 1 is
 *    *"What do you want to be called?"* — archived on 2026-09-28 and left in
 *    place, so this still takes 2. Do not reclaim order 1 here: the archived
 *    row keeps it, and every screen keys on `(category, order)`.
 *  - **Option `value` is a snake_case slug**, `order` is 1-based, and `emoji`
 *    is populated wherever the UI shows one (`mood_reason` does, `sleep` does
 *    not). The mood arc shows one per stop, so this does.
 *  - **`SELECT_ONE`** is the type for a pick-exactly-one scale; `sleep` is the
 *    precedent. `max_selections` is *"only meaningful for MULTISELECT"*.
 *
 * ## Idempotent
 *
 * Matches a question by `(category, label)` and an option by `value`, creating
 * only what is missing. Re-running after an edit adds nothing and duplicates
 * nothing. `--dry-run` prints the plan and calls nothing.
 *
 * Runs as the tenant's **owner admin**, not a platform pass — same reasoning as
 * `bp-ai-seed-avatars.ts`.
 *
 * Run:
 *   cd lti-server-test
 *   npx tsx --env-file=<creds> scripts/bp-ai-seed-onboarding-questions.ts [--dry-run]
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD.
 */
import 'dotenv/config'

import { CHECKIN_QUESTIONS } from '../app/lib/student/checkin-questions.js'
import {
  BASELINE_MOOD_QUESTION,
  HELPERS_QUESTION,
  TRUSTED_PERSON_QUESTION,
  type OnboardingQuestionSpec,
} from '../app/lib/student/onboarding-questions.js'

/**
 * Seeded in this order; each one's `order` places it within its category.
 *
 * Two categories now: `onboarding` (the three screens of the intake flow) and
 * `checkin` (the daily check-in's reasons, its free-text companion, and sleep).
 * `seed()` and the read-back below both key on `spec.category`, so a third
 * category needs nothing here but its specs.
 */
const SPECS: readonly OnboardingQuestionSpec[] = [
  BASELINE_MOOD_QUESTION,
  HELPERS_QUESTION,
  TRUSTED_PERSON_QUESTION,
  ...CHECKIN_QUESTIONS,
]

const ENDPOINT = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_ADMIN_EMAIL
const PASSWORD = process.env.BP_AI_ADMIN_PASSWORD
const DRY_RUN = process.argv.includes('--dry-run')

if (!ENDPOINT || !EMAIL || !PASSWORD) {
  console.error('Need BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD.')
  process.exit(1)
}

const QUESTION_FIELDS = `id label category type max_selections order status
  options { id label value emoji order }`

const LOGIN = `mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) { token tenant }
}`
const LIST = `query ListQuestions($category: String, $pageSize: Int) {
  listQuestions(category: $category, pageSize: $pageSize) { questions { ${QUESTION_FIELDS} } }
}`
const CREATE_QUESTION = `mutation CreateQuestion($input: CreateQuestionInput!) {
  createQuestion(input: $input) { ${QUESTION_FIELDS} }
}`
const CREATE_OPTION = `mutation CreateQuestionOption($input: CreateQuestionOptionInput!) {
  createQuestionOption(input: $input) { id label value emoji order }
}`

interface Option {
  id: string
  label: string
  value: string
  emoji: string | null
  order: number | null
}
interface Question {
  id: string
  label: string
  category: string
  type: string
  order: number | null
  status: string | null
  options: Option[]
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

/** Create what is missing for one spec, and say what it found. */
async function seed(spec: OnboardingQuestionSpec, token: string) {
  const before = await gql<{ listQuestions: { questions: Question[] } }>(
    LIST,
    { category: spec.category, pageSize: 100 },
    token,
  )
  console.log(`\ncategory "${spec.category}" holds ${before.listQuestions.questions.length} question(s) before "${spec.label}"`)

  let question = before.listQuestions.questions.find((q) => q.label === spec.label)
  if (question) {
    console.log(`  exists   ${question.id}  "${question.label}"`)
  } else {
    const created = await gql<{ createQuestion: Question }>(
      CREATE_QUESTION,
      {
        input: {
          label: spec.label,
          category: spec.category,
          type: spec.type,
          order: spec.order,
          status: spec.status,
          // Only meaningful for MULTISELECT, and the gateway validates an
          // answer's option count against it.
          ...(spec.maxSelections === undefined ? {} : { max_selections: spec.maxSelections }),
        },
      },
      token,
    )
    question = created.createQuestion
    console.log(`  created  ${question.id}  "${question.label}"`)
  }

  const have = new Set((question.options ?? []).map((o) => o.value))
  for (const option of spec.options) {
    if (have.has(option.value)) {
      console.log(`    exists   ${option.value}`)
      continue
    }
    const made = await gql<{ createQuestionOption: Option }>(
      CREATE_OPTION,
      {
        input: {
          question: question.id,
          label: option.label,
          value: option.value,
          order: option.order,
          // Sent only where the UI shows one — the catalogue's own convention.
          ...(option.emoji === undefined ? {} : { emoji: option.emoji }),
        },
      },
      token,
    )
    console.log(`    created  ${made.createQuestionOption.emoji ?? ''} ${made.createQuestionOption.label} = ${made.createQuestionOption.value}`)
  }
}

async function main() {
  console.log(`\nendpoint  ${ENDPOINT}`)
  for (const spec of SPECS) {
    console.log(`question  ${spec.category} / ${spec.type} / order ${spec.order}${spec.maxSelections === undefined ? '' : ` / max ${spec.maxSelections}`}`)
    console.log(`          "${spec.label}"`)
    for (const o of spec.options) console.log(`            ${o.emoji ?? ' '} ${o.label.padEnd(10)} = ${o.value} (${o.order})`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing was called.\n')
    return
  }

  const auth = await gql<{ login: { token: string; tenant: string } }>(LOGIN, {
    email: EMAIL,
    password: PASSWORD,
  })
  const { token, tenant } = auth.login
  console.log(`\nlogged in as owner admin — tenant ${tenant}`)

  for (const spec of SPECS) await seed(spec, token)

  for (const category of new Set(SPECS.map((s) => s.category))) {
    const after = await gql<{ listQuestions: { questions: Question[] } }>(
      LIST,
      { category, pageSize: 100 },
      token,
    )
    console.log(`\ncategory "${category}" now holds:`)
    for (const q of after.listQuestions.questions) {
      console.log(`  ${q.type.padEnd(11)} order=${String(q.order).padEnd(3)} ${q.status}  ${q.label}`)
      for (const o of q.options ?? []) console.log(`      ${o.emoji ?? ' '} ${o.label} = ${o.value} (${o.order})`)
    }
  }
  console.log()
}

main().catch((e) => {
  console.error(`\nseed failed: ${(e as Error).message}\n`)
  process.exit(1)
})
