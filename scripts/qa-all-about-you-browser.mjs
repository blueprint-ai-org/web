/**
 * All-about-you's daily micro-survey question, in a real browser.
 *
 * Settles, against the live gateway and a running dev server:
 *  - the monster asks exactly the question `pickUnanswered` gives this student
 *    today from the `about_you` catalogue, never one already answered, and the
 *    same one after a reload;
 *  - the input matches the question's type, and answering it the way a student
 *    would (typing, or tapping options) enables Save;
 *  - Save posts to the route's action and still lands on the completed screen;
 *  - the gateway holds the answer against that question, with the picked
 *    option ids for a pick question and none for free text;
 *  - the next visit asks a different question; the `/preview` mirror asks it too;
 *  - every input type renders (via the dev-only `?question=` override).
 *
 * Every answer this script records is deleted at the end.
 *
 * Run (tsx, because the draw is imported from the app's own TS):
 *   cd lti-server-test
 *   npx tsx --env-file=<creds> scripts/qa-all-about-you-browser.mjs
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD, QA_BASE (default :3011).
 */

import { journalTopicSeed, pickUnanswered } from '../app/lib/student/journal-prompts.ts'

import { createChecklist, openBrowser, sleep } from './lib/browser.mjs'
import { appSessionCookie, gql, login, miniSurveys, responseFor, surveyFor } from './lib/bp-ai.mjs'

const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const { check, finish } = createChecklist()

