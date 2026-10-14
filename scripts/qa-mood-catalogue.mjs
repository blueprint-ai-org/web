/**
 * Proves the seeded check-in catalogue is usable by the student, with the
 * student's OWN gateway token — not the admin's, and not the app's client.
 *
 * Checks the three things the check-in depends on:
 *   1. `listMoods(curatedOnly: true)` answers the whole grid in ONE call —
 *      fifteen curated categories, each with a triad of levels 1/2/3;
 *   2. a check-in write round-trips, and **the SERVER sets the intensity**: the
 *      client sends only the mood it picked, and a level-3 mood stores 8 even
 *      when the request says 1. The row reads back and is deleted; nothing
 *      survives the run;
 *   3. the three questions behind the reasons and sleep screens are readable,
 *      carry their emoji, and sort into the order the arc and grid expect.
 *
 * Rewritten for step-8. What it used to assert and no longer does: the
 * `checkin_` prefix on every mood identifier (gone — the uniqueness scope is
 * `(category, identifier)`), the `daily_checkin` single category (replaced by
 * the fifteen), and the `note: ""` echo on create (fixed, and asserted below as
 * the echo it should always have been).
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
/** What the SERVER stores for each triad level. Its table, not ours. */
const INTENSITY_BY_LEVEL = { 1: 2, 2: 5, 3: 8 }

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
const { listMoods } = await gql(
  `query { listMoods(curatedOnly: true) { moods {
     id identifier label level emoji color secondaryColor chips order
     category { id identifier label order }
   } } }`,
  {},
  T,
)
const moods = listMoods.moods
check('returns 45 moods — fifteen tiles × a triad', moods.length === 45, `got ${moods.length}`)
check('every mood carries a level in 1..3', moods.every((m) => [1, 2, 3].includes(m.level)))
check('every mood resolves its category', moods.every((m) => m.category?.id))
check('every mood carries an emoji and a colour', moods.every((m) => m.emoji && m.color))

const tiles = new Map()
for (const m of moods) {
  const t = tiles.get(m.category.id) ?? { identifier: m.category.identifier, order: m.category.order, levels: [] }
  t.levels.push(m.level)
  tiles.set(m.category.id, t)
}
check('fifteen distinct categories', tiles.size === 15, `got ${tiles.size}`)
check(
  'each has exactly levels 1,2,3',
  [...tiles.values()].every((t) => JSON.stringify([...t.levels].sort()) === '[1,2,3]'),
)
check(
  'the grid orders are 1..15 with no gaps',
  JSON.stringify([...new Set([...tiles.values()].map((t) => t.order))].sort((a, b) => a - b)) ===
    JSON.stringify([...Array(15)].map((_, i) => i + 1)),
)
// One call, ordered for painting: the app used to fetch this and re-sort it in
// the browser.
check(
  'the moods arrive ordered by (category.order, level)',
  JSON.stringify(moods.map((m) => [m.category.order, m.level])) ===
    JSON.stringify([...moods].sort((a, b) => a.category.order - b.category.order || a.level - b.level).map((m) => [m.category.order, m.level])),
)

console.log('\ncheck-in write')
// A level-3 mood and a level-1 mood, so the derivation is visible in both
// directions.
const high = moods.find((m) => m.level === 3)
const low = moods.find((m) => m.level === 1 && m.category.id !== high?.category.id)
check('found a level-3 and a level-1 mood in different tiles', Boolean(high && low))
if (!high || !low) process.exit(1)

const { createMoodHistory } = await gql(
  'mutation($i:CreateMoodHistoryInput!){createMoodHistory(input:$i){id note moods{id intensity category valence}}}',
  // `intensity: 1` on the level-3 mood ON PURPOSE: the server must ignore it.
  { i: { user: USER, moods: [{ id: high.id, intensity: 1 }, { id: low.id }], note: 'qa-mood-catalogue' } },
  T,
)
check('one MoodHistory row holds both moods', createMoodHistory.moods?.length === 2)
check(
  'the server DERIVED the intensity from the level, ignoring the client',
  createMoodHistory.moods?.find((m) => m.id === high.id)?.intensity === INTENSITY_BY_LEVEL[3],
  JSON.stringify(createMoodHistory.moods),
)
check(
  'and for the level-1 mood, which sent none at all',
  createMoodHistory.moods?.find((m) => m.id === low.id)?.intensity === INTENSITY_BY_LEVEL[1],
)
check('the create response ECHOES the note (it used to answer "")', createMoodHistory.note === 'qa-mood-catalogue', JSON.stringify(createMoodHistory.note))
check('each entry copied its category', createMoodHistory.moods?.every((m) => m.category))

const { getMoodHistory } = await gql(
  'query($id:ID!){getMoodHistory(id:$id){id user note moods{id intensity}}}',
  { id: createMoodHistory.id },
  T,
)
check('read back belongs to this student', getMoodHistory.user === USER)
check('both entries survived', getMoodHistory.moods.length === 2, `got ${getMoodHistory.moods.length}`)
check('the stored note is the note', getMoodHistory.note === 'qa-mood-catalogue')

console.log('\nrefusals')
// An intensity out of range used to come back as a bare INTERNAL_ERROR from a
// Mongo validator, naming neither the entry nor the field.
let refused = null
try {
  await gql(
    'mutation($i:CreateMoodHistoryInput!){createMoodHistory(input:$i){id}}',
    { i: { user: USER, moods: [{ id: low.id, intensity: 11 }] } },
    T,
  )
} catch (e) {
  refused = String(e.message)
}
// `low` has a level, so its intensity is ignored rather than validated — the
// range only applies to a mood without one. Either answer is correct; what must
// not happen is an INTERNAL_ERROR.
check('an out-of-range intensity is never an INTERNAL_ERROR', !refused?.includes('INTERNAL_ERROR'), refused ?? '(accepted and ignored)')

let empty = null
try {
  await gql(
    'mutation($i:CreateMoodHistoryInput!){createMoodHistory(input:$i){id}}',
    { i: { user: USER, moods: [] } },
    T,
  )
} catch (e) {
  empty = String(e.message)
}
check('an empty check-in is refused as BAD_REQUEST', empty?.includes('BAD_REQUEST'), empty ?? '(accepted!)')

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
