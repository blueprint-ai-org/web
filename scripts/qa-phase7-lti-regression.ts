/**
 * Phase 7 LTI regression harness — against the live dev server.
 *
 * Proves that a launch-shaped request still walks `/app` → the persona route
 * exactly as it did before the gate was widened, and that no `bp-session`
 * cookie is created, read, or required anywhere along the way.
 *
 * Reuses Phase 4's approach: mint the `lti-claims` JWT the same way
 * `lti/session.ts:signLtiClaimsCookie` does, then hand it to `/app` the way
 * `handleValidate` does at the end of a real launch (`?lti_session=<jwt>`).
 * The upstream handshake (OIDC login → launch → validate) is covered
 * separately by `npx tsx lti/cookieless.qa.ts`.
 *
 * Run:  npx tsx <this file>
 */

import { readFileSync } from 'node:fs'
import { SignJWT } from 'jose'

const BASE = 'http://localhost:3030'

// Read LTI_KEY straight out of .env — the dev server is running with it, and
// the JWT has to verify against the same secret.
const env = readFileSync('/Users/sergio/Dev/BlueprintAI/canvas/lti-server-test/.env', 'utf8')
function envVar(name: string): string {
  for (const line of env.split('\n')) {
    if (line.startsWith(`${name}=`)) return line.slice(name.length + 1).trim()
  }
  throw new Error(`${name} not found in .env`)
}

const LEARNER = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'
const INSTRUCTOR = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'

let pass = 0
let fail = 0
function record(ok: boolean, name: string, detail = ''): void {
  if (ok) {
    pass++
    console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`)
  } else {
    fail++
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`)
  }
}

async function mintLtiSession(roles: string[]): Promise<string> {
  const secret = new TextEncoder().encode(envVar('LTI_KEY'))
  // The exact payload shape `signLtiClaimsCookie` produces: Canvas claims
  // nested under a `token` claim.
  const token = {
    iss: 'https://canvas.instructure.com',
    platformContext: { roles, custom: {} },
  }
  return new SignJWT({ token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

/** Follow redirects by hand so every hop can be inspected. */
async function walk(
  startPath: string,
  cookieHeader?: string,
): Promise<{ hops: string[]; final: Response; setCookies: string[] }> {
  const hops: string[] = []
  const setCookies: string[] = []
  let path = startPath
  let res: Response
  for (let i = 0; i < 8; i++) {
    hops.push(path)
    const headers: Record<string, string> = {
      // A Canvas launch lands in an iframe; say so, the way a browser would.
      'sec-fetch-dest': 'iframe',
      'sec-fetch-site': 'cross-site',
    }
    if (cookieHeader) headers.cookie = cookieHeader
    res = await fetch(`${BASE}${path}`, { headers, redirect: 'manual' })
    for (const [k, v] of res.headers.entries()) {
      if (k.toLowerCase() === 'set-cookie') setCookies.push(v)
    }
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) {
      path = loc.startsWith('http') ? new URL(loc).pathname + new URL(loc).search : loc
      continue
    }
    return { hops, final: res, setCookies }
  }
  throw new Error(`too many redirects starting at ${startPath}`)
}

async function main(): Promise<void> {
  console.log('\n── LTI launch regression (live server, no bp-session anywhere) ──\n')

  // ---- 1. Student launch: /app → /student/onboarding/name -----------------
  {
    const jwt = await mintLtiSession([LEARNER])
    const { hops, final, setCookies } = await walk(
      `/app?lti_session=${encodeURIComponent(jwt)}`,
    )
    record(final.status === 200, 'student launch: persona route renders 200', `status=${final.status}`)
    record(
      hops.some((h) => h.startsWith('/student/onboarding/name')),
      'student launch: /app redirects to /student/onboarding/name',
      `hops=${hops.map((h) => h.split('?')[0]).join(' → ')}`,
    )
    record(
      !hops.some((h) => h.startsWith('/login')),
      'student launch: never diverted to /login',
    )
    const bpCookies = setCookies.filter((c) => c.startsWith('bp-session='))
    record(
      bpCookies.length === 0,
      'student launch: server set NO bp-session cookie',
      `set-cookie count=${setCookies.length}`,
    )
    const body = await final.text()
    record(
      !body.includes('No active LTI session'),
      'student launch: no 401 gate body in the response',
    )
  }

  // ---- 2. Teacher launch: /app → /teacher ---------------------------------
  {
    const jwt = await mintLtiSession([INSTRUCTOR])
    const { hops, final, setCookies } = await walk(`/app?lti_session=${encodeURIComponent(jwt)}`)
    record(final.status === 200, 'teacher launch: persona route renders 200', `status=${final.status}`)
    record(
      hops.some((h) => h.startsWith('/teacher')),
      'teacher launch: /app redirects to /teacher',
      `hops=${hops.map((h) => h.split('?')[0]).join(' → ')}`,
    )
    record(
      setCookies.filter((c) => c.startsWith('bp-session=')).length === 0,
      'teacher launch: server set NO bp-session cookie',
    )
  }

  // ---- 3. Persona route reached by the lti-claims COOKIE alone ------------
  {
    const jwt = await mintLtiSession([INSTRUCTOR])
    const { final } = await walk('/teacher', `lti-claims=${encodeURIComponent(jwt)}`)
    record(
      final.status === 200,
      'cookie-only LTI session still satisfies the persona gate',
      `status=${final.status}`,
    )
  }

  // ---- 4. The 401 is preserved for a session-less iframe request ----------
  {
    const res = await fetch(`${BASE}/student`, {
      headers: { 'sec-fetch-dest': 'iframe' },
      redirect: 'manual',
    })
    const body = await res.text()
    record(res.status === 401, 'session-less IFRAME request still 401s', `status=${res.status}`)
    record(
      body.includes('No active LTI session'),
      'the 401 reason string still reaches the rendered page',
    )
    // NOT asserted: a `Content-Security-Policy` header on the wire. The thrown
    // Response carries it (asserted in `_persona.test.ts`), but React Router
    // renders a thrown Response through the ErrorBoundary and builds a fresh
    // response, dropping the thrown one's headers — the documented reason the
    // policy is set at the Express layer for `/app` (`server.ts:25`,
    // `CLAUDE.md`). Pre-existing and unchanged: the thrown Response in
    // `_persona.tsx` is byte-identical to its pre-Phase-7 form.
    record(
      res.headers.get('content-security-policy') === null,
      'the wire-level CSP absence is unchanged (RR drops thrown-Response headers)',
    )
  }

  // ---- 5. A stale lti_session param still 401s rather than redirecting ---
  {
    const res = await fetch(`${BASE}/student?lti_session=expired-garbage`, { redirect: 'manual' })
    record(res.status === 401, 'stale ?lti_session= still 401s (not /login)', `status=${res.status}`)
  }

  // ---- 6. A plain top-level request now redirects to /login --------------
  {
    const res = await fetch(`${BASE}/student/journal`, {
      headers: { 'sec-fetch-dest': 'document', 'sec-fetch-site': 'none' },
      redirect: 'manual',
    })
    record(
      res.status >= 300 && res.status < 400 && res.headers.get('location') === '/login',
      'session-less top-level request redirects to /login',
      `status=${res.status} location=${res.headers.get('location')}`,
    )
  }

  console.log(`\nsummary: ${pass} passed, ${fail} failed\n`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
