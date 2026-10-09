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

/** The onboarding question at `order`, with its options. */
export async function onboardingQuestion(token, order) {
  const { listQuestions } = await gql(
    'query{listQuestions(category:"onboarding",pageSize:50){questions{id label type order max_selections options{id label value order}}}}',
    {},
    token,
  )
  return listQuestions.questions.find((q) => q.order === order)
}

/** Every mini-survey belonging to `userId`, with the responses on each. */
export async function miniSurveys(token, userId) {
  const { listMiniSurveys } = await gql(
    'query($u:String){listMiniSurveys(user:$u,page_size:50){mini_surveys{id completed_at responses{question_id answer option_ids score}}}}',
    { u: userId },
    token,
  )
  return listMiniSurveys.mini_surveys
}

/** The survey holding this student's answer to `questionId`, if there is one. */
export function surveyFor(surveys, questionId) {
  return surveys.find((s) => s.responses?.some((r) => r.question_id === questionId)) ?? null
}

export function responseFor(survey, questionId) {
  return survey?.responses?.find((r) => r.question_id === questionId) ?? null
}

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
