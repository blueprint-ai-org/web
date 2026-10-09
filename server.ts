import express from 'express'
import { createRequestHandler } from '@react-router/express'
import lti from './lti/provider.js'
import { handleCookielessLogin, handleCookielessLaunch, handleValidate } from './lti/cookieless.js'
import { handleLtiConfigJson } from './lti/config-json.js'
import { handleDynamicRegistration } from './lti/dynamic-registration.js'

const app = express()
const isProd = process.env.NODE_ENV === 'production'

// The HMR socket is a server of its own, and in middleware mode Vite defaults
// it to port 24678 — one fixed port shared by every Vite project on the
// machine. Whoever binds it first keeps it; this process then logs
// `Port 24678 is already in use` exactly once and carries on with hot reload
// dead, so every open tab keeps running the bundle it was loaded with and an
// edit simply never arrives. That is silent from the browser's side and cost a
// session's debugging on 2026-09-28. Deriving the port from our own makes the
// collision impossible between instances of this app.
const viteDevServer = isProd
  ? null
  : await import('vite').then((v) =>
      v.createServer({
        server: {
          middlewareMode: true,
          hmr: { port: Number(process.env.SERVER_HTTP_PORT ?? 3000) + 20000 },
        },
      }),
    )

const rrHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule('virtual:react-router/server-build') as any
    : await import(/* @vite-ignore */ './build/server/index.js' as string),
  getLoadContext: (req) => ({ ltiToken: (req as any).res?.locals?.token }),
})

// In dev, say what arrives. The server was silent — not one GET or POST — so a
// screen that looked unwired could not be told apart from one whose click never
// left the browser, and that ambiguity cost a day on a mood answer that "did not
// save". Vite's own asset traffic is filtered out; page loads, `.data` fetches
// and form posts are the ones worth seeing.
if (viteDevServer) {
  app.use((req, res, next) => {
    const noise = /^\/(@|node_modules\/|app\/|__vite|favicon)|\.(svg|png|jpg|woff2?|css|map)$/
    if (noise.test(req.path)) return next()
    const started = Date.now()
    res.on('finish', () => {
      console.log(`[req] ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - started}ms)`)
    })
    next()
  })
}

// Ensure the React-Router-rendered /app route is iframe-embeddable inside Canvas
// even when the loader throws (e.g. unauthenticated 401). RR's per-route headers()
// export is not invoked for thrown Responses, so we set the policy at the Express layer.
app.use('/app', (_req, res, next) => {
  res.setHeader('Content-Security-Policy', 'frame-ancestors https://*.instructure.com')
  next()
})

// LTI 1.3 Dynamic Registration handler. Registered before `app.use(lti.app)`
// so we override ltijs's default `dynRegRoute` stub — see lti/dynamic-registration.ts
// for why (default placements omit our per-message icon_uri and label).
app.get('/lti/register', handleDynamicRegistration)

// Public Canvas tool configuration (paste-JSON install URL for district admins).
// Registered before `app.use(lti.app)` so ltijs's default handlers don't intercept.
app.get('/lti-config.json', handleLtiConfigJson)

// Transparent BP AI access-token refresh (app/lib/bp-ai/refresh.server.ts).
//
// Placement, both halves of it:
//
//   * **Before every rrHandler registration below**, because the middleware's
//     job is to hand a fresh token to the loaders rrHandler is about to run.
//     RR7 runs those in parallel and the refresh token rotates on every use, so
//     Express middleware is the only place that provably runs once per request.
//   * **A no-op for LTI**, which the plan asked to achieve by mounting after
//     the /lti/* handlers. That is not available here: those handlers are
//     registered *below* the RR block and this file's route order is
//     load-bearing (see CLAUDE.md), so moving either block is the riskier
//     change. The middleware instead guarantees it itself — it returns
//     immediately for any /lti/* path, and again for any request with no
//     `bp-session` cookie, which is every Canvas launch (the cookie is
//     SameSite=Lax, so a cross-site launch never carries it). Two independent
//     guards, both unit-tested; nothing in the LTI path can observe it.
//
// Loaded with a runtime `import()` plus an explicit shape, not a static import,
// for the same reason `./build/server/index.js` above is: `app/**` belongs to
// `tsconfig.vite.json`, and importing it from here adds it (and its whole
// import graph) to `tsconfig.node.json`'s program, which then reports TS6307
// for every file in it. The shape below mirrors `BpRefreshRequest` /
// `BpRefreshResponse` in refresh.server.ts, and writing it out is what buys the
// one check that matters at this boundary: `app.use` verifies that Express's
// real `Request`/`Response` satisfy the middleware's parameters.
type BpRefreshHandler = (
  req: { readonly path: string; headers: { cookie?: string | undefined } },
  res: { append(field: string, value: string): unknown },
  next: () => void,
) => Promise<void>

const { bpRefreshMiddleware } = (await import(
  /* @vite-ignore */ './app/lib/bp-ai/refresh.server.js' as string
)) as { bpRefreshMiddleware: BpRefreshHandler }

app.use(bpRefreshMiddleware)

