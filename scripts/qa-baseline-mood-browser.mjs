/**
 * Drives `baseline-mood` in a REAL browser and proves the answer reaches the
 * gateway — the one path `qa-baseline-mood-answer.mjs` cannot cover, because
 * that script POSTs the action with `fetch`.
 *
 * On 2026-09-28 a save made by hand in a browser did not land while the
 * scripted POST did, which left three candidates: a stale bundle (the dev
 * server's HMR socket was orphaned), a session that is not a BP one (the loader
 * then hands the screen `question: null`, the screen bakes its copy and Next
 * has nothing to record — silently, by design), or a broken fetcher. This tells
 * them apart by watching the network from inside the page.
 *
 * It asserts on gateway-minted ids and on the row the gateway hands back with
 * its own token, never on the label — catalogue text and fallback text are
 * identical on purpose, so a label proves nothing.
 *
 * Run: node --env-file=<creds> scripts/qa-baseline-mood-browser.mjs
 *      QA_BASE=http://localhost:3011 (default)
 */

import { createChecklist, openBrowser, sleep } from './lib/browser.mjs'
import { appSessionCookie, login, miniSurveys, onboardingQuestion, responseFor, surveyFor } from './lib/bp-ai.mjs'

const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const { check, finish } = createChecklist()

const { token, user_id } = await login(process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
const q = await onboardingQuestion(token, 2)
const before = surveyFor(await miniSurveys(token, user_id), q.id)
const stored = responseFor(before, q.id)
console.log(`\nbefore: answered ${before ? `"${stored.answer}" at ${before.completed_at}` : 'never'}\n`)

// The arc opens on stop 2. Answer with a *different* stop than the one already
// stored — re-recording the same answer looks identical to not recording at
// all — and walk there with arrow keys, one press per stop.
const storedIndex = q.options.findIndex((o) => stored?.option_ids?.includes(o.id))
const targetIndex = [3, 4, 1, 0].find((i) => i !== storedIndex)
const target = q.options[targetIndex]
const arrowKey = targetIndex > 2 ? 'ArrowRight' : 'ArrowLeft'
check('the target answer differs from what is already stored', targetIndex !== storedIndex, `${stored?.answer} → ${target.label}`)

const cookie = await appSessionCookie(BASE, process.env.BP_AI_STUDENT_EMAIL, process.env.BP_AI_STUDENT_PASSWORD)
check('signed in to the app', Boolean(cookie))

const browser = await openBrowser()
try {
  await browser.setCookie(cookie)
  await browser.navigate(`${BASE}/student/onboarding/baseline-mood`)
  check('the screen rendered AND hydrated in the browser', await browser.waitForHydration('[role=slider]'))

  // Asked inside the page: the SSR payload is far too big to hand back over CDP.
  const inPage = (id) => browser.evaluate(`document.documentElement.outerHTML.includes(${JSON.stringify(id)})`)
  check('the browser is looking at the catalogue question, not baked copy', await inPage(q.id), 'question id absent from the page')
  const optionIdsPresent = await Promise.all(q.options.map((o) => inPage(o.id)))
  check('…and the option ids it must answer with are there', optionIdsPresent.every(Boolean))

  // A student moving the arc, then pressing Next.
  const arcValue = () => browser.evaluate(`document.querySelector('[role=slider]')?.getAttribute('aria-valuenow')`)
  await browser.evaluate(`document.querySelector('[role=slider]').focus()`)
  for (let i = 0; i < Math.abs(targetIndex - 2); i++) {
    await browser.pressKey(arrowKey, arrowKey === 'ArrowRight' ? 39 : 37)
    await sleep(500)
  }
  check('the arc responded to the student', (await arcValue()) === String(targetIndex), `expected stop ${targetIndex}`)

  // Moving the arc must NOT write: the answer is recorded on Next, deliberately,
  // or a student exploring the scale writes a row per wiggle.
  const midway = surveyFor(await miniSurveys(token, user_id), q.id)
  check('moving the arc alone wrote nothing', !before || midway?.completed_at === before.completed_at, 'a drag reached the gateway')

  browser.requests.length = 0
  browser.responses.length = 0
  const clicked = await browser.evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Next');
    if (!b) return false;
    b.click();
    return true;
  })()`)
  check('Next was pressed', clicked === true)
  await sleep(3000)

  const posts = browser.requests.filter((r) => r.method === 'POST')
  check('pressing Next made the browser POST', posts.length > 0, 'no POST left the page — the fetcher never fired')
  if (posts.length) {
    console.log(`    → ${posts.map((p) => p.url.replace(BASE, '')).join(', ')}`)
    const status = browser.responses.find((r) => posts.some((p) => p.url === r.url))?.status
    check('…and the app answered it', status !== undefined && status < 400, `status ${status}`)
  }

  // Vite's HMR socket is noise here, and worth its own line: when it cannot
  // connect, a tab opened before the last server start is running a stale
  // bundle and will keep running it. That is a dev-server fault, not a page one.
  const pageErrors = browser.consoleErrors.filter((e) => !/vite|websocket/i.test(e))
  check('no console errors in the page', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
  if (browser.consoleErrors.length > pageErrors.length) {
    console.log('    ! Vite HMR is not connected on this server — open tabs will not pick up code changes')
  }
} finally {
  browser.close()
}

const surveys = await miniSurveys(token, user_id)
const after = surveyFor(surveys, q.id)
const answer = responseFor(after, q.id)
check('the answer is on the gateway', Boolean(after))
check('…it is what the browser chose', answer?.answer === target.label, `stored "${answer?.answer}", expected "${target.label}"`)
check('…recorded against the option id, not just a label', answer?.option_ids?.includes(target.id))
if (before) check('…in the same row, updated in place', after?.id === before.id, 'a second survey was created')

console.log(`\nafter: answer "${answer?.answer}" at ${after?.completed_at}`)
process.exit(finish())
