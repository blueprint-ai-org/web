// Phase 3 QA harness: mint a Learner LTI session JWT and fetch the four new onboarding routes,
// asserting expected DOM markers / headline strings. Mirrors qa-phase2-onboarding-screens.mjs.
//
// Usage:  node scripts/qa-phase3-onboarding-screens.mjs

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
  '/student/onboarding/baseline-mood',
  '/student/onboarding/helpers',
  '/student/onboarding/trusted-person',
  '/student/onboarding/complete',
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

  if (r.endsWith('/baseline-mood')) {
    // baseline-mood was rebuilt to render the reusable <MoodGauge> in a slot
    // marked data-testid="mood-dial" (the old free-standing ".mood-slider" class
    // no longer exists post-rebuild — commit e5588e3).
    const okSliderClass = html.includes('data-testid="mood-dial"')
    const okAnton = html.includes('--font-student-display')
    const okHeadline = html.includes('How do you feel the most of the time')
    console.log('  "mood-dial" testid marker:', okSliderClass)
    console.log('  Anton font-family var:', okAnton)
    console.log('  Headline text:', okHeadline)
    if (!okSliderClass || !okAnton || !okHeadline) failed++
  } else if (r.endsWith('/helpers')) {
    const labels = ['A good sleep', 'Friends', 'A good meal', 'Sport', 'Art/Music', 'A good talk']
    const labelHits = labels.filter((l) => html.includes(l))
    // Headline renders on two lines (split by <br/>): "What helps you " / "feel good?".
    const okHeadline = html.includes('What helps you') && html.includes('feel good?')
    console.log('  helper labels found:', labelHits.length, '/', labels.length, `(${labelHits.join(', ')})`)
    console.log('  Headline text:', okHeadline)
    if (labelHits.length < 6 || !okHeadline) failed++
  } else if (r.endsWith('/trusted-person')) {
    // 7 trusted-person blocks — each rendered as a button with data-testid="trusted-option-…".
    const blockCount = (html.match(/data-testid="trusted-option-/g) || []).length
    const okHeadline = html.includes('Is there someone that makes things easier for you')
    console.log('  trusted-option blocks:', blockCount, '(expect 7)')
    console.log('  Headline text:', okHeadline)
    if (blockCount !== 7 || !okHeadline) failed++
  } else if (r.endsWith('/complete')) {
    const okHeadline = html.includes('Setup completed')
    const okCta = html.includes('Get started')
    console.log('  "Setup completed" headline:', okHeadline)
    console.log('  "Get started" CTA:', okCta)
    if (!okHeadline || !okCta) failed++
  }
}

console.log(failed === 0 ? '\nQA PASS' : `\nQA FAIL (${failed} routes)`)
process.exit(failed === 0 ? 0 : 1)
