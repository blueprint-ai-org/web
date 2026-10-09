// Proves a pick made through the real screen lands on the student's record.
//
// The screen posts to its own route action, so this drives that action the way
// the browser does — then reads the answer back off the GATEWAY, not off the
// app, because an action that reports success while storing nothing is exactly
// the failure this feature spent a day having (MOA-167).
const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const GW = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_STUDENT_EMAIL
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD

let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✔' : '✘'} ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures++
}

async function gql(query, variables, token) {
  const r = await fetch(GW, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  })
  const b = await r.json()
  if (b.errors?.length) throw new Error(b.errors[0].message)
  return b.data
}

// a gateway session of our own, to read the truth independently of the app
const { login } = await gql('mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}', { e: EMAIL, p: PASSWORD })
const { listAvatars } = await gql('query{listAvatars(pageSize:50){avatars{id name}}}', {}, login.token)
const rows = listAvatars.avatars

// sign in to the APP
const signIn = await fetch(`${BASE}/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
  redirect: 'manual',
})
const cookie = (signIn.headers.getSetCookie().find((c) => c.startsWith('bp-session=')) ?? '').split(';')[0]
console.log(`\nlogin → ${signIn.status}`)
check('signing in issues a bp-session cookie', Boolean(cookie))
if (!cookie) process.exit(1)

// the screen renders from the catalogue
const page = await fetch(`${BASE}/student/onboarding/avatar`, { headers: { cookie } })
const html = await page.text()
check('the avatar screen renders', page.status === 200, String(page.status))
check(
  'it is driven by the CATALOGUE — a row id is in the SSR payload',
  rows.some((r) => html.includes(r.id)),
  'no catalogue id found; the loader fell back to baked art',
)
check('art is served locally, not fetched back off the deployed origin',
  html.includes('/avatars/avatar-') && !html.includes('canvas-lti-test.up.railway.app'))

// pick a DIFFERENT avatar than the one currently stored, so a no-op cannot pass
const before = (await gql('query($id:String!){getUser(id:$id){avatar_id}}', { id: login.user_id }, login.token)).getUser.avatar_id
const target = rows.find((r) => r.id !== before) ?? rows[0]
console.log(`\ncurrently ${before ?? 'none'} → picking ${target.name} (${target.id})\n`)

const posted = await fetch(`${BASE}/student/onboarding/avatar`, {
  method: 'POST',
  headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ avatarId: target.id }),
  redirect: 'manual',
})
check('the route action accepts the pick', posted.status === 200 || posted.status === 204, String(posted.status))

// the truth, read from the gateway with our own token
const after = (await gql('query($id:String!){getUser(id:$id){avatar_id}}', { id: login.user_id }, login.token)).getUser.avatar_id
check('the gateway now holds the picked avatar', after === target.id, `stored ${after}, expected ${target.id}`)
check('…and it actually changed', after !== before, `still ${before}`)

// a returning student opens on their own avatar
const reload = await fetch(`${BASE}/student/onboarding/avatar`, { headers: { cookie } })
const reloadHtml = await reload.text()
check('a reload seeds the picker with the stored pick', reloadHtml.includes(target.id))

// the preview mirror has no session and must still render
const preview = await fetch(`${BASE}/preview/student/onboarding/avatar`)
check('the preview mirror renders with no session', preview.status === 200, String(preview.status))

// ── settings is the other place a student changes this ──────────────────────
// If it only wrote localStorage, the record would keep the onboarding choice
// and a second device would show the stale avatar.
const other = rows.find((r) => r.id !== target.id) ?? rows[0]
console.log(`\nsettings: switching to ${other.name} (${other.id})\n`)
const settingsPost = await fetch(`${BASE}/student/settings`, {
  method: 'POST',
  headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ avatarSlug: other.name }),
  redirect: 'manual',
})
check('the settings action accepts a slug', settingsPost.status === 200 || settingsPost.status === 204, String(settingsPost.status))
const afterSettings = (await gql('query($id:String!){getUser(id:$id){avatar_id}}', { id: login.user_id }, login.token)).getUser.avatar_id
check('changing it in settings reaches the gateway too', afterSettings === other.id, `stored ${afterSettings}, expected ${other.id}`)
check('…so the two pickers cannot disagree', afterSettings !== target.id)

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
