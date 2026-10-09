// Read-only probe: does the gateway accept an image UPLOAD anywhere, or is
// `image_url` the only way art reaches an Avatar?
//
// Run: cd lti-server-test && npx tsx --env-file=<creds> scripts/bp-ai-upload-probe.ts
// Three spaced introspection requests — the gateway bans for >15 min on a burst.
import 'dotenv/config'

const ENDPOINT = process.env.BP_AI_GRAPHQL_URL!
const EMAIL = process.env.BP_AI_STUDENT_EMAIL!
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD!

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const HIT = /upload|presign|signed|media|file|asset|blob|storage|image|attach|s3|bucket/i

async function post(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  })
  return (await res.json()) as any
}

async function main() {
  const login = await post('mutation($e:String!,$p:String!){login(email:$e,password:$p){token}}', {
    e: EMAIL,
    p: PASSWORD,
  })
  const token = login?.data?.login?.token
  if (!token) return console.error('login failed', JSON.stringify(login).slice(0, 300))
  console.log('\nlogin ok\n')

  // 1. every type name — an Upload scalar would show up here
  const types = await post('{__schema{types{name kind}}}', {}, token)
  const tl: any[] = types?.data?.__schema?.types ?? []
  console.log(`[types]     ${tl.length} types; matching: ${tl.filter((t) => HIT.test(t.name)).map((t) => `${t.name}(${t.kind})`).join(', ') || 'NONE'}`)
  console.log(`[scalars]   ${tl.filter((t) => t.kind === 'SCALAR').map((t) => t.name).join(', ')}`)
  await sleep(3000)

  // 2. mutations
  const mut = await post('{__type(name:"Mutation"){fields{name description args{name type{kind name ofType{kind name}}}}}}', {}, token)
  const mf: any[] = mut?.data?.__type?.fields ?? []
  console.log(`\n[mutations] ${mf.length} total; matching:`)
  for (const f of mf.filter((f) => HIT.test(f.name))) {
    const args = f.args.map((a: any) => `${a.name}: ${a.type?.name ?? a.type?.ofType?.name ?? a.type?.ofType?.ofType?.name}`).join(', ')
    console.log(`  ${f.name}(${args})`)
    if (f.description) console.log(`    └─ ${f.description.replace(/\n/g, ' ')}`)
  }
  await sleep(3000)

  // 3. queries
  const q = await post('{__type(name:"Query"){fields{name description args{name type{kind name ofType{kind name}}}}}}', {}, token)
  const qf: any[] = q?.data?.__type?.fields ?? []
  console.log(`\n[queries]   ${qf.length} total; matching:`)
  for (const f of qf.filter((f) => HIT.test(f.name))) {
    const args = f.args.map((a: any) => `${a.name}: ${a.type?.name ?? a.type?.ofType?.name}`).join(', ')
    console.log(`  ${f.name}(${args})`)
    if (f.description) console.log(`    └─ ${f.description.replace(/\n/g, ' ')}`)
  }
  console.log()
}
main()
