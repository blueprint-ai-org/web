/**
 * The QA both multi-select onboarding screens need, in one place.
 *
 * `helpers` and `trusted-person` ask different questions with different art and
 * answer through the same loader/action/`bpRecordAnswer` shape, so they are
 * worth proving the same way rather than twice: once over HTTP, once through a
 * real browser. Each screen's script is a few lines naming its slug, its place
 * in the catalogue and the selector its options are drawn with.
 *
 * Both halves assert on gateway-minted **ids** and read the truth back with
 * their own token. Catalogue text and fallback text are identical on purpose,
 * so a label proves nothing about whether anything was fetched.
 */

import { createChecklist, openBrowser, sleep } from './browser.mjs'
import { appSessionCookie, gql, login, miniSurveys, onboardingQuestion, responseFor, surveyFor } from './bp-ai.mjs'

const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const EMAIL = process.env.BP_AI_STUDENT_EMAIL
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD

/**
 * @typedef {object} Screen
 * @property {string} slug            route segment under `/student/onboarding/`
 * @property {number} order           its place in the `onboarding` category
 * @property {string} optionSelector  what one selectable option is drawn as
 */

/** Drive the action over HTTP: the answer, a changed answer, and an empty one. */
export async function httpQa(screen) {
  const { check, finish } = createChecklist()
  const { token, user_id } = await login(EMAIL, PASSWORD)
  const q = await onboardingQuestion(token, screen.order)
  check(`the catalogue holds the ${screen.slug} question`, Boolean(q), `nothing at onboarding/order ${screen.order}`)
  check('…as a MULTISELECT', q?.type === 'MULTISELECT', q?.type)
  check('…with a cap matching its options', q?.max_selections === q?.options.length, `${q?.options.length} options, max ${q?.max_selections}`)

  // Clean slate for THIS question only — the other answers are somebody else's rows.
  const existing = surveyFor(await miniSurveys(token, user_id), q.id)
  if (existing) await gql('mutation($id:ID!){deleteMiniSurvey(id:$id){id}}', { id: existing.id }, token)

  const cookie = await appSessionCookie(BASE, EMAIL, PASSWORD)
  check('signed in to the app', Boolean(cookie))

  const page = await fetch(`${BASE}/student/onboarding/${screen.slug}`, { headers: { cookie } })
  const html = await page.text()
  check('the screen renders', page.status === 200, String(page.status))
  check('it is driven by the catalogue — the question id is in the payload', html.includes(q.id))
  check('…and so are the option ids it needs to answer with', q.options.every((o) => html.includes(o.id)))

  /** The action's own shape: repeated `optionIds` fields, one per choice. */
  const post = (options) => {
    const body = new URLSearchParams({
      questionId: q.id,
      question: q.label,
      answer: options.map((o) => o.label).join(', '),
    })
    for (const o of options) body.append('optionIds', o.id)
    return fetch(`${BASE}/student/onboarding/${screen.slug}`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'manual',
    })
  }

  const two = [q.options[1], q.options[q.options.length - 1]]
  const first = await post(two)
  check('the action accepts a two-option answer', first.status === 200 || first.status === 204, String(first.status))

  let survey = surveyFor(await miniSurveys(token, user_id), q.id)
  let answer = responseFor(survey, q.id)
  check('the answer is on the gateway', Boolean(survey))
  check('…carrying both option ids, and only those', answer?.option_ids?.length === 2 && two.every((o) => answer.option_ids.includes(o.id)), JSON.stringify(answer?.option_ids))
  check('…and a readable answer a reader needs no join for', answer?.answer === two.map((o) => o.label).join(', '), answer?.answer)

  // Going back and changing the selection must REPLACE, not accumulate.
  const firstId = survey?.id
  const three = [q.options[0], q.options[2], q.options[4]]
  await post(three)
  const surveys = await miniSurveys(token, user_id)
  survey = surveyFor(surveys, q.id)
  answer = responseFor(survey, q.id)
  check('changing the selection does not create a second survey', surveys.filter((s) => s.responses?.some((r) => r.question_id === q.id)).length === 1)
  check('…it updates the same row', survey?.id === firstId)
  check('…and the stored answer is the new selection', answer?.option_ids?.length === 3 && three.every((o) => answer.option_ids.includes(o.id)), JSON.stringify(answer?.option_ids))

  // An empty selection is not an answer. The screen never submits one; the
  // action refuses it rather than asking the gateway to reject it.
  const empty = await post([])
  check('an empty selection is refused', empty.status === 200 || empty.status === 204, String(empty.status))
  const afterEmpty = responseFor(surveyFor(await miniSurveys(token, user_id), q.id), q.id)
  check('…and leaves the stored answer untouched', afterEmpty?.option_ids?.length === 3, JSON.stringify(afterEmpty?.option_ids))

  const preview = await fetch(`${BASE}/preview/student/onboarding/${screen.slug}`)
  check('the preview mirror still renders with no session', preview.status === 200, String(preview.status))

  return finish()
}

