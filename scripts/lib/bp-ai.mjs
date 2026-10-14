/**
 * The gateway calls the QA scripts make on their own behalf.
 *
 * Deliberately separate from `app/lib/bp-ai/*`: a QA script that reused the
 * app's client would prove the app agrees with itself. These read the truth
 * back with their **own** token, so a screen that never wrote anything cannot
 * pass by reporting success.
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD.
 */

const GW = process.env.BP_AI_GRAPHQL_URL

export async function gql(query, variables, token) {
  const r = await fetch(GW, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  })
  const body = await r.json()
  if (body.errors?.length) throw new Error(body.errors[0].message)
  return body.data
}

/** Sign in to the gateway directly — returns the student's own token. */
export async function login(email, password) {
  const { login: session } = await gql(
    'mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}',
    { e: email, p: password },
  )
  return session
}

/**
 * The question with this stable `key`, with its options — or `undefined`.
 *
 * It took `(category, order)` until step-9, which is the selector the app
 * itself used to carry: the ids are minted per tenant, so a QA script could
 * only address a row by its position. A position is not a name — `onboarding`
 * order 1 is an archived row — so this asks by `key` and lets the server
 * filter the archived ones out.
 */
export async function question(token, key) {
  const { listQuestions } = await gql(
    'query($k:[String!]){listQuestions(keys:$k,status:ACTIVE,pageSize:1){questions{id key label type order display max_selections options{id label value emoji imageUrl order}}}}',
    { k: [key] },
    token,
  )
  return listQuestions.questions[0]
}

/**
 * Every live mini-survey of this student.
 *
 * Kept for the assertions that are about ABSENCE — "no stray mini-survey was
 * written for a journal prompt" — which need the whole list. To find the answer
 * to one question use `answersFor`: scanning this list for a `question_id` is
 * the client-side upsert's read, and it only ever saw one page.
 */
export async function miniSurveys(token, userId) {
  const { listMiniSurveys } = await gql(
    'query($u:String){listMiniSurveys(user:$u,page_size:50){mini_surveys{id questionId completed_at responses{question_id answer option_ids score}}}}',
    { u: userId },
    token,
  )
  return listMiniSurveys.mini_surveys
}

/**
 * This student's live answers to ONE question — normally zero or one row.
 *
 * It took no question and paged everything until step-10, and the QA scripts
 * then scanned each survey's responses in memory, which is exactly what the app
 * did wrong: one page of 100, oldest first. `listMiniSurveys(questionId:)` is
 * the server's filter, and it matches the legacy rows too.
 *
 * Returning the LIST and not the first row is deliberate: "how many rows does
 * this student have for this question" is the assertion that catches a
 * duplicate, and a helper that returned one would hide it.
 */
export async function answersFor(token, userId, questionId) {
  const { listMiniSurveys } = await gql(
    'query($u:String,$q:ID){listMiniSurveys(user:$u,questionId:$q,page_size:50){mini_surveys{id questionId completed_at responses{question_id answer option_ids score}}}}',
    { u: userId, q: questionId },
    token,
  )
  return listMiniSurveys.mini_surveys
}

/** The single response to `questionId` inside a row, if it is there. */
export function responseIn(survey, questionId) {
  return survey?.responses?.find((r) => r.question_id === questionId) ?? null
}

/** Answer a catalogue question the way the app does: one mutation. */
export async function answerQuestion(token, userId, { questionId, optionIds, answer }) {
  const { answerQuestion: payload } = await gql(
    'mutation($i:AnswerQuestionInput!){answerQuestion(input:$i){created survey{id}}}',
    { i: { user: userId, questionId, ...(optionIds ? { optionIds } : {}), ...(answer ? { answer } : {}) } },
    token,
  )
  return payload
}

/**
 * This student's journal entries, newest first.
 *
 * `page_size` caps at 100 server-side, unlike `listMiniSurveys`' 500.
 */
export async function journals(token, userId) {
  const { listJournals } = await gql(
    'query($u:String){listJournals(user:$u,page_size:50){journals{id title content question_ids}}}',
    { u: userId },
    token,
  )
  return listJournals.journals
}

/** The journal entry written against `questionId`, if there is one. */
export function journalFor(entries, questionId) {
  return entries.find((j) => j.question_ids?.includes(questionId)) ?? null
}

// Two scanners lived here: they walked a page of surveys looking for
// the one answering a question, which is the client-side upsert's read. The
// server filters now — see `answersFor` above.

/**
 * Sign in to the *app* and return its session cookie.
 *
 * The app's own login, not the gateway's: the loaders read the sealed session
 * cookie, and a screen tested with a bare gateway token would never exercise
 * the path a browser takes.
 */
export async function appSessionCookie(base, email, password) {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual',
  })
  return (res.headers.getSetCookie().find((c) => c.startsWith('bp-session=')) ?? '').split(';')[0]
}
