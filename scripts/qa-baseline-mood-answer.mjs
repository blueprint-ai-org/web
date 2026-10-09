// Proves an answer given through the real screen reaches the gateway — and
// that changing it replaces the row rather than adding one.
//
// Reads the truth back with its OWN gateway token, not the app's response.
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
const surveys = async (t, u) =>
  (await gql('query($u:String){listMiniSurveys(user:$u,page_size:50){mini_surveys{id responses{question_id answer option_ids}}}}', { u }, t))
    .listMiniSurveys.mini_surveys

const { login } = await gql('mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}', { e: EMAIL, p: PASSWORD })
const { token, user_id } = login
const { listQuestions } = await gql('query{listQuestions(category:"onboarding",pageSize:50){questions{id label order options{id label value order}}}}', {}, token)
const q = listQuestions.questions.find((x) => x.order === 2)

// clean slate: drop anything left from earlier runs
for (const s of await surveys(token, user_id)) {
  await gql('mutation($id:ID!){deleteMiniSurvey(id:$id){id}}', { id: s.id }, token)
}
console.log(`\nstarting from ${(await surveys(token, user_id)).length} surveys\n`)

const signIn = await fetch(`${BASE}/login`, {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: EMAIL, password: PASSWORD }), redirect: 'manual',
})
const cookie = (signIn.headers.getSetCookie().find((c) => c.startsWith('bp-session=')) ?? '').split(';')[0]
check('signed in to the app', Boolean(cookie))

const page = await fetch(`${BASE}/student/onboarding/baseline-mood`, { headers: { cookie } })
const html = await page.text()
check('the screen renders', page.status === 200, String(page.status))
check('it is driven by the catalogue — the question id is in the payload', html.includes(q.id))
check('…and so are the option ids it needs to answer with', q.options.every((o) => html.includes(o.id)))

// answer "Okay"
const okay = q.options.find((o) => o.value === 'okay')
const post = async (opt, score) =>
  fetch(`${BASE}/student/onboarding/baseline-mood`, {
    method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ questionId: q.id, question: q.label, optionId: opt.id, answer: opt.label, score: String(score) }),
    redirect: 'manual',
  })

const first = await post(okay, 3)
check('the action accepts the answer', first.status === 200 || first.status === 204, String(first.status))
let rows = await surveys(token, user_id)
check('one survey now exists', rows.length === 1, `${rows.length}`)
check('…carrying the right question and option',
  rows[0]?.responses?.[0]?.question_id === q.id && rows[0]?.responses?.[0]?.option_ids?.[0] === okay.id,
  JSON.stringify(rows[0]?.responses?.[0]))
check('…and the readable answer', rows[0]?.responses?.[0]?.answer === 'Okay', rows[0]?.responses?.[0]?.answer)

// change the answer — this must REPLACE, not accumulate
const great = q.options.find((o) => o.value === 'great')
await post(great, 5)
rows = await surveys(token, user_id)
check('changing the answer does NOT create a second survey', rows.length === 1, `${rows.length} surveys`)
check('…and the stored answer is the new one', rows[0]?.responses?.[0]?.option_ids?.[0] === great.id, JSON.stringify(rows[0]?.responses?.[0]))

// the preview mirror has no session and must still render
const preview = await fetch(`${BASE}/preview/student/onboarding/baseline-mood`)
check('the preview mirror still renders with no session', preview.status === 200, String(preview.status))

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
