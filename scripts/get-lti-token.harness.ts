// Unit harness for getLtiToken: URL-only, cookie-only, both (URL wins),
// neither, and malformed URL with cookie fallback.
//
// Run from lti-server-test:
//   LTI_KEY=test-secret-xyz npx tsx scripts/get-lti-token.harness.ts
//
// (Will set a temp LTI_KEY if missing.) Exits 0 on full pass, 1 on any
// failure. Disposable — kept under scripts/ so tsx picks up the project's
// ESM config.
import { SignJWT } from 'jose'

if (!process.env.LTI_KEY) process.env.LTI_KEY = 'test-secret-' + Date.now()
const ltiSecret = new TextEncoder().encode(process.env.LTI_KEY)

async function makeJwt(token: unknown): Promise<string> {
  return new SignJWT({ token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(ltiSecret)
}

async function main() {
  const { getLtiToken } = await import('../app/lib/lti-session.server.ts')

  let pass = 0
  let fail = 0
  function record(ok: boolean, name: string, detail = '') {
    if (ok) {
      pass++
      console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`)
    } else {
      fail++
      console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`)
    }
  }

  const urlToken = { user: 'url-user', from: 'url' }
  const cookieToken = { user: 'cookie-user', from: 'cookie' }
  const urlJwt = await makeJwt(urlToken)
  const cookieJwt = await makeJwt(cookieToken)

  // 1. URL only
  {
    const req = new Request(`https://example.test/app?lti_session=${encodeURIComponent(urlJwt)}`)
    const t = await getLtiToken(req)
    record(t?.from === 'url' && t?.user === 'url-user', 'URL only → URL token', JSON.stringify(t))
  }

  // 2. Cookie only
  {
    const req = new Request('https://example.test/app', {
      headers: { cookie: `lti-claims=${cookieJwt}` },
    })
    const t = await getLtiToken(req)
    record(t?.from === 'cookie', 'Cookie only → cookie token', JSON.stringify(t))
  }

  // 3. Both — URL wins
  {
    const req = new Request(`https://example.test/app?lti_session=${encodeURIComponent(urlJwt)}`, {
      headers: { cookie: `lti-claims=${cookieJwt}` },
    })
    const t = await getLtiToken(req)
    record(t?.from === 'url', 'Both present → URL wins', JSON.stringify(t))
  }

  // 4. Neither
  {
    const req = new Request('https://example.test/app')
    const t = await getLtiToken(req)
    record(t === null, 'Neither → null', JSON.stringify(t))
  }

  // 5. Malformed URL token + valid cookie → falls through to cookie
  {
    const req = new Request('https://example.test/app?lti_session=not-a-jwt', {
      headers: { cookie: `lti-claims=${cookieJwt}` },
    })
    const t = await getLtiToken(req)
    record(t?.from === 'cookie', 'Malformed URL + valid cookie → cookie', JSON.stringify(t))
  }

  console.log(`summary: ${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('fatal', err)
  process.exit(1)
})
