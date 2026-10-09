// Cookieless OIDC handlers (LTI 1.3 lti-cs-oidc/v0p1 + lti-pm-s/v0p1).
//
// Phase 2: implements only `/lti/login`. Phase 3 will add `/lti/launch` and
// `/lti/validate` to the same module.
//
// When Canvas POSTs the OIDC initiation with `lti_storage_target`, we:
//   1. Generate state + nonce.
//   2. Persist nonce server-side (see nonce-store.ts) — source of truth.
//   3. Render an HTML page that posts `lti.put_data` to Canvas's platform
//      storage frame, then auto-submits a top-level form to the platform's
//      authorize endpoint.
//
// If `lti_storage_target` is absent we call next() so ltijs's cookie-based
// /lti/login (mounted via `app.use(lti.app)`) handles the request — legacy
// platform compat.
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextFunction, Request, Response } from 'express'
import { decodeJwt } from 'jose'
import { getPlatformConfig } from './platform.js'
import { saveNonce, consumeNonce } from './nonce-store.js'
import { verifyIdToken } from './verify.js'
import { signLtiClaimsCookie } from './session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOGIN_TEMPLATE = readFileSync(join(__dirname, 'templates', 'oidc-login.html'), 'utf8')
const LAUNCH_TEMPLATE = readFileSync(join(__dirname, 'templates', 'oidc-launch.html'), 'utf8')

function pickParam(
  body: Record<string, string>,
  query: Record<string, unknown>,
  name: string
): string | undefined {
  const fromBody = body[name]
  if (typeof fromBody === 'string' && fromBody.length > 0) return fromBody
  const fromQuery = query?.[name]
  if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery
  return undefined
}

/**
 * Read the raw request body once. Returns the buffered bytes so we can
 * either parse them ourselves (cookieless path) or re-emit them downstream
 * (fallthrough path — ltijs's body parser then sees the original stream).
 */
async function readRawBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
  }
  return Buffer.concat(chunks)
}

/**
 * Mark req's body as already parsed so downstream body-parser middleware
 * (ltijs uses body-parser internally) skips re-reading the stream. Sets
 * `req.body` to the parsed form fields and `req._body=true`, which is the
 * sentinel body-parser checks to bail out early.
 */
function passBodyDownstream(req: Request, parsed: Record<string, string>): void {
  ;(req as any).body = parsed
  ;(req as any)._body = true
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string))
}

function escapeAttrJson(s: string): string {
  // Embedding JSON inside a single-quoted HTML attribute. The JSON itself
  // contains double quotes; we only need to escape characters that would
  // break out of the attribute (single quote) or the HTML context (<,&).
  return s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;')
}

function renderLogin(vars: {
  state: string
  nonce: string
  storageTarget: string
  authOrigin: string
  authUrl: string
  authParams: Record<string, string>
}): string {
  return LOGIN_TEMPLATE
    .replace(/\{\{state\}\}/g, escapeHtml(vars.state))
    .replace(/\{\{nonce\}\}/g, escapeHtml(vars.nonce))
    .replace(/\{\{storage_target\}\}/g, escapeHtml(vars.storageTarget))
    .replace(/\{\{auth_origin\}\}/g, escapeHtml(vars.authOrigin))
    .replace(/\{\{auth_url\}\}/g, escapeHtml(vars.authUrl))
    .replace(/\{\{auth_params_json\}\}/g, escapeAttrJson(JSON.stringify(vars.authParams)))
}

/**
 * Express handler for `POST /lti/login` (and `GET /lti/login` for completeness).
 * Falls through to ltijs via next() if `lti_storage_target` is absent.
 */
