// Can a STUDENT record their own answer? Measured, then cleaned up.
//
// `createMiniSurvey` carries no description, so unlike `setMyAvatar` there is
// no documented access gate — the only way to learn this is to call it. The
// probe writes one survey, reads it back, and deletes it.
import 'dotenv/config'

const E = process.env.BP_AI_GRAPHQL_URL!

async function gql(query: string, variables: Record<string, unknown>, token?: string) {
  const r = await fetch(E, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  })
  const b = (await r.json()) as any
  if (b.errors?.length) throw new Error(`${b.errors[0].extensions?.code ?? r.status}: ${b.errors[0].message}`)
  return b.data
}

async function main() {
  const { login } = await gql('mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}', {
    e: process.env.BP_AI_STUDENT_EMAIL,
    p: process.env.BP_AI_STUDENT_PASSWORD,
  })
  const { token, user_id } = login
  console.log(`\nstudent ${user_id}`)

  const { listQuestions } = await gql(
    'query{listQuestions(category:"onboarding",pageSize:50){questions{id label type order options{id label value order}}}}',
    {},
    token,
  )
  const q = listQuestions.questions.find((x: any) => x.order === 2)
  const option = q.options.find((o: any) => o.value === 'okay') ?? q.options[0]
  console.log(`question "${q.label}" (${q.type})`)
  console.log(`answering "${option.label}" = ${option.value}\n`)

  // ── the write, as a student, for themselves ───────────────────────────────
  let created: any
  try {
    const res = await gql(
      `mutation($input: CreateMiniSurveyInput!) {
         createMiniSurvey(input: $input) { id user survey_type category completed_at }
       }`,
      {
        input: {
          user: user_id,
          survey_type: 'onboarding',
          category: 'onboarding',
          completed_at: new Date().toISOString(),
          responses: [
            {
              question: q.label,
              answer: option.label,
              question_id: q.id,
              option_ids: [option.id],
            },
          ],
        },
      },
      token,
    )
    created = res.createMiniSurvey
    console.log(`[1] createMiniSurvey as the STUDENT → ALLOWED`)
    console.log(`    ${JSON.stringify(created)}`)
  } catch (e) {
    console.log(`[1] createMiniSurvey as the STUDENT → REFUSED`)
    console.log(`    ${(e as Error).message}`)
    return
  }

  // ── does it read back? ────────────────────────────────────────────────────
  const { listMiniSurveys } = await gql(
    'query($u:String){listMiniSurveys(user:$u,page_size:20){mini_surveys{id survey_type completed_at responses{question answer question_id option_ids}}}}',
    { u: user_id },
    token,
  )
  console.log(`\n[2] listMiniSurveys → ${listMiniSurveys.mini_surveys.length} row(s)`)
  for (const m of listMiniSurveys.mini_surveys) console.log(`    ${JSON.stringify(m)}`)

  // ── clean up: this was a probe, not data ──────────────────────────────────
  try {
    await gql('mutation($id:ID!){deleteMiniSurvey(id:$id){id}}', { id: created.id }, token)
    console.log(`\n[3] deleteMiniSurvey → cleaned up`)
  } catch (e) {
    console.log(`\n[3] deleteMiniSurvey → ${(e as Error).message}`)
    console.log(`    LEFTOVER ROW: ${created.id}`)
  }
  console.log()
}

main().catch((e) => { console.error(`\nprobe failed: ${(e as Error).message}\n`); process.exit(1) })
