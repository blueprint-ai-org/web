/**
 * Write-it-out's journal prompt, in a real browser.
 *
 * Settles, against the live gateway and a running dev server:
 *  - the monster asks exactly the prompt `pickUnanswered` gives this student
 *    today: never one they have answered, never one of today's journal topics,
 *    and the same one after a reload;
 *  - Save posts to the route's action and still lands on the completed screen;
 *  - the note reaches the gateway as a **Journal** against that prompt — the
 *    only write that publishes `journal-created` and so the only one the
 *    analysis ever sees — and NOT as a `journal` mini-survey;
 *  - the next visit asks a different prompt, the one the new answered set gives;
 *  - the `/preview` mirror asks it too.
 *
 * Every journal entry this script records is deleted at the end.
 *
 * Run (tsx, because the draw is imported from the app's own TS):
 *   cd lti-server-test
 *   npx tsx --env-file=<creds> scripts/qa-write-it-out-browser.mjs
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD, QA_BASE (default :3011).
 */

import { journalTopicSeed, pickPrompts, pickUnanswered } from '../app/lib/student/journal-prompts.ts'

import { createChecklist, openBrowser, sleep } from './lib/browser.mjs'
import { appSessionCookie, gql, journalFor, journals, login, miniSurveys } from './lib/bp-ai.mjs'

const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const { check, finish } = createChecklist()

const { token, user_id } = await login(process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
const { listQuestions } = await gql(
  'query{listQuestions(category:"journal",type:OPEN,status:ACTIVE,pageSize:500){questions{id label}}}',
  {},
  token,
)
// `status: ACTIVE` + `type: OPEN` are the server's since step-9.
const catalogue = listQuestions.questions.map((q) => ({ id: q.id, label: q.label.trim() }))

// Both shapes, like the loader: journals since the switch to `createJournal`,
// `journal` mini-surveys from before it.
const answeredIds = async () =>
  new Set([
    ...(await miniSurveys(token, user_id)).flatMap((s) => (s.responses ?? []).map((r) => r.question_id)),
    ...(await journals(token, user_id)).flatMap((j) => j.question_ids ?? []),
  ])
const seed = journalTopicSeed(user_id, new Date())
const todaysTopics = new Set(pickPrompts(catalogue, seed, 2).map((p) => p.id))
const expectedFor = (answered) => pickUnanswered(catalogue, answered, todaysTopics, `${seed}|write`)

const answeredBefore = await answeredIds()
const first = expectedFor(answeredBefore)
check('there is an unanswered prompt to ask', Boolean(first) && !answeredBefore.has(first.id))
check('…and it is not one of today’s journal topics', !todaysTopics.has(first.id))
console.log(`\nexpected prompt: ${first.label}\n`)

const cookie = await appSessionCookie(BASE, process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
check('signed in to the app', Boolean(cookie))

const ANSWER = `QA write-it-out ${new Date().toISOString()}`
const recorded = []
const browser = await openBrowser()
const bubble = () => browser.evaluate(`document.querySelector('textarea')?.closest('div')?.parentElement?.innerText ?? document.body.innerText`)
const pageHas = (text) => browser.evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)
const path = () => browser.evaluate('location.pathname')

try {
  await browser.setCookie(cookie)
  await browser.navigate(`${BASE}/student/write-it-out`)
  check('the screen rendered AND hydrated', await browser.waitForHydration('textarea'))
  check('the monster asks the expected unanswered prompt', await pageHas(first.label), (await bubble()).slice(0, 200))
  check('…not the prototype’s line', !(await pageHas('Journaling helps you slow down')))

  await browser.navigate(`${BASE}/student/write-it-out`)
  await browser.waitForHydration('textarea')
  check('a reload asks the same prompt', await pageHas(first.label))

  await browser.evaluate(`document.querySelector('textarea').focus()`)
  await browser.cdp.send('Input.insertText', { text: ANSWER })
  await sleep(300)
  browser.requests.length = 0
  browser.responses.length = 0
  const saved = await browser.evaluate(`(() => {
    const b = document.querySelector('.act-btn-save');
    if (!b || b.disabled) return false;
    b.click();
    return true;
  })()`)
  check('Save was pressed', saved === true)
  await sleep(3000)

  const posts = browser.requests.filter((r) => r.method === 'POST')
  check('saving POSTed to the write-it-out route', posts.some((p) => p.url.includes('/student/write-it-out')), posts.map((p) => p.url.replace(BASE, '')).join(', '))
  const status = browser.responses.find((r) => posts.some((p) => p.url === r.url))?.status
  check('…and the app answered it', status !== undefined && status < 400, `status ${status}`)
  check('…and the student still landed on the completed screen', (await path()) === '/student/completed', await path())

  const entry = journalFor(await journals(token, user_id), first.id)
  if (entry) recorded.push(entry.id)
  check('the note is on the gateway as a Journal against that prompt',
    entry?.content === ANSWER && entry?.title === first.label,
    `title ${JSON.stringify(entry?.title)} content ${JSON.stringify(entry?.content)}`)
  // The regression this step exists to prevent: a note stored as a mini-survey
  // is never published to `journal-created`, so `agent` never analyses it.
  const strayMiniSurvey = (await miniSurveys(token, user_id)).some(
    (s) => (s.responses ?? []).some((r) => r.question_id === first.id && r.answer === ANSWER),
  )
  check('…and NOT as a mini-survey', !strayMiniSurvey)

  const answeredAfter = await answeredIds()
  const second = expectedFor(answeredAfter)
  check('the answered set now holds the prompt', answeredAfter.has(first.id))
  await browser.navigate(`${BASE}/student/write-it-out`)
  await browser.waitForHydration('textarea')
  check('the next visit asks a different prompt', second && second.id !== first.id && (await pageHas(second.label)) && !(await pageHas(first.label)))

  await browser.navigate(`${BASE}/preview/student/write-it-out`)
  check('the preview mirror rendered', await browser.waitForHydration('textarea'))
  check('…asking the same prompt', await pageHas(second.label))

  const pageErrors = browser.consoleErrors.filter((e) => !/vite|websocket/i.test(e))
  check('no console errors in the page', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
} finally {
  browser.close()
}

for (const id of recorded) {
  await gql('mutation($id:ID!){deleteJournal(id:$id){__typename}}', { id }, token).then(
    () => console.log(`\n(QA journal ${id} deleted from the gateway)`),
    (e) => console.log(`\n! could not delete QA journal ${id}: ${e.message}`),
  )
}

process.exit(finish())
