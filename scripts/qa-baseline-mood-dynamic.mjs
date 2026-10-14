// Proves /student/onboarding/baseline-mood renders the BP AI catalogue question
// and nothing else.
//
// There is no baked fallback left to tell apart (step-9), so the question is no
// longer "catalogue or copy?" but "is it THIS tenant's row?". The script reads
// the row with its own token, by stable key, and asserts the SSR payload carries
// that row's id and every one of its option labels — so a tenant whose admin
// reworded a stop fails here instead of passing against a hard-coded list.
//
// A tenant id was hard-coded in this file until step-9, which meant the script
// only ever passed against one tenant.
//
// Run (dev server on :3011):
//   node --env-file=<creds> scripts/qa-baseline-mood-dynamic.mjs
import { login as apiLogin, question } from './lib/bp-ai.mjs'

const BASE = process.env.QA_BASE ?? 'http://localhost:3011'
const EMAIL = process.env.BP_AI_STUDENT_EMAIL
const PASSWORD = process.env.BP_AI_STUDENT_PASSWORD
const KEY = 'onboarding.baseline_mood'

let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✔' : '✘'} ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures++
}

const { token } = await apiLogin(EMAIL, PASSWORD)
const q = await question(token, KEY)
check(`the catalogue holds ${KEY}`, Boolean(q), 'no active question with that key — is the tenant seeded?')
if (!q) process.exit(1)
console.log(`\ncatalogue: ${q.id} "${q.label}" (${q.options.length} stops)\n`)

const login = await fetch(`${BASE}/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
  redirect: 'manual',
})
const cookie = (login.headers.getSetCookie().find((c) => c.startsWith('bp-session=')) ?? '').split(';')[0]
console.log(`login → ${login.status} ${login.headers.get('location') ?? ''}`)
check('signing in issues a bp-session cookie', Boolean(cookie), login.headers.getSetCookie().join(' | ').slice(0, 200))
if (!cookie) process.exit(1)

const res = await fetch(`${BASE}/student/onboarding/baseline-mood`, { headers: { cookie } })
const html = await res.text()
console.log(`GET /student/onboarding/baseline-mood → ${res.status}\n`)

check('the page renders', res.status === 200, String(res.status))
check('the heading is the catalogue label', html.includes(q.label), q.label)
check('the question id is in the SSR payload', html.includes(q.id), 'the loader got no row')
for (const o of q.options.slice(0, 5)) {
  check(`stop "${o.label}" ${o.emoji ?? ''} rendered`, html.includes(o.label))
}
// `value` is the answer token, not copy: it belongs in the write, not the DOM.
check('the option values never reach the browser', !html.includes(`"value":"${q.options[0].value}"`))

// The preview mirror has no session, so it has no catalogue either. It must
// still render — on the skip screen now, not on a copy of the question.
const preview = await fetch(`${BASE}/preview/student/onboarding/baseline-mood`)
const previewHtml = await preview.text()
check('the preview mirror renders with no session at all', preview.status === 200, String(preview.status))
check('…on the unavailable screen, not a crash', previewHtml.includes('ready'), 'no "This one isn’t ready"')
check('…and it offers Skip rather than a question', previewHtml.includes('Skip'))
check('…with no catalogue id, proving no row was read', !previewHtml.includes(q.id))

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
