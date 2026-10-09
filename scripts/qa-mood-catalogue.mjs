/**
 * Proves the seeded check-in catalogue is usable by the student, with the
 * student's OWN gateway token — not the admin's, and not the app's client.
 *
 * Checks the three things the check-in will depend on:
 *   1. the fifteen moods are readable and filterable by category;
 *   2. a check-in write round-trips — up to three moods in ONE `MoodHistory`
 *      row, each with its own 2/5/8 intensity — and can be read back and
 *      deleted. Nothing survives the run;
 *   3. the three questions behind the reasons and sleep screens are readable,
 *      carry their emoji, and sort into the order the arc and grid expect.
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD.
 *
 * Run:
 *   cd lti-server-test
 *   node --env-file=<creds> --env-file=.env scripts/qa-mood-catalogue.mjs
 */
const GW = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_STUDENT_EMAIL
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD
const CATEGORY = 'daily_checkin'
/** The three level stops, low → high. Locked 2026-09-29. */
const LEVELS = [2, 5, 8]

if (!GW || !EMAIL || !PASSWORD) {
  console.error('need BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD')
  process.exit(1)
}

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
  const body = await r.json()
  if (body.errors?.length) throw new Error(`${body.errors[0].extensions?.code ?? '?'}: ${body.errors[0].message}`)
  return body.data
}

const { login } = await gql(
  'mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}',
  { e: EMAIL, p: PASSWORD },
)
const T = login.token
const USER = login.user_id
console.log(`\nstudent ${EMAIL} (${USER})\n`)

console.log('catalogue')
const { listMoodCategories } = await gql('query{listMoodCategories{categories{id identifier}}}', {}, T)
const cat = listMoodCategories.categories.find((c) => c.identifier === CATEGORY)
check(`category "${CATEGORY}" is readable by the student`, Boolean(cat))
if (!cat) process.exit(1)

const { listMoods } = await gql(
  'query($c:String){listMoods(category:$c){moods{id identifier label order color text_color description}}}',
  { c: cat.id },
  T,
)
const moods = listMoods.moods
check('returns exactly 15 moods', moods.length === 15, `got ${moods.length}`)
check('every identifier is checkin_*', moods.every((m) => m.identifier.startsWith('checkin_')))
check('orders are 1..15 with no gaps', JSON.stringify([...moods.map((m) => m.order)].sort((a, b) => a - b)) === JSON.stringify([...Array(15)].map((_, i) => i + 1)))
check('every mood carries a colour and a description', moods.every((m) => m.color && m.description))

console.log('\ncheck-in write')
const picked = ['checkin_okay', 'checkin_tired', 'checkin_curious'].map((id) => moods.find((m) => m.identifier === id))
check('the three test moods exist', picked.every(Boolean))
if (!picked.every(Boolean)) process.exit(1)

const entries = picked.map((m, i) => ({ id: m.id, intensity: LEVELS[i] }))
const { createMoodHistory } = await gql(
  'mutation($i:CreateMoodHistoryInput!){createMoodHistory(input:$i){id}}',
  { i: { user: USER, moods: entries, note: 'qa-mood-catalogue' } },
  T,
)
check('one MoodHistory row holds all three emotions', Boolean(createMoodHistory.id))

const { getMoodHistory } = await gql(
  'query($id:ID!){getMoodHistory(id:$id){id user note moods{id intensity}}}',
  { id: createMoodHistory.id },
  T,
)
check('read back belongs to this student', getMoodHistory.user === USER)
check('all three entries survived', getMoodHistory.moods.length === 3, `got ${getMoodHistory.moods.length}`)
check(
  'each intensity round-tripped exactly',
  entries.every((e) => getMoodHistory.moods.find((m) => m.id === e.id)?.intensity === e.intensity),
  JSON.stringify(getMoodHistory.moods),
)
check('the note is stored (the create response echoes "" — a known defect)', getMoodHistory.note === 'qa-mood-catalogue', JSON.stringify(getMoodHistory.note))

const { listMoodHistory } = await gql(
  'query($u:String){listMoodHistory(user:$u,page_size:10){mood_histories{id}}}',
  { u: USER },
  T,
)
check('the row appears in the student’s own history', listMoodHistory.mood_histories.some((h) => h.id === createMoodHistory.id))

console.log('\nquestions')
const questionsIn = async (category) => {
  const d = await gql(
    'query($c:String){listQuestions(category:$c,pageSize:50){questions{id label category type order status max_selections options{label value emoji order}}}}',
    { c: category },
    T,
  )
  return d.listQuestions.questions
}

const reasons = (await questionsIn('mood_reason')).find((q) => q.order === 1)
check('mood_reason order 1 is readable by the student', Boolean(reasons))
check('it is the MULTISELECT the screen reads', reasons?.type === 'MULTISELECT', reasons?.type)
check('it caps at 3 — the screen must stop a fourth chip', reasons?.max_selections === 3, String(reasons?.max_selections))
check('it has 8 options, one per grid cell', reasons?.options?.length === 8, `got ${reasons?.options?.length}`)
check('every option carries an emoji', reasons?.options?.every((o) => o.emoji))

const other = (await questionsIn('mood_reason')).find((q) => q.order === 2)
check('the "Add other" OPEN companion exists at mood_reason order 2', Boolean(other))
check('it is OPEN — a MULTISELECT cannot take a novel reason', other?.type === 'OPEN', other?.type)
check('it has no options (the gateway refuses them on OPEN)', (other?.options?.length ?? 0) === 0)

const sleepQs = await questionsIn('sleep')
const sleep = sleepQs.find((q) => q.order === 2)
check('our sleep-quality question exists at sleep order 2', Boolean(sleep))
check('the platform’s duration question at order 1 is untouched', sleepQs.some((q) => q.order === 1 && q.options?.length === 7))
check('it is SELECT_ONE with 7 stops', sleep?.type === 'SELECT_ONE' && sleep?.options?.length === 7, `${sleep?.type}/${sleep?.options?.length}`)
check('every stop carries a face', sleep?.options?.every((o) => o.emoji))
check(
  'stops sort worst → best, so a client sorting by order gets the arc',
  JSON.stringify([...(sleep?.options ?? [])].sort((a, b) => a.order - b.order).map((o) => o.value)) ===
    JSON.stringify(['terrible', 'hard_to_fall_asleep', 'not_great', 'okay', 'pretty_good', 'slept_well', 'woke_up_feeling_great']),
)

console.log('\ncleanup')
await gql('mutation($id:ID!){deleteMoodHistory(id:$id){id}}', { id: createMoodHistory.id }, T)
const after = await gql('query($u:String){listMoodHistory(user:$u,page_size:50){mood_histories{id}}}', { u: USER }, T)
check('no mood history left behind', !after.listMoodHistory.mood_histories.some((h) => h.id === createMoodHistory.id))

console.log(failures ? `\n${failures} check(s) FAILED\n` : '\nall checks passed\n')
process.exit(failures ? 1 : 0)
