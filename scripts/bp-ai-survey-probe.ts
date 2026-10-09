// Read-only: what do the mini-survey operations say their access gate is?
// One introspection request (the gateway bans on a burst), descriptions only.
import 'dotenv/config'
const E = process.env.BP_AI_GRAPHQL_URL!
async function post(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const r = await fetch(E, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25_000),
  })
  return (await r.json()) as any
}
async function main() {
  const l = await post('mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}', {
    e: process.env.BP_AI_STUDENT_EMAIL, p: process.env.BP_AI_STUDENT_PASSWORD,
  })
  const t = l?.data?.login?.token
  console.log(`\nstudent ${l?.data?.login?.user_id}\n`)

  const mut = await post('{__type(name:"Mutation"){fields{name description args{name type{kind name ofType{kind name}}}}}}', {}, t)
  const fields: any[] = mut?.data?.__type?.fields ?? []
  for (const f of fields.filter((f) => /survey|response|answer/i.test(f.name))) {
    console.log(`${f.name}(${f.args.map((a: any) => `${a.name}: ${a.type?.name ?? a.type?.ofType?.name}`).join(', ')})`)
    console.log(`  └─ ${f.description ? f.description.replace(/\n/g, ' ') : '(no description)'}\n`)
  }
}
main().catch((e) => { console.error(e.message); process.exit(1) })
