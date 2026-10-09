// Step-4 Automated QA — supplementary unit-level render check.
//
// The cookieless QA harness can't fetch /admin end-to-end because ltijs's
// sessionValidator gates non-whitelisted routes (same constraint that
// applies to /teacher and /parent — both shipped without E2E coverage).
//
// To still cover the "page renders + loader data made it to the component"
// success criteria, this script:
//   1. Calls the `/admin` route's loader with a signed `?lti_session=` JWT
//      carrying the institution-admin role URI, asserts the loader returns
//      the expected shape.
//   2. Renders <AdminPlaceholder /> via react-dom/server with the loader
//      output, asserts the heading and the injected role URI both appear
//      in the HTML.
//   3. Repeats for the system-admin role URI.
//
// Run from `lti-server-test/`:
//   npx tsx scripts/qa-admin-render.mjs
import 'dotenv/config'
import { SignJWT } from 'jose'
import { renderToString } from 'react-dom/server'
import React from 'react'

process.env.LTI_KEY ??= 'test-key-for-admin-qa'

const ADMIN_INSTITUTION =
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator'
const ADMIN_SYSTEM =
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator'

// Dynamic imports so LTI_KEY is set before `lti-session.server.ts` evaluates.
const { loader } = await import('../app/routes/admin.tsx')
const { AdminPlaceholder } = await import('../app/components/dashboard/AdminPlaceholder.tsx')

const secret = new TextEncoder().encode(process.env.LTI_KEY)

async function signSession(roles, customFields = {}) {
  return new SignJWT({
    token: { platformContext: { roles, custom: customFields } },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}

let failures = 0
function check(ok, name, detail = '') {
  if (ok) console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`)
  else {
    failures++
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`)
  }
}

async function scenario(label, roleUri) {
  const jwt = await signSession([roleUri], { lti_role: 'admin', test: 'value' })
  const request = new Request(
    `https://example.test/admin?lti_session=${encodeURIComponent(jwt)}`
  )
  // Loader signature accepts more than we pass; cast through unknown via JS.
  const data = await loader({ request, params: {}, context: {} })
  check(
    Array.isArray(data.detectedRoles) && data.detectedRoles[0] === roleUri,
    `${label}: loader returns detectedRoles[0] = ${roleUri}`,
    `got ${JSON.stringify(data.detectedRoles)}`
  )
  check(
    data.customFields && data.customFields.lti_role === 'admin',
    `${label}: loader surfaces customFields`,
    `got ${JSON.stringify(data.customFields)}`
  )

  const html = renderToString(React.createElement(AdminPlaceholder, data))
  check(
    html.includes('Admin View'),
    `${label}: rendered HTML contains "Admin View" heading`
  )
  check(
    html.includes('Coming Soon'),
    `${label}: rendered HTML contains "Coming Soon" heading`
  )
  check(
    html.includes(roleUri),
    `${label}: rendered HTML contains the injected role URI`,
    `(${roleUri.split('/').slice(-2).join('/')})`
  )
  check(
    html.includes('lti_role') && html.includes('admin'),
    `${label}: rendered HTML contains custom-field key/value`
  )
}

await scenario('institution-admin', ADMIN_INSTITUTION)
await scenario('system-admin', ADMIN_SYSTEM)

console.log(
  `[qa-admin-render] summary: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURES`}`
)
process.exit(failures === 0 ? 0 : 1)
