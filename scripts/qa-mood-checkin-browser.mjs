/**
 * The whole check-in, in a real browser, from the picker to the hub.
 *
 * `qa-mood-catalogue.mjs` proves the gateway contract with `fetch`; it cannot
 * prove that a student clicking through the five screens produces the same
 * write. This does: it drives headless Chrome, clicks three emotions, walks the
 * detail arcs, picks reasons, sets the sleep stop, finishes — then reads the
 * `MoodHistory` row and the mini-survey answers back **with its own gateway
 * token**, so a screen that silently recorded nothing cannot pass.
 *
 * Every row it creates is deleted before it exits.
 *
 * Needs the app running (`npm run dev`, or a built server) and the check-in
 * catalogue seeded — `scripts/bp-ai-seed-moods.ts` and
 * `scripts/bp-ai-seed-onboarding-questions.ts`.
 *
 * Run:
 *   node --env-file=<creds> --env-file=.env scripts/qa-mood-checkin-browser.mjs
 *
 * Env: QA_BASE (default http://localhost:3011), BP_AI_GRAPHQL_URL,
 *      BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD.
 */
import { appSessionCookie, gql, login, miniSurveys } from './lib/bp-ai.mjs'
import { createChecklist, openBrowser, sleep } from './lib/browser.mjs'

const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const EMAIL = process.env.BP_AI_STUDENT_EMAIL
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD

if (!process.env.BP_AI_GRAPHQL_URL || !EMAIL || !PASSWORD) {
  console.error('need BP_AI_GRAPHQL_URL, BP_AI_STUDENT_EMAIL, BP_AI_STUDENT_PASSWORD')
  process.exit(1)
}

/** The three the run picks, in pick order. */
const PICKS = ['okay', 'tired', 'curious']
const { check, finish } = createChecklist()

/**
 * Which screen is showing, by its position among the `.mc-screen` wrappers.
 *
 * The orchestrator moves `.active` between stable wrappers rather than mounting
 * and unmounting them, so identity is positional. `-1` while a transition is
 * mid-flight and nothing holds the class.
 */
const activeIndex = (browser) =>
  browser
    .evaluate('[...document.querySelectorAll(".mc-screen")].findIndex((e) => e.classList.contains("active"))')
    .catch(() => -1)

/**
 * Click Next and wait for the screen to actually change.
 *
 * **Not a fixed sleep, and not a wait for the next screen's selector.** The
 * outgoing wrapper keeps `.active` for the length of its own hand-tuned
 * transition, so a poll for "is a detail screen showing?" matches the screen
 * being *left* and Next gets clicked on it a second time — which silently
 * skips a screen. Waiting for the index to move is the only reliable signal.
 */
const clickNext = async (browser, selector = '.mc-screen.active .mc-btn-next', tries = 60) => {
  const from = await activeIndex(browser)
  await browser.evaluate(`document.querySelector("${selector}").click()`)
  for (let i = 0; i < tries; i++) {
    await sleep(150)
    const now = await activeIndex(browser)
    if (now !== -1 && now !== from) return now
  }
  return -1
}

/** Wait for `selector` to belong to the screen currently showing. */
const waitForScreen = async (browser, selector, tries = 40) => {
  for (let i = 0; i < tries; i++) {
    await sleep(150)
    try {
      if (await browser.evaluate(`!!document.querySelector(".mc-screen.active ${selector}")`)) return true
    } catch {
      // A running transition can tear down the execution context; retry.
    }
  }
  return false
}

const moodHistory = async (token, userId) => {
  const d = await gql(
    'query($u:String){listMoodHistory(user:$u,page_size:50){mood_histories{id created_at moods{id intensity}}}}',
    { u: userId },
    token,
  )
  return d.listMoodHistory.mood_histories
}

const { token, user_id: userId } = await login(EMAIL, PASSWORD)

// Everything that existed before the run — so the row this run creates can be
// told apart from whatever the account already had.
const historyBefore = new Set((await moodHistory(token, userId)).map((h) => h.id))
const surveysBefore = new Set((await miniSurveys(token, userId)).map((s) => s.id))

const cookie = await appSessionCookie(BASE, EMAIL, PASSWORD)
const browser = await openBrowser()
let created = null

