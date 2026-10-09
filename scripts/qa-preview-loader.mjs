// QA helper for step-6: directly invoke the _preview.tsx loader to verify
// (a) production NODE_ENV throws a 404 Response (the production gate)
// (b) dev mode returns { themeMode: 'light' } by default
// (c) ?theme=dark returns { themeMode: 'dark' }
//
// This replaces the curl-based gate check from step-6's automated QA when
// the sandbox blocks booting `npm run dev`.
//
// Run from repo root:
//   npx tsx scripts/qa-preview-loader.mjs

const PREVIEW = '/Users/sergio/Dev/BlueprintAI/canvas/lti-server-test/app/routes/_preview.tsx'

process.env.NODE_ENV = 'production'
const mod = await import(PREVIEW)

// (a) Production gate: loader should throw a 404 Response
let prodResult, prodThrown
try {
  prodResult = await mod.loader({
    request: new Request('http://localhost/preview/teacher'),
    params: {},
    context: {},
  })
} catch (e) {
  prodThrown = e
}
if (!prodThrown || !(prodThrown instanceof Response) || prodThrown.status !== 404) {
  console.error('FAIL: production should throw 404 Response, got:', prodThrown, prodResult)
  process.exit(1)
}
console.log('PASS: production loader throws 404')

// (b) Dev mode default: themeMode = 'light'
process.env.NODE_ENV = 'development'
const devResult = await mod.loader({
  request: new Request('http://localhost/preview/teacher'),
  params: {},
  context: {},
})
if (devResult.themeMode !== 'light') {
  console.error('FAIL: dev default themeMode should be light, got:', devResult)
  process.exit(1)
}
console.log('PASS: dev loader returns themeMode=light by default')

// (c) ?theme=dark → themeMode = 'dark'
const darkResult = await mod.loader({
  request: new Request('http://localhost/preview/teacher?theme=dark'),
  params: {},
  context: {},
})
if (darkResult.themeMode !== 'dark') {
  console.error('FAIL: ?theme=dark should give themeMode=dark, got:', darkResult)
  process.exit(1)
}
console.log('PASS: ?theme=dark loader returns themeMode=dark')

console.log('ALL PASS')