export async function handleCookielessLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Read the raw body ourselves (no upstream parser) so that on fallthrough
  // we can re-emit it for ltijs's internal body parser.
  let raw: Buffer
  try {
    raw = await readRawBody(req)
  } catch (err) {
    res.status(400).type('text/plain').send(
      `body read error: ${(err as Error).message}`
    )
    return
  }

  const ct = (req.headers['content-type'] ?? '').toString()
  let body: Record<string, string> = {}
  if (raw.length > 0 && ct.includes('application/x-www-form-urlencoded')) {
    body = Object.fromEntries(new URLSearchParams(raw.toString('utf8')).entries())
  }
  const query = (req.query ?? {}) as Record<string, unknown>

  const storageTarget = pickParam(body, query, 'lti_storage_target')
  if (!storageTarget) {
    // Legacy cookie path: let ltijs handle it. We've already drained the
    // stream, so hand the parsed body forward via `req.body` + `_body=true`,
    // the sentinel body-parser uses to skip re-reading the stream.
    passBodyDownstream(req, body)
    return next()
  }

  const iss = pickParam(body, query, 'iss')
  const clientId = pickParam(body, query, 'client_id')
  const targetLinkUri = pickParam(body, query, 'target_link_uri')
  const loginHint = pickParam(body, query, 'login_hint')
  const ltiMessageHint = pickParam(body, query, 'lti_message_hint')
  const deploymentId = pickParam(body, query, 'lti_deployment_id')

  if (!iss || !clientId || !targetLinkUri || !loginHint) {
    res.status(400).type('text/plain').send(
      'Bad Request: iss, client_id, target_link_uri, login_hint required'
    )
    return
  }

  let cfg
  try {
    cfg = await getPlatformConfig(iss, clientId)
  } catch (err) {
    res.status(400).type('text/plain').send(
      `Unknown platform: ${(err as Error).message}`
    )
    return
  }

  const state = randomBytes(32).toString('hex')
  const nonce = randomBytes(32).toString('hex')

  try {
    await saveNonce(nonce, state)
  } catch (err) {
    res.status(500).type('text/plain').send(
      `nonce-store failure: ${(err as Error).message}`
    )
    return
  }

  const authParams: Record<string, string> = {
    scope: 'openid',
    response_type: 'id_token',
    response_mode: 'form_post',
    prompt: 'none',
    client_id: clientId,
    redirect_uri: targetLinkUri,
    login_hint: loginHint,
    state,
    nonce,
  }
  if (ltiMessageHint) authParams.lti_message_hint = ltiMessageHint
  if (deploymentId) authParams.lti_deployment_id = deploymentId

  const authOrigin = new URL(cfg.authEndpoint).origin

  const html = renderLogin({
    state,
    nonce,
    storageTarget,
    authOrigin,
    authUrl: cfg.authEndpoint,
    authParams,
  })

  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://*.instructure.com; script-src 'unsafe-inline'"
  )
  res.status(200).type('text/html; charset=utf-8').send(html)
}

function renderLaunch(vars: {
  state: string
  idToken: string
  storageTarget: string
  authOrigin: string
  validateUrl: string
}): string {
  return LAUNCH_TEMPLATE
    .replace(/\{\{state\}\}/g, escapeHtml(vars.state))
    .replace(/\{\{id_token\}\}/g, escapeHtml(vars.idToken))
    .replace(/\{\{storage_target\}\}/g, escapeHtml(vars.storageTarget))
    .replace(/\{\{auth_origin\}\}/g, escapeHtml(vars.authOrigin))
    .replace(/\{\{validate_url\}\}/g, escapeHtml(vars.validateUrl))
}

/**
 * Express handler for `POST /lti/launch`. Receives the platform's id_token
 * top-level form-POST and returns an HTML page that retrieves the nonce
 * from Canvas's platform store via lti.get_data, then form-POSTs
 * { state, id_token, nonce } to /lti/validate.
 *
 * Falls through to ltijs's launch handler when `lti_storage_target` is
 * absent (legacy cookie path).
 */
