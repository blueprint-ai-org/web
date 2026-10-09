// Read-only: what does the question catalogue hold, and can a STUDENT read it?
// The onboarding loader will have nothing but the student's session.
import 'dotenv/config'

const E = process.env.BP_AI_GRAPHQL_URL!

async function gql(query: string, variables: Record<string, unknown>, token?: string) {
  const r = await fetch(E, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25_000),
  })
  const b = (await r.json()) as any
  if (b.errors?.length) throw new Error(`${b.errors[0].extensions?.code ?? r.status}: ${b.errors[0].message}`)
  return b.data
}

const FIELDS = `id label category type max_selections order status
  options { id label value emoji order }`

async function main() {
  for (const [who, email, pass] of [
    ['student', process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD],
    ['owner admin', process.env.BP_AI_ADMIN_EMAIL, process.env.BP_AI_ADMIN_PASSWORD],
  ] as const) {
    const { login } = await gql('mutation($e:String!,$p:String!){login(email:$e,password:$p){token}}', {
      e: email,
      p: pass,
    })
    try {
      const { listQuestions } = await gql(
        `query($n:Int){listQuestions(pageSize:$n){questions{ ${FIELDS} } next_page_token}}`,
        { n: 100 },
        login.token,
      )
      const qs = listQuestions.questions as any[]
      console.log(`\n[${who}] listQuestions ok — ${qs.length} question(s)`)
      const cats = [...new Set(qs.map((q) => q.category))]
      console.log(`  categories in use: ${cats.length ? cats.map((c) => JSON.stringify(c)).join(', ') : '(none)'}`)
      for (const q of qs.slice(0, 12)) {
        console.log(`  ${q.category?.padEnd(14)} ${q.type?.padEnd(11)} order=${String(q.order).padEnd(3)} ${q.status?.padEnd(8)} ${q.label}`)
        for (const o of q.options ?? []) console.log(`      ${o.emoji ?? ' '} ${o.label} = ${o.value} (${o.order})`)
      }
    } catch (e) {
      console.log(`\n[${who}] listQuestions REFUSED — ${(e as Error).message}`)
    }
  }
  console.log()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
