/**
 * What the gateway's Mood domain actually is — read first, then the one thing
 * no document states: the accepted range of `MoodEntryInput.intensity`.
 *
 * Read phase: the seeded catalogue (`listMoodCategories`, `listMoods`) and the
 * read shapes of `Mood` / `MoodHistory` / `MoodEntry` (one `__type` per
 * request — aliased selections return null on this gateway).
 *
 * Write phase (`--write`): `createMoodHistory` with a spread of intensities,
 * each row deleted again immediately. Nothing survives the run.
 *
 * Measured 2026-09-29: **intensity is 0..10** — `-1` and `11` are refused
 * (`INTERNAL_ERROR`, not a validation error). `note` is stored but the create
 * response echoes `""` for it; read it back with `getMoodHistory`.
 *
 * Env: BP_AI_GRAPHQL_URL, and an account to log in with —
 *   BP_AI_PROBE_EMAIL / BP_AI_PROBE_PASSWORD, or bp-admin's
 *   BP_ADMIN_TEST_EMAIL / BP_ADMIN_TEST_PASSWORD.
 */

const GW = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_PROBE_EMAIL ?? process.env.BP_ADMIN_TEST_EMAIL
const PASSWORD = process.env.BP_AI_PROBE_PASSWORD ?? process.env.BP_ADMIN_TEST_PASSWORD
const WRITE = process.argv.includes('--write')

if (!GW || !EMAIL || !PASSWORD) {
  console.error('need BP_AI_GRAPHQL_URL + an email/password pair')
  process.exit(1)
}

async function gql(query, variables, token) {
  const r = await fetch(GW, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  })
  const body = await r.json()
  if (body.errors?.length) {
    const e = new Error(body.errors[0].message)
    e.code = body.errors[0].extensions?.code
    throw e
  }
  return body.data
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

const { login: session } = await gql(
  'mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}',
  { e: EMAIL, p: PASSWORD },
)
const T = session.token
console.log(`logged in as ${EMAIL} (user_id ${session.user_id})\n`)

// ── the catalogue ──────────────────────────────────────────────────────────
const cats = await gql('query{listMoodCategories{categories{id label identifier order platform}}}', {}, T)
console.log('mood categories:')
for (const c of cats.listMoodCategories.categories) {
  console.log(`  ${String(c.order).padStart(2)}  ${c.identifier.padEnd(14)} ${JSON.stringify(c.label)}  platform=${c.platform}  id=${c.id}`)
}

const moods = await gql(
  'query{listMoods{moods{id identifier label order color text_color description category{identifier label} tips{title description link}}}}',
  {},
  T,
)
console.log(`\nmoods (${moods.listMoods.moods.length}) — first 6:`)
for (const m of moods.listMoods.moods.slice(0, 6)) {
  console.log(`  ${String(m.order).padStart(2)}  ${m.identifier.padEnd(14)} ${m.label.padEnd(14)} cat=${m.category?.identifier ?? '—'} ${m.color}/${m.text_color} tips=${m.tips?.length ?? 0}`)
  if (m.description) console.log(`        "${m.description}"`)
  for (const t of m.tips ?? []) console.log(`        tip: ${t.title} — ${t.description} (${t.link})`)
}

// ── read shapes ────────────────────────────────────────────────────────────
for (const name of ['Mood', 'MoodHistory', 'MoodEntry']) {
  await pause(1500)
  const d = await gql(
    'query($n:String!){__type(name:$n){name fields{name description type{kind name ofType{kind name ofType{kind name}}}}}}',
    { n: name },
    T,
  )
  const t = d.__type
  console.log(`\ntype ${name}:`)
  if (!t) { console.log('  (null)'); continue }
  for (const f of t.fields ?? []) {
    const render = (x) => (!x ? '' : x.name ?? `${render(x.ofType)}${x.kind === 'NON_NULL' ? '!' : x.kind === 'LIST' ? '[]' : ''}`)
    console.log(`  ${f.name.padEnd(22)} ${render(f.type)}${f.description ? `   — ${f.description}` : ''}`)
  }
}

if (!WRITE) {
  console.log('\n(read-only; pass --write to probe the intensity range)')
  process.exit(0)
}

// ── the intensity range ────────────────────────────────────────────────────
const moodId = moods.listMoods.moods[0]?.id
if (!moodId) { console.log('\nno mood in the catalogue to point an entry at'); process.exit(0) }
console.log(`\nintensity probe against mood ${moods.listMoods.moods[0].identifier} (${moodId}):`)

for (const intensity of [-1, 0, 1, 5, 10, 11, 100]) {
  let created = null
  try {
    const d = await gql(
      'mutation($i:CreateMoodHistoryInput!){createMoodHistory(input:$i){id created_at moods{id intensity}}}',
      { i: { user: session.user_id, moods: [{ id: moodId, intensity }], note: 'probe' } },
      T,
    )
    created = d.createMoodHistory
    console.log(`  ${String(intensity).padStart(4)}  ACCEPTED  → ${JSON.stringify(created.moods)}`)
  } catch (e) {
    console.log(`  ${String(intensity).padStart(4)}  REFUSED   ${e.code ?? ''} ${e.message}`)
  }
  if (created?.id) {
    try {
      await gql('mutation($id:ID!){deleteMoodHistory(id:$id){id}}', { id: created.id }, T)
    } catch (e) {
      console.log(`        ⚠ could not delete ${created.id}: ${e.message}`)
    }
  }
}
