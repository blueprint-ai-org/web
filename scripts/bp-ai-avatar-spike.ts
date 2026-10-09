// Read-only spike: what can a student actually do with their avatar?
//
// Answers three questions with live evidence, no writes:
//   1. Is there a server-side avatar catalogue, and can a student read it?
//   2. What does `setMyAvatar` take, and what does its description say the gate is?
//   3. Does the `User` record carry an avatar, and can a student see their own?
//
// Run: cd lti-server-test && npx tsx --env-file=<creds> scripts/bp-ai-avatar-spike.ts
// Needs BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD.
//
// The gateway bans for >15 min on an introspection burst, so the three `__type`
// probes are one-per-request and spaced.
import 'dotenv/config'

const ENDPOINT = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_STUDENT_EMAIL
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD
if (!ENDPOINT || !EMAIL || !PASSWORD) {
  console.error('Need BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD.')
  process.exit(1)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function post(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const res = await fetch(ENDPOINT as string, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  return { status: res.status, body: (await res.json()) as any }
}

function err(body: any): string {
  const e = body?.errors?.[0]
  if (!e) return ''
  return `${e.extensions?.code ?? '?'}: ${e.message}`
}

async function main() {
  // --- 1. student session -------------------------------------------------
  const login = await post(
    'mutation($e:String!,$p:String!){login(email:$e,password:$p){token refresh_token user_id tenant}}',
    { e: EMAIL, p: PASSWORD },
  )
  const token = login.body?.data?.login?.token
  const me = login.body?.data?.login
  if (!token) {
    console.error('login failed:', login.status, err(login.body) || JSON.stringify(login.body).slice(0, 300))
    process.exit(1)
  }
  console.log(`\n[1] login            ok — user ${me?.user_id} tenant=${me?.tenant}`)

  // --- 2. setMyAvatar's own signature + description ------------------------
  const mut = await post(
    '{__type(name:"Mutation"){fields{name description args{name type{kind name ofType{kind name}}}}}}',
    {},
    token,
  )
  const mfields: any[] = mut.body?.data?.__type?.fields ?? []
  if (!mfields.length) console.log(`[2] Mutation probe   EMPTY — ${mut.status} ${err(mut.body)}`)
  for (const f of mfields.filter((f) => /avatar/i.test(f.name))) {
    const args = f.args
      .map((a: any) => `${a.name}: ${a.type?.name ?? a.type?.ofType?.name}${a.type?.kind === 'NON_NULL' ? '!' : ''}`)
      .join(', ')
    console.log(`[2] mutation         ${f.name}(${args})`)
    if (f.description) console.log(`      └─ ${f.description.replace(/\n/g, ' ')}`)
  }
  await sleep(2500)

  // --- 3. the Avatar entity's real shape -----------------------------------
  const av = await post('{__type(name:"Avatar"){fields{name description type{kind name ofType{name}}}}}', {}, token)
  const afields: any[] = av.body?.data?.__type?.fields ?? []
  console.log(
    `[3] type Avatar      ${afields.length ? afields.map((f) => `${f.name}: ${f.type?.name ?? f.type?.ofType?.name}`).join(', ') : `EMPTY — ${err(av.body)}`}`,
  )
  await sleep(2500)

  // --- 4. can the student READ the catalogue? ------------------------------
  const list = await post(
    'query{listAvatars(pageSize:50){avatars{id name image_url background order status}}}',
    {},
    token,
  )
  if (list.body?.errors) {
    console.log(`[4] listAvatars      REFUSED — ${err(list.body)}`)
    // retry with only the fields we are sure exist
    const retry = await post('query{listAvatars(pageSize:50){avatars{id name}}}', {}, token)
    console.log(`    retry (id,name)  ${retry.body?.errors ? err(retry.body) : JSON.stringify(retry.body?.data).slice(0, 400)}`)
  } else {
    const rows = list.body?.data?.listAvatars?.avatars ?? []
    console.log(`[4] listAvatars      ok — ${rows.length} avatar(s) in this tenant`)
    for (const r of rows) console.log(`      ${r.id}  ${r.name}  bg=${r.background}  ${r.image_url ?? '(no image_url)'}  ${r.status ?? ''}`)
  }

  // --- 5. does the student's own record carry an avatar? -------------------
  const user = await post('{__type(name:"User"){fields{name type{kind name ofType{name}}}}}', {}, token)
  const ufields: any[] = user.body?.data?.__type?.fields ?? []
  const avatarish = ufields.filter((f) => /avatar/i.test(f.name))
  console.log(
    `[5] type User        ${ufields.length} fields; avatar-related: ${avatarish.length ? avatarish.map((f) => `${f.name}: ${f.type?.name ?? f.type?.ofType?.name}`).join(', ') : 'NONE'}`,
  )
  if (avatarish.length) {
    const sel = avatarish.map((f) => (/^(Avatar)$/.test(f.type?.name ?? f.type?.ofType?.name) ? `${f.name}{id name image_url background}` : f.name)).join(' ')
    const self = await post(`query($id:String!){getUser(id:$id){ ${sel} }}`, { id: me.user_id }, token)
    console.log(`    getUser(self)    ${self.body?.errors ? err(self.body) : JSON.stringify(self.body?.data?.getUser)}`)
  }
  console.log()
}

main()
