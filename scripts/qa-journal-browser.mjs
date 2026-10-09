/**
 * The journal home's topics, and the topic route, in a real browser.
 *
 * Settles, against the live gateway and a running dev server:
 *  - the two circles show today's draw from the `journal` catalogue — the exact
 *    pair `pickPrompts` gives for this student and day, not baked copy — and a
 *    reload shows the same pair;
 *  - tapping a circle runs the FLIP and lands on `/journal/prompt/<id>` with
 *    the home still mounted underneath and no loader round trip;
 *  - writing and saving POSTs to that route's action, and the answer reaches
 *    the gateway as a `journal` mini-survey against the prompt's id;
 *  - closing returns to `/journal`, where the answer shows as a card;
 *  - a link to a prompt outside today's draw opens it, a bogus id lands on the
 *    route's error boundary, and the `/preview` mirror draws the same topics.
 *
 * The QA answer is deleted from the gateway at the end.
 *
 * Run (tsx, because the draw is imported from the app's own TS):
 *   cd lti-server-test
 *   npx tsx --env-file=<creds> scripts/qa-journal-browser.mjs
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD, QA_BASE (default :3011).
 */

import { journalDay, pickPrompts } from '../app/lib/student/journal-prompts.ts'

import { createChecklist, openBrowser, sleep } from './lib/browser.mjs'
import { appSessionCookie, gql, login, miniSurveys, responseFor, surveyFor } from './lib/bp-ai.mjs'

const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const { check, finish } = createChecklist()