export async function handleCookielessLaunch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let raw: Buffer
  try {
    raw = await readRawBody(req)
  } catch (err) {
    res.status(400).type('text/plain').send(
      `body read error: ${(err as Error).message}`
    )
    return
  }

  const ct = (req.headers['content-type'] ?? '').toString()
  let body: Record<string, string> = {}
  if (raw.length > 0 && ct.includes('application/x-www-form-urlencoded')) {
    body = Object.fromEntries(new URLSearchParams(raw.toString('utf8')).entries())
  }
  const query = (req.query ?? {}) as Record<string, unknown>

  const storageTarget = pickParam(body, query, 'lti_storage_target')
  if (!storageTarget) {
    // Legacy cookie path — re-emit the parsed body so ltijs's body parser
    // skips re-reading the (now drained) stream. Mirrors handleCookielessLogin.
    passBodyDownstream(req, body)
    return next()
  }

  const idToken = pickParam(body, query, 'id_token')
  const state = pickParam(body, query, 'state')
  if (!idToken || !state) {
    res.status(400).type('text/plain').send(
      'Bad Request: id_token and state required'
    )
    return
  }

  // Decode (no signature check) just to look up platform config. Full
  // verification happens at /lti/validate after the nonce round-trip.
  let iss: string
  let aud: string
  try {
    const claims = decodeJwt(idToken)
    if (typeof claims.iss !== 'string') throw new Error('missing iss')
    iss = claims.iss
    if (typeof claims.aud === 'string') aud = claims.aud
    else if (Array.isArray(claims.aud) && typeof claims.aud[0] === 'string') aud = claims.aud[0]
    else throw new Error('missing or non-string aud')
  } catch (err) {
    res.status(400).type('text/plain').send(
      `Bad Request: cannot decode id_token: ${(err as Error).message}`
    )
    return
  }

  let cfg
  try {
    cfg = await getPlatformConfig(iss, aud)
  } catch (err) {
    res.status(400).type('text/plain').send(
      `Unknown platform: ${(err as Error).message}`
    )
    return
  }

  const authOrigin = new URL(cfg.authEndpoint).origin
  const html = renderLaunch({
    state,
    idToken,
    storageTarget,
    authOrigin,
    validateUrl: '/lti/validate',
  })

  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://*.instructure.com; script-src 'unsafe-inline'"
  )
  res.status(200).type('text/html; charset=utf-8').send(html)
}

/**
 * Build the post-validation token envelope ltijs's onConnect callback would
 * have received. Matches the shape app/routes/app.tsx + lti-session.server
 * read. Spec claim URIs — keep in sync with ltijs's Provider.js.
 */
function buildPlatformToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  iss: string,
  clientId: string
) {
  const ctx = payload['https://purl.imsglobal.org/spec/lti/claim/context']
  const resource = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link']
  const deploymentId = payload['https://purl.imsglobal.org/spec/lti/claim/deployment_id']

  const platformContext = {
    contextId: ctx?.id ?? null,
    user: payload.sub,
    context: ctx,
    resource,
    messageType: payload['https://purl.imsglobal.org/spec/lti/claim/message_type'],
    version: payload['https://purl.imsglobal.org/spec/lti/claim/version'],
    deepLinkingSettings: payload['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'],
    lis: payload['https://purl.imsglobal.org/spec/lti/claim/lis'],
    deploymentId,
    roles: payload['https://purl.imsglobal.org/spec/lti/claim/roles'],
    targetLinkUri: payload['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'],
    custom: payload['https://purl.imsglobal.org/spec/lti/claim/custom'],
    launchPresentation: payload['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'],
    endpoint: payload['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'],
    namesRoles: payload['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'],
  }

  return {
    iss,
    user: payload.sub,
    userInfo: {
      given_name: payload.given_name,
      family_name: payload.family_name,
      name: payload.name,
      email: payload.email,
    },
    platformInfo: payload['https://purl.imsglobal.org/spec/lti/claim/tool_platform'],
    clientId,
    platformId: undefined as string | undefined,
    deploymentId,
    createdAt: new Date().toISOString(),
    platformContext,
  }
}

/**
 * Express handler for `POST /lti/validate`. Internal endpoint hit by the
 * launch HTML's form-POST after the platform-storage nonce round-trip.
 *
 * Expects body: { state, id_token, nonce }. Performs full validation, in
 * this order:
 *   - id_token.nonce === nonce — binds token to this round-trip.
 *   - jose.jwtVerify against platform JWKS — signature, iss, aud, exp.
 *   - assertLaunchClaims — deployment_id, message_type, azp.
 *   - consumeNonce(nonce, state) — single-use replay protection, LAST so an
 *     invalid token cannot burn a valid nonce.
 * On success, signs the lti-claims cookie and 302s to /app.
 */
export async function handleValidate(
  req: Request,
  res: Response
): Promise<void> {
  return _handleValidateWithDeps(req, res, {
    getPlatformConfig,
    verifyIdToken,
    consumeNonce,
  })
}

/**
 * Seams for `handleValidate`, mirroring the
 * `_handleDynamicRegistrationWithDeps` pattern in dynamic-registration.ts.
 * Exposed so the nonce-ordering regression test can run without Mongo or a
 * live JWKS endpoint.
 */