try {
  await browser.setCookie(cookie)
  await browser.navigate(`${BASE}/student/mood-checkin`)

  const hydrated = await browser.waitForHydration('.mc-grid')
  check('the picker hydrates', hydrated)
  if (!hydrated) throw new Error('never hydrated — is the app running on ' + BASE + '?')

  const tiles = await browser.evaluate('document.querySelectorAll(".mc-em-btn").length')
  check('the grid still draws all fifteen tiles', tiles === 15, `got ${tiles}`)

  // Pick three, in order, by their stable data-key.
  for (const key of PICKS) {
    await browser.evaluate(`document.querySelector('.mc-em-btn[data-key="${key}"]').click()`)
    await sleep(120)
  }
  const selected = await browser.evaluate('document.querySelectorAll(".mc-em-btn.sel").length')
  check('three emotions are selected', selected === 3, `got ${selected}`)

  const maxed = await browser.evaluate('document.querySelector(".mc-grid").classList.contains("maxed")')
  check('the grid dims once maxed — a fourth pick is refused', maxed === true)

  await clickNext(browser, '.mc-btn-continue')

  // One detail screen per picked emotion. Leave each arc where it opens except
  // the first, which is dragged to the low stop so a non-default intensity is
  // proved to travel.
  for (let i = 0; i < PICKS.length; i++) {
    const onDetail = await waitForScreen(browser, '.mc-ed-slider-wrap')
    check(`detail screen ${i + 1} is showing`, onDetail)
    if (i === 0) {
      // ArrowLeft, not Home. `ArcSlider` implements only ArrowLeft/Right, and
      // an unhandled Home press wedges the flow outright — Next stops
      // advancing (measured 2026-09-29, pre-existing; the component has never
      // handled Home/End). One press takes the default middle stop to the low
      // one, so this emotion records 2 while the other two record 5.
      await browser.evaluate('document.querySelector(".mc-screen.active [role=slider]").focus()')
      await browser.pressKey('ArrowLeft', 37)
      await sleep(300)
    }
    await clickNext(browser)
  }

  const onWhy = await waitForScreen(browser, '.mc-why-grid')
  check('the reasons screen follows the last emotion', onWhy)

  const chips = await browser.evaluate('document.querySelectorAll(".mc-screen.active .mc-why-block:not(.mc-why-block--add)").length')
  check('the reasons grid is eight cells', chips === 8, `got ${chips}`)

  // Four clicks, three selections — the fourth must be refused by the cap.
  for (let i = 0; i < 4; i++) {
    await browser.evaluate(
      `document.querySelectorAll(".mc-screen.active .mc-why-block:not(.mc-why-block--add)")[${i}].click()`,
    )
    await sleep(120)
  }
  const chosen = await browser.evaluate('document.querySelectorAll(".mc-screen.active .mc-why-block.sel").length')
  check('a fourth reason is refused — max_selections is 3', chosen === 3, `got ${chosen}`)

  await clickNext(browser)

  const onSleep = await waitForScreen(browser, '.mc-sleep-slider-wrap')
  check('the sleep screen follows the reasons', onSleep)

  // Three presses from the default stop 3 reach stop 6, which is
  // distinguishable from the default in the recorded answer. ArrowRight for the
  // same reason as ArrowLeft above.
  await browser.evaluate('document.querySelector(".mc-screen.active [role=slider]").focus()')
  for (let i = 0; i < 3; i++) {
    await browser.pressKey('ArrowRight', 39)
    await sleep(200)
  }
  await sleep(300)
  await clickNext(browser)

  const onDone = await waitForScreen(browser, '.mc-done-blob')
  check('the done screen is reached', onDone)

  await browser.evaluate('document.querySelector(".mc-done-cta .mc-btn-next").click()')
  await sleep(1800)

  const posted = browser.requests.filter((r) => r.url.includes('/api/mood-checkin') && r.method === 'POST')
  check('the browser POSTed /api/mood-checkin', posted.length === 1, `${posted.length} posts`)

  const errors = browser.consoleErrors.filter((e) => !e.includes('favicon'))
  check('no console errors during the flow', errors.length === 0, errors.slice(0, 2).join(' | '))

  // ── the gateway's own account of what happened ──────────────────────────
  await sleep(700)
  const after = await moodHistory(token, userId)
  const fresh = after.filter((h) => !historyBefore.has(h.id))
  check('exactly one new MoodHistory row', fresh.length === 1, `got ${fresh.length}`)
  created = fresh[0] ?? null

  if (created) {
    check('it holds all three emotions', created.moods.length === 3, `got ${created.moods.length}`)
    const intensities = created.moods.map((m) => m.intensity).sort((a, b) => a - b)
    check(
      'the dragged arc recorded 2 and the untouched ones 5',
      JSON.stringify(intensities) === JSON.stringify([2, 5, 5]),
      JSON.stringify(intensities),
    )
  }

  const surveys = await miniSurveys(token, userId)
  const freshSurveys = surveys.filter((s) => !surveysBefore.has(s.id))
  const responses = freshSurveys.flatMap((s) => s.responses ?? [])
  check('the reasons answer reached the gateway', responses.some((r) => (r.option_ids ?? []).length === 3))
  check('the sleep answer reached the gateway', responses.some((r) => (r.option_ids ?? []).length === 1))
} finally {
  browser.close()
  if (created) {
    await gql('mutation($id:ID!){deleteMoodHistory(id:$id){id}}', { id: created.id }, token).catch(() => {})
  }
  const leftover = (await moodHistory(token, userId)).filter((h) => !historyBefore.has(h.id))
  check('no mood history left behind', leftover.length === 0, `${leftover.length} rows`)
}

process.exit(finish())