/** Drive the screen in a real browser: click options, press Next, read it back. */
export async function browserQa(screen) {
  const { check, finish } = createChecklist()
  const { token, user_id } = await login(EMAIL, PASSWORD)
  const q = await onboardingQuestion(token, screen.order)
  const before = surveyFor(await miniSurveys(token, user_id), q.id)
  const stored = responseFor(before, q.id)
  console.log(`\nbefore: answered ${before ? `"${stored.answer}" at ${before.completed_at}` : 'never'}\n`)

  // Pick a pair that is not what is already stored — re-recording the same
  // answer is indistinguishable from not recording at all.
  const storedIds = new Set(stored?.option_ids ?? [])
  const picks = q.options.map((_, i) => i).filter((i) => !storedIds.has(q.options[i].id)).slice(0, 2)
  check('there are two unstored options to pick', picks.length === 2, `${picks.length}`)
  const chosen = picks.map((i) => q.options[i])

  const cookie = await appSessionCookie(BASE, EMAIL, PASSWORD)
  check('signed in to the app', Boolean(cookie))

  const browser = await openBrowser()
  try {
    await browser.setCookie(cookie)
    await browser.navigate(`${BASE}/student/onboarding/${screen.slug}`)
    check('the screen rendered AND hydrated in the browser', await browser.waitForHydration(screen.optionSelector))

    const inPage = (id) => browser.evaluate(`document.documentElement.outerHTML.includes(${JSON.stringify(id)})`)
    check('the browser is looking at the catalogue question, not baked copy', await inPage(q.id), 'question id absent from the page')
    const optionIdsPresent = await Promise.all(q.options.map((o) => inPage(o.id)))
    check('…and the option ids it must answer with are there', optionIdsPresent.every(Boolean))
    const drawn = await browser.evaluate(`document.querySelectorAll('${screen.optionSelector}').length`)
    check('every catalogue option is drawn', drawn === q.options.length, `${drawn} drawn, ${q.options.length} in the catalogue`)

    for (const i of picks) {
      await browser.evaluate(`document.querySelectorAll('${screen.optionSelector}')[${i}].click()`)
      await sleep(250)
    }
    const selected = await browser.evaluate(`[...document.querySelectorAll('${screen.optionSelector}')].map((c, i) => (c.classList.contains('sel') ? i : -1)).filter((i) => i >= 0)`)
    check('the options the student clicked are the ones marked chosen', JSON.stringify(selected) === JSON.stringify(picks), JSON.stringify(selected))

    // Picking must not write. The answer is recorded on Next, so a student
    // changing their mind leaves one row, not one per click.
    const midway = surveyFor(await miniSurveys(token, user_id), q.id)
    check('picking alone wrote nothing', !before || midway?.completed_at === before.completed_at, 'a click reached the gateway')

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

    const pageErrors = browser.consoleErrors.filter((e) => !/vite|websocket/i.test(e))
    check('no console errors in the page', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
    if (browser.consoleErrors.length > pageErrors.length) {
      console.log('    ! Vite HMR is not connected on this server — open tabs will not pick up code changes')
    }
  } finally {
    browser.close()
  }

  const after = surveyFor(await miniSurveys(token, user_id), q.id)
  const answer = responseFor(after, q.id)
  check('the answer is on the gateway', Boolean(after))
  check('…carrying both chosen option ids, and only those',
    answer?.option_ids?.length === chosen.length && chosen.every((o) => answer.option_ids.includes(o.id)),
    JSON.stringify(answer?.option_ids))
  check('…and the readable answer names both', answer?.answer === chosen.map((o) => o.label).join(', '), answer?.answer)
  if (before) check('…in the same row, updated in place', after?.id === before.id, 'a second survey was created')

  console.log(`\nafter: answer "${answer?.answer}" at ${after?.completed_at}`)
  return finish()
}
