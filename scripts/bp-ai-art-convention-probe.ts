// Read-only: what do existing Blueprint content records put in their art URLs?
// Tells us where the platform expects art to be hosted, since the gateway has
// no upload of any kind. Run with --env-file=<creds>.
import 'dotenv/config'

const E = process.env.BP_AI_GRAPHQL_URL!

async function post(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const r = await fetch(E, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  })
  return (await r.json()) as any
}

const PROBES: ReadonlyArray<readonly [string, string]> = [
  ['listCourses', 'query{listCourses(pageSize:10){courses{id title cover_url status}}}'],
  ['listLessons', 'query{listLessons(pageSize:10){lessons{id title cover_url video_url}}}'],
  ['listCollectibles', 'query{listCollectibles(pageSize:10){collectibles{id name image_url}}}'],
]

async function main() {
  const l = await post('mutation($e:String!,$p:String!){login(email:$e,password:$p){token}}', {
    e: process.env.BP_AI_STUDENT_EMAIL,
    p: process.env.BP_AI_STUDENT_PASSWORD,
  })
  const t = l?.data?.login?.token
  if (!t) return console.error('login failed', JSON.stringify(l).slice(0, 200))

  for (const [label, q] of PROBES) {
    try {
      const r = await post(q, {}, t)
      const out = r.errors
        ? `ERR ${r.errors[0]?.extensions?.code}: ${r.errors[0]?.message}`
        : JSON.stringify(r.data).slice(0, 900)
      console.log(`\n== ${label} ==\n${out}`)
    } catch (e) {
      console.log(`\n== ${label} ==\nTRANSPORT ${(e as Error).message}`)
    }
  }
  console.log()
}

main()