// Routes RR owns — must run before lti.app, which has a default root handler
// and an auth middleware that 401s anything else with NO_LTIK_OR_IDTOKEN_FOUND.
app.get('/', rrHandler)
app.get('/app', rrHandler)
app.get('/_demo/*splat', rrHandler)
app.get('/_dev/*splat', rrHandler)
app.all('/api/*splat', rrHandler)
// Persona routes — entry points the /app dispatcher redirects to by LTI role.
app.get('/student', rrHandler)
// `app.all`, NOT `app.get`, and for the same load-bearing reason the credential
// auth routes document below: a student sub-route that exports an `action`
// receives a form POST, and `lti.whitelist` does not cover it, so with
// `app.get` the GET rendered the screen fine while the POST fell through to
// `app.use(lti.app)` and answered 401 NO_LTIK_OR_IDTOKEN_FOUND.
//
// `/student/onboarding/avatar` is the first of these — picking an avatar is the
// one self-service write a student has — and the failure looked exactly like
// the `.data` trap below: a URL that had loaded a moment earlier refusing the
// submission made from it.
app.all('/student/*splat', rrHandler)
app.get('/teacher', rrHandler)
app.get('/counselor', rrHandler)
app.get('/counselor/*splat', rrHandler)
app.get('/parent', rrHandler)
app.get('/admin', rrHandler)
app.get('/unsupported-role', rrHandler)
// `.data` twins for the persona INDEX routes — the same trap the auth routes
// document at length below, and for the same reason: RR7 single-fetch requests
// `<route>.data` on every client-side navigation. The patterns above miss them,
// because `/student.data` has no slash after `student` and so matches neither
// `/student` nor `/student/*splat` — it falls through to `app.use(lti.app)` and
// answers 401 NO_LTIK_OR_IDTOKEN_FOUND. The sub-route twins were always fine
// (`/student/journal.data` matches the splat); only the indices were exposed.
//
// Phase 7 is what made this reachable: `/login` now redirects to `/student`, and
// RR follows an action's redirect with a client-side navigation, so a returning
// user's very first request after signing in was `/student.data`. The document
// GET always worked, which is exactly why `curl` never saw this and the failure
// looked like a 401 error boundary on a URL that had loaded a moment earlier.
app.get(
  [
    '/student.data',
    '/teacher.data',
    '/counselor.data',
    '/parent.data',
    '/admin.data',
    '/unsupported-role.data',
  ],
  rrHandler,
)
// Credential auth routes — `app.all`, NOT `app.get`, and this is load-bearing.
// These four were the only RR routes that received a form POST until the
// student subtree gained an action; see `/student/*splat` above. `lti.whitelist`
// (lti/provider.ts) does not cover them, so with `app.get` the GET would render
// the page fine while the POST fell through to `app.use(lti.app)` below and was
// 401'd with NO_LTIK_OR_IDTOKEN_FOUND — a login screen whose submit button
// silently does nothing. Same reason `/api/*splat` above uses `app.all`.
//
// The `.data` twins are NOT optional, and their absence is invisible to `curl`.
// RR7 single-fetch sends every *client-side* submission to `<route>.data`, so a
// browser with JavaScript posts to `/login.data`, never `/login` — while `curl
// -X POST /login` (how Phase 3 verified this) exercises only the document path.
// Without the `.data` twins the document POST works perfectly and the real
// screen's submit button answers **401 NO_LTIK_OR_IDTOKEN_FOUND** from ltijs,
// which surfaces as a form that does nothing at all. `lti.whitelist` already
// carries `/^\/_root\.data$/` for exactly this reason (`lti/provider.ts:48`);
// these are the auth routes' equivalent.
app.all(
  [
    '/login',
    '/login.data',
    '/signup',
    '/signup.data',
    '/invite',
    '/invite.data',
    '/logout',
    '/logout.data',
  ],
  rrHandler,
)
app.get('/preview/*splat', rrHandler)

// Cookieless OIDC handlers — must run before `app.use(lti.app)` so they win
// for /lti/login. They call next() to fall through to ltijs's cookie-based
// handler when `lti_storage_target` is absent (legacy platform compat).
//
// We do NOT mount express.urlencoded here — the cookieless handler reads
// the raw body itself and, on fallback, re-emits the buffered bytes so
// ltijs's internal body parser sees the original stream intact.
app.post('/lti/login', handleCookielessLogin)
app.get('/lti/login', handleCookielessLogin)

// Cookieless OIDC launch — Phase 3. handleCookielessLaunch reads its own
// raw body (mirrors handleCookielessLogin) so we don't mount urlencoded()
// upstream. handleValidate is our internal endpoint, not exposed to Canvas:
// it consumes a server-stored nonce, so we can safely use a normal
// body-parser here.
app.post('/lti/launch', handleCookielessLaunch)
app.post('/lti/validate', express.urlencoded({ extended: false }), handleValidate)

// Static assets must be served BEFORE ltijs, otherwise ltijs's auth middleware
// 401s requests for things like /icon.png (Canvas fetches it as the Developer
// Key logo_uri after dynamic registration, and renders a broken-image
// placeholder if it can't load).
if (viteDevServer) {
  app.use(viteDevServer.middlewares)
} else {
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }))
  app.use(express.static('build/client'))
}

// LTI middleware — owns /lti/launch, /.well-known/jwks.json, /lti/register
// (and /lti/login as a fallback when our cookieless handler calls next()).
app.use(lti.app)

app.all('/*splat', rrHandler)

const port = Number(process.env.SERVER_HTTP_PORT ?? 3000)
const httpServer = app.listen(port, () => console.log(`lti-server-test listening on :${port}`))

async function shutdown(signal: string) {
  console.log(`[shutdown] received ${signal}, closing server + mongo`)
  httpServer.close()
  try {
    await lti.close({ silent: true })
  } catch (err) {
    console.error('[shutdown] lti.close error:', err)
  }
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
