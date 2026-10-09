// QA harness for the rebuilt Helpers onboarding screen (Phase 3).
//
// Mints a Learner LTI session JWT (same approach as
// qa-phase3-onboarding-screens.mjs), fetches /student/onboarding/helpers, and
// asserts the Phase-2 SSR DOM markers. Prints a per-marker PASS/FAIL line and
// exits non-zero if any assertion fails. Self-contained and re-runnable.
//
// Boot the dev server first (it listens on PORT from .env = 3030).
// Usage:  node scripts/qa-helpers-screen.mjs

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
const route = '/student/onboarding/helpers'

const url = `${base}${route}?lti_session=${encodeURIComponent(jwt)}`
const resp = await fetch(url, { redirect: 'manual' })
const html = await resp.text()
console.log(`\n=== ${route} → ${resp.status} (${html.length} bytes) ===`)

let failed = 0

function assert(label, ok) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${label}`)
  if (!ok) failed++
}

if (resp.status !== 200) {
  console.error(`  FAIL: expected 200, got ${resp.status}`)
  process.exit(1)
}

// 1 — step attribute that OnboardingLayout stamps on the stage.
assert('data-onboarding-step="helpers"', html.includes('data-onboarding-step="helpers"'))

// 2 — headline renders on two lines (split by <br/>): "What helps you " / "feel good?".
assert('headline "What helps you" + "feel good?"', html.includes('What helps you') && html.includes('feel good?'))

// 3 — six HelperCard buttons, each a toggle exposing aria-pressed.
const ariaPressedCount = (html.match(/aria-pressed=/g) || []).length
assert(`6 aria-pressed card buttons (found ${ariaPressedCount})`, ariaPressedCount === 6)

// 4 — all six helper labels present (rendered uppercase by CSS, text is mixed-case).
const labels = ['A good sleep', 'Friends', 'A good meal', 'Sport', 'Art/Music', 'A good talk']
const labelHits = labels.filter((l) => html.includes(l))
assert(`all six labels (found ${labelHits.length}/6: ${labelHits.join(', ')})`, labelHits.length === 6)

// 5 — snap-scroll rail marker.
assert('data-testid="helpers-rail"', html.includes('data-testid="helpers-rail"'))

// 6 — progress bar at 80%.
const okProgressRole = html.includes('role="progressbar"')
const okProgressValue = html.includes('aria-valuenow="80"')
assert('role="progressbar" present', okProgressRole)
assert('aria-valuenow="80"', okProgressValue)

// 7 — flat dark background field via the surround class (no polygon layer).
assert('bg-student-bg surround', html.includes('bg-student-bg'))

console.log(failed === 0 ? '\nQA PASS' : `\nQA FAIL (${failed} assertion${failed === 1 ? '' : 's'})`)
process.exit(failed === 0 ? 0 : 1)
