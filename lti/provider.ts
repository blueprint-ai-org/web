import 'dotenv/config'
import { Provider as lti } from 'ltijs'
// The same mongoose singleton ltijs connects through — see the
// `removeAllListeners` block after `lti.deploy()`.
import mongoose from 'mongoose'
import { signLtiClaimsCookie } from './session.js'

const required = ['LTI_KEY', 'MONGODB_URL', 'CANVAS_ISSUER']
for (const k of required) if (!process.env[k]) throw new Error(`Missing env ${k}`)

lti.setup(
  process.env.LTI_KEY!,
  // Shared M0 test cluster (canvas-test) has a 500-connection cap across all envs; cap pool to avoid saturating it.
  //
  // `maxPoolSize` bounds ONE MongoClient, not how many exist — which is why it
  // did not prevent the 2026-09-11 alert. A dev server left up for four days
  // held 657 connections (~219 per shard host against a cap of 5), because
  // ltijs reconnects by calling `mongoose.connect` again and the previous
  // client's sockets are never closed. See the `removeAllListeners` block
  // below for the leak itself; `maxIdleTimeMS` is the backstop that keeps any
  // pool we still manage to orphan from holding its sockets forever.
  {
    url: process.env.MONGODB_URL!,
    connection: {
      maxPoolSize: 5,
      minPoolSize: 0,
      // Without this the driver never reaps an idle socket, so an abandoned
      // pool keeps its connections until the process dies. That is the
      // difference between a few stale pools and a cluster at its cap.
      maxIdleTimeMS: 60_000,
    },
  },
  {
    // Note: ltijs owns appRoute and would redirect-loop unauthenticated requests
    // back to itself. Point it at an internal launch route, then in onConnect
    // sign a short-lived JWT cookie and hand off to React Router's `/app`.
    //
    // Phase 4 (cookieless flow) note: our own /lti/launch handler in
    // lti/cookieless.ts wins over ltijs's appRoute for the cookieless path
    // (it's registered before `app.use(lti.app)` in server.ts). We keep this
    // appRoute setting because ltijs *requires* one and it still serves the
    // legacy cookie fallback path — do NOT remove it.
    appRoute: '/lti/launch',
    loginRoute: '/lti/login',
    keysetRoute: '/.well-known/jwks.json',
    dynRegRoute: '/lti/register',
    cookies: { secure: true, sameSite: 'None' },
    devMode: process.env.NODE_ENV !== 'production',
  }
)

lti.onConnect(async (token, _req, res) => {
  // Legacy cookie-flow path. The cookieless flow goes through
  // handleValidate in cookieless.ts which calls the same helper.
  await signLtiClaimsCookie(token, res)
  return res.redirect('/app')
})

// Allow our React Router routes to bypass ltijs auth check.
// `/preview/*` is dev-only (the `_preview.tsx` layout loader returns 404 in
// production); whitelist it here so ltijs's launch gate doesn't 401 the
// preview routes during local visual QA.
lti.whitelist('/app', /^\/assets\//, /^\/_root\.data$/, '/', /^\/preview\//, /^\/__manifest/)

await lti.deploy({ serverless: true })

// ── the connection leak, and why this listener has to go ───────────────────
//
// `ltijs@5.9.9` installs its own reconnect loop in `Utils/Database.js:203-229`:
//
//     this.db.on('error',        () => { mongoose.disconnect() })
//     this.db.on('disconnected', () => {
//       setTimeout(() => { if (readyState === 0) mongoose.connect(url, opts) }, 1000)
//     })
//
// Each `mongoose.connect` on the global singleton builds a **fresh**
// MongoClient with a fresh pool. The previous client's established sockets are
// not closed — `disconnect()` is what fires the event that schedules the
// reconnect, and nothing ever tears the old pool down. Every sleep/wake or
// network change therefore adds up to `maxPoolSize` sockets per shard host,
// permanently.
//
// Measured 2026-09-11: one `tsx watch` dev server, up 3d20h, held 657
// connections to a cluster whose cap is 500 — roughly 44 orphaned pools.
//
// The handler is also redundant. The Node driver has done its own topology
// monitoring and reconnection since 3.x; ltijs's loop predates that and now
// only duplicates clients. Removing it leaves reconnection to the driver,
// which reuses the existing client instead of building another.
//
// **Both listeners, not just 'disconnected'.** They are one mechanism: ltijs's
// 'error' handler calls `mongoose.disconnect()`, which is what emits
// 'disconnected' in the first place. Removing only the reconnect half would
// leave the teardown half armed, and the first connection error would close the
// client for good with nothing left to reopen it — a worse failure than the
// leak. Removing only the teardown half would leave a reconnect loop with
// nothing to trigger it, which is merely useless.
//
// With both gone, nothing in this process ever calls `mongoose.disconnect()` or
// a second `mongoose.connect()`, so there is exactly one MongoClient for the
// lifetime of the server and the driver's topology monitor handles outages by
// retrying on the client it already has.
//
// ltijs's 'connected' / 'open' / 'reconnected' listeners are debug logging and
// stay.
mongoose.connection.removeAllListeners('error')
mongoose.connection.removeAllListeners('disconnected')

// A replacement 'error' listener is not optional. `mongoose.Connection` is an
// EventEmitter, and an 'error' event emitted with no listener attached throws
// `ERR_UNHANDLED_ERROR` and takes the process down. This one logs and returns —
// deliberately no `disconnect()`, which is the whole point of the removal above.
mongoose.connection.on('error', (err) => {
  console.error('[lti] mongo connection error (driver will retry):', (err as Error)?.message ?? err)
})

if (process.env.CANVAS_CLIENT_ID) {
  // Boot-time platform registration for the hard-coded Canvas instance.
  // Wrapped in try/catch so a duplicate-platform error (e.g. after a
  // re-deploy where the same Canvas was previously registered, including
  // via the dynamic-registration flow in lti/dynamic-registration.ts) is
  // logged rather than crashing the process.
  try {
    await lti.registerPlatform({
      url: process.env.CANVAS_ISSUER!,
      name: 'Canvas (blueprint.instructure.com)',
      clientId: process.env.CANVAS_CLIENT_ID,
      authenticationEndpoint: 'https://sso.canvaslms.com/api/lti/authorize_redirect',
      accesstokenEndpoint: 'https://sso.canvaslms.com/login/oauth2/token',
      authConfig: {
        method: 'JWK_SET',
        key: 'https://sso.canvaslms.com/api/lti/security/jwks',
      },
    })
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err)
    if (/PLATFORM_ALREADY_REGISTERED/i.test(msg)) {
      console.info('[lti] platform already registered, skipping boot registration')
    } else {
      console.error('[lti] boot platform registration failed:', msg)
    }
  }
} else {
  console.warn('[lti] CANVAS_CLIENT_ID not set — skipping platform registration')
}

// Named export so platform/cookieless helpers can call lti.getPlatform(...)
// without importing the default (which is also used by server.ts).
export { lti as ltiProvider }

export default lti