export interface ValidateDeps {
  getPlatformConfig: typeof getPlatformConfig
  verifyIdToken: typeof verifyIdToken
  consumeNonce: typeof consumeNonce
}

export async function _handleValidateWithDeps(
  req: Request,
  res: Response,
  deps: ValidateDeps
): Promise<void> {
  const {
    getPlatformConfig: lookupPlatform,
    verifyIdToken: verifyToken,
    consumeNonce: consume,
  } = deps
  const body = (req.body ?? {}) as Record<string, string>
  const state = body.state
  const idToken = body.id_token
  const submittedNonce = body.nonce

  if (!state || !idToken) {
    res.status(400).type('text/plain').send('Bad Request: state and id_token required')
    return
  }
  if (!submittedNonce) {
    res.status(401).type('text/plain').send('MISSING_OR_USED_NONCE')
    return
  }

  let iss: string
  let aud: string
  let tokenNonce: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unverifiedClaims: any
  try {
    unverifiedClaims = decodeJwt(idToken)
    if (typeof unverifiedClaims.iss !== 'string') throw new Error('missing iss')
    iss = unverifiedClaims.iss
    const audClaim = unverifiedClaims.aud
    if (typeof audClaim === 'string') aud = audClaim
    else if (Array.isArray(audClaim) && typeof audClaim[0] === 'string') aud = audClaim[0]
    else throw new Error('missing or non-string aud')
    if (typeof unverifiedClaims.nonce !== 'string') throw new Error('missing nonce')
    tokenNonce = unverifiedClaims.nonce
  } catch (err) {
    res.status(400).type('text/plain').send(
      `Bad Request: cannot decode id_token: ${(err as Error).message}`
    )
    return
  }

  // ORDER MATTERS. The nonce is consumed *last*, only once the token has
  // proven itself. Consuming first (the previous behaviour) let anyone who
  // could observe a (state, nonce) pair burn someone else's nonce by POSTing
  // it with a garbage id_token: the delete succeeded, verification then
  // failed, and the legitimate launch that followed hit MISSING_OR_USED_NONCE.
  // Replay protection is unaffected — consumeNonce's findOneAndDelete is
  // atomic, so exactly one caller can ever consume a given pair.

  // 1) Token nonce must equal the round-tripped nonce.
  if (tokenNonce !== submittedNonce) {
    res.status(401).type('text/plain').send('NONCE_MISMATCH')
    return
  }

  // 2) Full signature + claims validation against the platform's JWKS,
  //    including deployment_id / message_type / azp (see launch-claims.ts).
  let cfg
  try {
    cfg = await lookupPlatform(iss, aud)
  } catch (err) {
    res.status(401).type('text/plain').send(
      `unknown platform: ${(err as Error).message}`
    )
    return
  }

  let payload
  try {
    payload = await verifyToken(
      idToken,
      { iss, aud, nonce: submittedNonce, launch: { clientId: cfg.clientId } },
      cfg.jwksUrl
    )
  } catch (err) {
    res.status(401).type('text/plain').send(
      `id_token verification failed: ${(err as Error).message}`
    )
    return
  }

  // 3) Only now consume the nonce. Single-use; false on replay/expiry.
  let consumed = false
  try {
    consumed = await consume(submittedNonce, state)
  } catch (err) {
    res.status(500).type('text/plain').send(
      `nonce-store error: ${(err as Error).message}`
    )
    return
  }
  if (!consumed) {
    res.status(401).type('text/plain').send('MISSING_OR_USED_NONCE')
    return
  }

  const token = buildPlatformToken(payload, iss, aud)
  // Sign + set the cookie (still useful for browsers that accept third-party
  // cookies in iframe context, e.g. Chrome). Capture the same JWT so we can
  // also pass it as a `?lti_session=` URL token — the source of truth for
  // Safari ITP and Firefox Strict ETP, which silently drop the cookie.
  //
  // Trade-off: the JWT briefly appears in Railway / Cloudflare access logs
  // for the `/app?lti_session=...` request. Mitigated by the JWT's 1h TTL,
  // HTTPS-only transport, and an immediate `history.replaceState` strip on
  // first render in app/routes/app.tsx.
  const jwt = await signLtiClaimsCookie(token, res)
  res.redirect(`/app?lti_session=${encodeURIComponent(jwt)}`)
}
