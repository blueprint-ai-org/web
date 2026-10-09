// Proves /student/onboarding/baseline-mood renders the BP AI catalogue question
// rather than its baked fallback.
//
// The two carry the SAME text on purpose — the catalogue row was seeded from
// the fallback — so asserting on the label proves nothing. The question's `id`
// is minted by the gateway and exists only on the catalogue path: the fallback
// returns `question: null`. So the id in the SSR payload is the proof.
//
// Run (dev server on :3011):
//   node --env-file=<creds> scripts/qa-baseline-mood-dynamic.mjs
const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const EMAIL = process.env.BP_AI_STUDENT_EMAIL
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD

let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✔' : '✘'} ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures++
}

const login = await fetch(`${BASE}/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
  redirect: 'manual',
})
const cookie = (login.headers.getSetCookie().find((c) => c.startsWith('bp-session=')) ?? '').split(';')[0]
console.log(`\nlogin → ${login.status} ${login.headers.get('location') ?? ''}`)
check('signing in issues a bp-session cookie', Boolean(cookie), login.headers.getSetCookie().join(' | ').slice(0, 200))
if (!cookie) process.exit(1)

const res = await fetch(`${BASE}/student/onboarding/baseline-mood`, { headers: { cookie } })
const html = await res.text()
console.log(`GET /student/onboarding/baseline-mood → ${res.status}\n`)

check('the page renders', res.status === 200, String(res.status))
check('the heading is on the page', html.includes('How do you feel most days?'))
check(
  'it came from the CATALOGUE — the seeded question id is in the payload',
  html.includes('dc0c6ff3-d6be-42ce-a018-ca669c1a20fc'),
  'no question id in the SSR payload: the loader fell back to baked copy',
)
for (const [emoji, label] of [['😞', 'Bad'], ['😕', 'Ugh'], ['😐', 'Okay'], ['🙂', 'Good'], ['😄', 'Great']]) {
  check(`stop "${label}" ${emoji} rendered`, html.includes(label) && html.includes(emoji))
}
check('the option values never reach the browser', !html.includes('"value":"okay"'))

// The preview mirror has no session, so it must still render — on the fallback.
const preview = await fetch(`${BASE}/preview/student/onboarding/baseline-mood`)
const previewHtml = await preview.text()
check('the preview mirror renders with no session at all', preview.status === 200, String(preview.status))
check('…on the baked fallback, not a crash', previewHtml.includes('How do you feel most days?'))
check(
  '…and with no catalogue id, proving the fallback path is the one taken',
  !previewHtml.includes('dc0c6ff3-d6be-42ce-a018-ca669c1a20fc'),
)

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