const { token, user_id } = await login(process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
const { listQuestions } = await gql(
  'query{listQuestions(category:"journal",pageSize:500){questions{id label type status}}}',
  {},
  token,
)
const catalogue = listQuestions.questions
  .filter((q) => q.status === 'active' && q.type === 'OPEN')
  .map((q) => ({ id: q.id, label: q.label.trim() }))
check('the journal catalogue is seeded', catalogue.length > 2, `${catalogue.length} active prompts`)

const expected = pickPrompts(catalogue, `${user_id}|${journalDay(new Date())}`, 2)
const outside = catalogue.find((p) => !expected.some((e) => e.id === p.id))
console.log(`\ntoday's draw:\n  1. ${expected[0].label}\n  2. ${expected[1].label}\n`)

const cookie = await appSessionCookie(BASE, process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
check('signed in to the app', Boolean(cookie))

const ANSWER = `QA journal answer ${new Date().toISOString()}`
const browser = await openBrowser()
const circleTexts = () => browser.evaluate(`[...document.querySelectorAll('.j-question-circle p')].map((p) => p.textContent.trim())`)
const path = () => browser.evaluate('location.pathname')
const pageHas = (text) => browser.evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)
const clickButton = (label) =>
  browser.evaluate(`(() => {
    // Visible only: the home keeps a hidden "Write" button for the FLIP.
    const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent !== null && x.textContent.trim() === ${JSON.stringify(label)});
    if (!b) return false;
    b.click();
    return true;
  })()`)

try {
  await browser.setCookie(cookie)
  // A clean slate: answers from an earlier run would turn the circles into cards.
  await browser.navigate(`${BASE}/student/journal`)
  await browser.waitForHydration('.j-question-circle')
  await browser.evaluate('sessionStorage.clear(); localStorage.clear()')

  await browser.navigate(`${BASE}/student/journal`)
  check('the journal rendered AND hydrated', await browser.waitForHydration('.j-question-circle'))
  const shown = await circleTexts()
  check('the circles show the catalogue draw, not baked copy', shown[0] === expected[0].label && shown[1] === expected[1].label, JSON.stringify(shown))

  await browser.navigate(`${BASE}/student/journal`)
  await browser.waitForHydration('.j-question-circle')
  check('a reload shows the same two topics', JSON.stringify(await circleTexts()) === JSON.stringify(shown))

  browser.requests.length = 0
  browser.responses.length = 0
  await browser.evaluate(`document.querySelectorAll('.j-question-circle')[0].click()`)
  await sleep(1500) // the FLIP is 800 ms
  check('the circle opened its prompt route', (await path()) === `/student/journal/prompt/${expected[0].id}`, await path())
  check('…with the home still mounted underneath', await browser.evaluate(`!!document.querySelector('[data-testid=journal-home] h1')`))
  check('…and the overlay showing the prompt', await pageHas(expected[0].label))
  const loads = browser.requests.filter((r) => r.method === 'GET' && r.url.includes('.data'))
  check('…without a loader round trip', loads.length === 0, loads.map((r) => r.url.replace(BASE, '')).join(', '))

  check('Write was pressed', await clickButton('Write'))
  await sleep(500)
  await browser.evaluate(`document.querySelector('textarea').focus()`)
  await browser.cdp.send('Input.insertText', { text: ANSWER })
  await sleep(300)
  browser.requests.length = 0
  browser.responses.length = 0
  check('Save was pressed', await clickButton('Save'))
  await sleep(3000)

  const posts = browser.requests.filter((r) => r.method === 'POST')
  check('saving POSTed to the prompt route', posts.some((p) => p.url.includes(`/student/journal/prompt/${expected[0].id}`)), posts.map((p) => p.url.replace(BASE, '')).join(', '))
  const status = browser.responses.find((r) => posts.some((p) => p.url === r.url))?.status
  check('…and the app answered it', status !== undefined && status < 400, `status ${status}`)
  check('"Note saved!" showed', await pageHas('Note saved!'))
  // An action revalidates every route that does not opt out — `_persona`'s
  // layout loader still does, which is not this screen's to change. What must
  // not reload is the journal home, whose loader reads the whole catalogue.
  const reloads = browser.requests.filter(
    (r) => r.method === 'GET' && r.url.includes('.data') && /_routes=[^&]*student\.journal(%2C|&|$)/.test(r.url),
  )
  check('…and the home did not re-read the catalogue', reloads.length === 0, reloads.map((r) => r.url.replace(BASE, '')).join(', '))

  check('"Yes, a bit!" was pressed', await clickButton('Yes, a bit!'))
  await sleep(800)
  check('closing returned to the journal', (await path()) === '/student/journal', await path())
  check('…where the answer shows as a card', await pageHas(ANSWER))

  await browser.navigate(`${BASE}/student/journal/prompt/${outside.id}`)
  await browser.waitForHydration('.j-question-circle')
  await sleep(500)
  check('a link to a prompt outside today’s draw opens it', await pageHas(outside.label))

  await browser.navigate(`${BASE}/student/journal/prompt/not-a-prompt`)
  await browser.waitForHydration('.j-question-circle')
  await sleep(500)
  check('a bogus id lands on the route’s error boundary', await pageHas('This topic isn’t available right now.'))
  check('…with the home still drawn behind it', await browser.evaluate(`!!document.querySelector('.j-question-circle')`))

  await browser.navigate(`${BASE}/preview/student/journal`)
  check('the preview mirror rendered', await browser.waitForHydration('.j-question-circle'))
  check('…with the same topics', JSON.stringify(await circleTexts()) === JSON.stringify(shown))

  // The error boundary logs on purpose; everything else would be a fault.
  const pageErrors = browser.consoleErrors.filter((e) => !/vite|websocket|journal\/prompt|not in today/i.test(e))
  check('no unexpected console errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
} finally {
  browser.close()
}

const survey = surveyFor(await miniSurveys(token, user_id), expected[0].id)
const response = responseFor(survey, expected[0].id)
check('the answer is on the gateway', response?.answer === ANSWER, `stored "${response?.answer}"`)
check('…against the prompt’s id, with no options', Array.isArray(response?.option_ids) && response.option_ids.length === 0)

if (survey) {
  const { getMiniSurvey } = await gql('query($id:ID!){getMiniSurvey(id:$id){survey_type category}}', { id: survey.id }, token).catch(() => ({}))
  if (getMiniSurvey) check('…tagged as a journal survey', getMiniSurvey.survey_type === 'journal', JSON.stringify(getMiniSurvey))
  await gql('mutation($id:ID!){deleteMiniSurvey(id:$id){__typename}}', { id: survey.id }, token).then(
    () => console.log('\n(QA answer deleted from the gateway)'),
    (e) => console.log(`\n! could not delete QA survey ${survey.id}: ${e.message}`),
  )
}

process.exit(finish())
