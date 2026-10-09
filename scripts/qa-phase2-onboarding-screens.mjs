// Phase 2 QA harness: mint a Learner LTI session JWT and fetch the four onboarding routes,
// asserting expected DOM markers / headline strings. Mirrors the pattern in
// qa-admin-redirect.mjs.
//
// Usage:  node scripts/qa-phase2-onboarding-screens.mjs

import { SignJWT } from 'jose'
import { readFileSync } from 'node:fs'

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const ltiKey = env.match(/^LTI_KEY=(.+)$/m)?.[1].trim()
if (!ltiKey) {
  console.error('LTI_KEY not found in .env')
  process.exit(1)
}

const secret = new TextEncoder().encode(ltiKey)

const token = {
  platformContext: {
    roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
    custom: {},
    user: 'qa-student-1',
  },
}

const jwt = await new SignJWT({ token })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('5m')
  .sign(secret)

const base = 'http://localhost:3030'
const routes = [
  '/student/onboarding/welcome',
  '/student/onboarding/privacy-intro',
  '/student/onboarding/avatar',
]

let failed = 0

for (const r of routes) {
  const url = `${base}${r}?lti_session=${encodeURIComponent(jwt)}`
  const resp = await fetch(url, { redirect: 'manual' })
  const html = await resp.text()
  console.log(`\n=== ${r} → ${resp.status} (${html.length} bytes) ===`)

  if (resp.status !== 200) {
    console.error(`  FAIL: expected 200, got ${resp.status}`)
    failed++
    continue
  }

  if (r.endsWith('/welcome')) {
    const okHeadline = html.includes('This space is for you')
    const okAnton = html.includes('--font-student-display')
    console.log('  "This space is for you":', okHeadline)
    console.log('  Anton font-family var:', okAnton)
    if (!okHeadline || !okAnton) failed++
  } else if (r.endsWith('/privacy-intro')) {
    // Look for the Radix Progress markers — either role="progressbar" or a translateX transform on indicator.
    const okProgress = html.includes('role="progressbar"') || html.includes('translateX(-')
    const okYourSpace = html.includes('Your space')
    console.log('  progress bar present:', okProgress)
    console.log('  "Your space":', okYourSpace)
    if (!okProgress || !okYourSpace) failed++
  } else if (r.endsWith('/avatar')) {
    const ariaCheckedCount = (html.match(/aria-checked=/g) || []).length
    const okHead = html.includes('Select your avatar')
    console.log('  aria-checked count:', ariaCheckedCount, '(expect ≥ 4)')
    console.log('  "Select your avatar":', okHead)
    if (ariaCheckedCount < 4 || !okHead) failed++
  }
}

console.log(failed === 0 ? '\nQA PASS' : `\nQA FAIL (${failed} routes)`)
process.exit(failed === 0 ? 0 : 1)