const { token, user_id } = await login(process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
const { listQuestions } = await gql(
  'query{listQuestions(category:"about_you",pageSize:500){questions{id label type order status options{id label emoji order}}}}',
  {},
  token,
)
// The same rows the app can answer: active, a known type, a pick with options.
const catalogue = listQuestions.questions
  .filter((q) => q.status === 'active' && ['OPEN', 'SELECT_ONE', 'MULTISELECT'].includes(q.type))
  .filter((q) => q.type === 'OPEN' || q.options.length > 0)
  .sort((a, b) => a.order - b.order)
  .map((q) => ({ ...q, label: q.label.trim(), options: [...q.options].sort((a, b) => a.order - b.order) }))
check('the about_you catalogue is seeded', catalogue.length > 60, `${catalogue.length} answerable questions`)

const answeredIds = async () => new Set((await miniSurveys(token, user_id)).flatMap((s) => (s.responses ?? []).map((r) => r.question_id)))
const seed = `${journalTopicSeed(user_id, new Date())}|about`
const expectedFor = (answered) => pickUnanswered(catalogue, answered, new Set(), seed)

const first = expectedFor(await answeredIds())
console.log(`\nexpected question (${first.type}): ${first.label}\n`)

const cookie = await appSessionCookie(BASE, process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
check('signed in to the app', Boolean(cookie))

const TEXT = `QA all-about-you ${new Date().toISOString()}`
const recorded = []
const browser = await openBrowser()
const pageHas = (text) => browser.evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)
const path = () => browser.evaluate('location.pathname')
const saveEnabled = () => browser.evaluate(`!document.querySelector('.act-btn-save').disabled`)

/** Answer the on-screen question the way a student would; returns the option ids tapped. */
async function answer(q) {
  if (q.type === 'OPEN') {
    await browser.evaluate(`document.querySelector('textarea').focus()`)
    await browser.cdp.send('Input.insertText', { text: TEXT })
    return []
  }
  const taps = q.type === 'MULTISELECT' ? q.options.slice(0, 2) : [q.options[0]]
  const buttons = await browser.evaluate(`document.querySelectorAll('.act-chip,.act-emoji-btn').length`)
  check('…one button per option', buttons === q.options.length, `${buttons} buttons, ${q.options.length} options`)
  for (const o of taps) {
    const index = q.options.findIndex((x) => x.id === o.id)
    await browser.evaluate(`document.querySelectorAll('.act-chip,.act-emoji-btn')[${index}].click()`)
    await sleep(150)
  }
  return taps.map((o) => o.id)
}

try {
  await browser.setCookie(cookie)
  await browser.navigate(`${BASE}/student/all-about-you`)
  check('the screen rendered AND hydrated', await browser.waitForHydration('.act-btn-save'))
  check('the monster asks the expected unanswered question', await pageHas(first.label))
  check('…not the prototype’s line', !(await pageHas('Pick the emoji that best matches how you')))

  await browser.navigate(`${BASE}/student/all-about-you`)
  await browser.waitForHydration('.act-btn-save')
  check('a reload asks the same question', await pageHas(first.label))

  check('Save starts disabled', !(await saveEnabled()))
  const tapped = await answer(first)
  await sleep(300)
  check('answering enables Save', await saveEnabled())

  browser.requests.length = 0
  browser.responses.length = 0
  await browser.evaluate(`document.querySelector('.act-btn-save').click()`)
  await sleep(3000)
  const posts = browser.requests.filter((r) => r.method === 'POST')
  check('saving POSTed to the all-about-you route', posts.some((p) => p.url.includes('/student/all-about-you')), posts.map((p) => p.url.replace(BASE, '')).join(', '))
  const status = browser.responses.find((r) => posts.some((p) => p.url === r.url))?.status
  check('…and the app answered it', status !== undefined && status < 400, `status ${status}`)
  check('…and the student landed on the completed screen', (await path()) === '/student/completed', await path())

  const survey = surveyFor(await miniSurveys(token, user_id), first.id)
  if (survey) recorded.push(survey.id)
  const response = responseFor(survey, first.id)
  check('the answer is on the gateway against that question', Boolean(response))
  if (first.type === 'OPEN') {
    check('…with the typed text and no options', response?.answer === TEXT && (response?.option_ids ?? []).length === 0, JSON.stringify(response))
  } else {
    const stored = [...(response?.option_ids ?? [])].sort().join()
    check('…with exactly the tapped option ids', stored === [...tapped].sort().join(), `stored ${stored}`)
  }

  const second = expectedFor(await answeredIds())
  await browser.navigate(`${BASE}/student/all-about-you`)
  await browser.waitForHydration('.act-btn-save')
  check('the next visit asks a different question', second.id !== first.id && (await pageHas(second.label)), second.label)

  await browser.navigate(`${BASE}/preview/student/all-about-you`)
  check('the preview mirror rendered', await browser.waitForHydration('.act-btn-save'))
  check('…asking the same question', await pageHas(second.label))

  // Every input type renders, on demand.
  const sample = {
    'free text': catalogue.find((q) => q.type === 'OPEN'),
    'single pick (pills)': catalogue.find((q) => q.type === 'SELECT_ONE' && q.options.some((o) => o.label !== o.emoji && !/^\d+$/.test(o.label))),
    'number scale (circles)': catalogue.find((q) => q.options.length === 10 && q.options.every((o) => /^\d+$/.test(o.label))),
    'emoji grid (circles)': catalogue.find((q) => q.options.length > 0 && q.options.every((o) => o.label === o.emoji)),
    'multi pick (pills)': catalogue.find((q) => q.type === 'MULTISELECT'),
  }
  for (const [kind, q] of Object.entries(sample)) {
    await browser.navigate(`${BASE}/student/all-about-you?question=${q.id}`)
    await browser.waitForHydration('.act-btn-save')
    const shape = await browser.evaluate(`({ text: !!document.querySelector('textarea'), chips: document.querySelectorAll('.act-chip').length, circles: document.querySelectorAll('.act-emoji-btn').length })`)
    const ok =
      kind === 'free text' ? shape.text && shape.chips + shape.circles === 0
      : kind.includes('circles') ? shape.circles === q.options.length && shape.chips === 0
      : shape.chips === q.options.length && shape.circles === 0
    check(`${kind} renders as expected`, ok && (await pageHas(q.label)), JSON.stringify(shape))
  }

  // Whatever type today's draw was, record a pick question too, so both write
  // paths are exercised: text-only and option ids.
  const pickQ = first.type === 'OPEN' ? sample['multi pick (pills)'] : sample['free text']
  await browser.navigate(`${BASE}/student/all-about-you?question=${pickQ.id}`)
  await browser.waitForHydration('.act-btn-save')
  const pickTapped = await answer(pickQ)
  await sleep(300)
  await browser.evaluate(`document.querySelector('.act-btn-save').click()`)
  await sleep(3000)
  const pickSurvey = surveyFor(await miniSurveys(token, user_id), pickQ.id)
  if (pickSurvey) recorded.push(pickSurvey.id)
  const pickResponse = responseFor(pickSurvey, pickQ.id)
  if (pickQ.type === 'OPEN') {
    check(`a ${pickQ.type} answer is recorded with no options`, pickResponse?.answer === TEXT && (pickResponse?.option_ids ?? []).length === 0, JSON.stringify(pickResponse))
  } else {
    const stored = [...(pickResponse?.option_ids ?? [])].sort().join()
    check(`a ${pickQ.type} answer is recorded with exactly the tapped option ids`, stored === [...pickTapped].sort().join(), `stored ${stored} | answer "${pickResponse?.answer}"`)
    check('…and its labels as the readable answer', pickResponse?.answer === pickQ.options.filter((o) => pickTapped.includes(o.id)).map((o) => o.label).join(', '), pickResponse?.answer)
  }

  const pageErrors = browser.consoleErrors.filter((e) => !/vite|websocket/i.test(e))
  check('no console errors in the page', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
} finally {
  browser.close()
}

for (const id of recorded) {
  await gql('mutation($id:ID!){deleteMiniSurvey(id:$id){__typename}}', { id }, token).then(
    () => console.log(`\n(QA answer ${id} deleted from the gateway)`),
    (e) => console.log(`\n! could not delete QA survey ${id}: ${e.message}`),
  )
}

process.exit(finish())
