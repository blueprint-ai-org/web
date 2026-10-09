// LTI 1.3 Dynamic Registration handler (IMS lti-dr/v1p0).
//
// District admins paste `https://<host>/lti/register?registration_secret=<s>`
// into Canvas (Admin → Developer Keys → + LTI Registration). Canvas opens that
// URL in a dialog, appending `&openid_configuration=...&registration_token=...`.
// We:
//   0. Check the registration secret and allowlist the fetch target
//      (lti/registration-guard.ts) — the endpoint is otherwise a way to
//      register an attacker-controlled issuer + JWKS.
//   1. Fetch the platform's OpenID configuration JSON.
//   2. Build an LTI 1.3 client registration request that mirrors
//      `/lti-config.json` (placements, icons, scopes — see tool-config.ts).
//   3. POST it to the platform's `registration_endpoint` with the bearer token.
//   4. (Phase 3) persist the resulting client_id via lti.registerPlatform.
//   5. Return HTML that postMessages `org.imsglobal.lti.close` to the
//      Canvas dialog so it auto-closes (spec §3.6).
//
// We deliberately do NOT enable ltijs's built-in DynamicRegistration service:
// its default `messages` array omits `placements`, `target_link_uri` per
// message, `label`, `icon_uri`, and `icon_svg_path_64`, so the registered
// Developer Key would not match the placements we serve from /lti-config.json.
// Building the body ourselves is ~30 lines and keeps the two install paths
// in lockstep (both consume `buildToolConfig` from tool-config.ts).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Request, Response } from 'express'
import { buildToolConfig, type Placement } from './tool-config.js'
import {
  assertOpenIdConfigAllowed,
  assertRegistrationAuthorized,
  RegistrationRejected,
} from './registration-guard.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLOSE_TEMPLATE = readFileSync(
  join(__dirname, 'templates', 'dynreg-close.html'),
  'utf8'
)

// Mirrors lti/cookieless.ts pickParam: prefer body, fall back to query.
function pickParam(
  body: Record<string, unknown>,
  query: Record<string, unknown>,
  name: string
): string | undefined {
  const fromBody = body?.[name]
  if (typeof fromBody === 'string' && fromBody.length > 0) return fromBody
  const fromQuery = query?.[name]
  if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery
  return undefined
}

function resolveBaseUrl(req: Request): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const proto =
    (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

// Subset of the OpenID config block we read. Canvas's actual response is
// far richer; we only declare what we consume.
export interface OpenIdConfig {
  issuer: string
  registration_endpoint: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  scopes_supported?: string[]
  'https://purl.imsglobal.org/spec/lti-platform-configuration'?: PlatformConfig
}

export interface PlatformConfig {
  product_family_code?: string
  version?: string
  messages_supported?: Array<{ type: string; placements?: string[] }>
  variables?: string[]
  // Canvas advertises an array of supported placement names here.
  placements?: string[]
}

export interface RegistrationMessage {
  type: 'LtiResourceLinkRequest'
  target_link_uri: string
  label: string
  placements: string[]
  icon_uri?: string
  // Canvas-specific message extensions (documented inline in the
  // tool-configuration JSON schema Canvas returns on validation errors).
  // Without `visibility`, global_navigation placements install but never
  // render. Without `default_enabled`, course_navigation placements install
  // disabled and require per-course toggling.
  'https://canvas.instructure.com/lti/visibility'?: 'admins' | 'members' | 'public'
  'https://canvas.instructure.com/lti/course_navigation/default_enabled'?: boolean
}

export interface ClientRegistrationRequest {
  application_type: 'web'
  response_types: ['id_token']
  grant_types: Array<'implicit' | 'client_credentials'>
  initiate_login_uri: string
  redirect_uris: string[]
  client_name: string
  jwks_uri: string
  token_endpoint_auth_method: 'private_key_jwt'
  scope: string
  logo_uri: string
  'https://purl.imsglobal.org/spec/lti-tool-configuration': {
    domain: string
    target_link_uri: string
    messages: RegistrationMessage[]
  }
}

/**
 * Map our shared ToolConfig (lti/tool-config.ts) into the LTI 1.3 client
 * metadata body specified by https://www.imsglobal.org/spec/lti-dr/v1p0.
 *
 * `platformConfig.placements`, when present, scopes the messages array to
 * placements Canvas advertises support for — defensive; in practice Canvas
 * supports both course_navigation and global_navigation. When the field is
 * missing or empty we send all of ours and let the platform reject.
 */
export function buildRegistrationRequest(
  baseUrl: string,
  platformConfig: PlatformConfig | undefined
): ClientRegistrationRequest {
  const tool = buildToolConfig(baseUrl)
  const ourPlacements: Placement[] = tool.extensions[0].settings.placements

  const advertised = platformConfig?.placements
  const filtered =
    advertised && advertised.length > 0
      ? ourPlacements.filter((p) => advertised.includes(p.placement))
      : ourPlacements

  const messages: RegistrationMessage[] = filtered.map((p) => {
    const msg: RegistrationMessage = {
      type: 'LtiResourceLinkRequest',
      target_link_uri: p.target_link_uri,
      label: p.text,
      placements: [p.placement],
    }
    // Spec allows an `icon_uri` per message. We attach one only for the
    // global_navigation entry (matches the JSON-paste install where the
    // course_navigation placement has no icon).
    if (p.placement === 'global_navigation' && p.icon_url) {
      msg.icon_uri = p.icon_url
    }
    if (p.placement === 'global_navigation') {
      msg['https://canvas.instructure.com/lti/visibility'] = 'public'
    }
    if (p.placement === 'course_navigation') {
      msg['https://canvas.instructure.com/lti/course_navigation/default_enabled'] = true
    }
    return msg
  })

  // Domain (host without protocol). new URL handles path/port edge cases.
  const domain = new URL(baseUrl).host

  // Scope is space-separated per OAuth 2.0 Dynamic Client Registration §2.
  const scope = (tool.scopes ?? []).join(' ')

  return {
    application_type: 'web',
    response_types: ['id_token'],
    grant_types: ['implicit', 'client_credentials'],
    initiate_login_uri: `${baseUrl}/lti/login`,
    redirect_uris: [`${baseUrl}/lti/launch`],
    client_name: 'Spark EQ',
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    token_endpoint_auth_method: 'private_key_jwt',
    scope,
    logo_uri: `${baseUrl}/icon.png`,
    'https://purl.imsglobal.org/spec/lti-tool-configuration': {
      domain,
      target_link_uri: `${baseUrl}/lti/launch`,
      messages,
      // Canvas's LTI tool-configuration JSON schema marks `claims` as required
      // (validated server-side; DR returns 422 without it). Mirror the
      // privacy_level: 'public' surface from buildToolConfig — name/email plus
      // the standard LTI launch claims ltijs needs to resolve context + roles.
      claims: [
        'iss',
        'sub',
        'name',
        'given_name',
        'family_name',
        'email',
        'https://purl.imsglobal.org/spec/lti/claim/context',
        'https://purl.imsglobal.org/spec/lti/claim/resource_link',
        'https://purl.imsglobal.org/spec/lti/claim/roles',
      ],
    },
  }
}

// Shape of the platform record we hand to ltijs.registerPlatform. Mirrors the
// public ltijs API; we type it locally to keep this module decoupled from the
// `ltijs` types (which are loose) and to make the test seam explicit.
export interface PlatformRegistration {
  url: string
  name: string
  clientId: string
  authenticationEndpoint: string
  accesstokenEndpoint: string
  authConfig: { method: 'JWK_SET'; key: string }
}

export type RegisterPlatformFn = (
  platform: PlatformRegistration
) => Promise<unknown>

// Default seam wiring — production path. Tests inject their own.
//
// The ltijs provider is imported lazily: `lti/provider.ts` throws on missing
// env and opens a Mongo connection at import time, which would make this
// module (and therefore its unit tests) unloadable without a live database.
const defaultRegisterPlatform: RegisterPlatformFn = async (platform) => {
  const { ltiProvider } = await import('./provider.js')
  return ltiProvider.registerPlatform(platform)
}

const defaultFetch: typeof fetch = (...args) => fetch(...args)

// ltijs throws `new Error('PLATFORM_ALREADY_REGISTERED')` from
// node_modules/ltijs/dist/Provider/Services/DynamicRegistration.js:117 when the
// (issuer, clientId) pair is already on file. We swallow it: re-paste of the
// same registration URL should be a no-op, not a 500.
function isPlatformAlreadyRegistered(err: unknown): boolean {
  return (
    err instanceof Error &&
    /PLATFORM_ALREADY_REGISTERED/i.test(err.message)
  )
}

function sendRejection(res: Response, err: unknown): void {
  if (err instanceof RegistrationRejected) {
    console.warn('[lti/dynamic-registration] rejected', err.status, err.message)
    res.status(err.status).type('text/plain').send(err.message)
    return
  }
  console.error('[lti/dynamic-registration] unexpected guard error', err)
  res.status(500).type('text/plain').send('Internal Server Error')
}

/**
 * Express handler for `GET /lti/register`. Implements the IMS
 * LTI Dynamic Registration v1p0 client side end-to-end, including
 * persistence via ltijs so subsequent launches authenticate.
 *
 * Internal seams (`registerPlatform`, `fetchImpl`) are exposed via
 * `_handleDynamicRegistrationWithDeps` for unit-testing. The public
 * signature stays `(req, res)` so server.ts wiring is unchanged.
 */
export async function handleDynamicRegistration(
  req: Request,
  res: Response
): Promise<void> {
  return _handleDynamicRegistrationWithDeps(req, res, {
    registerPlatform: defaultRegisterPlatform,
    fetchImpl: defaultFetch,
  })
}

export interface DynamicRegistrationDeps {
  registerPlatform: RegisterPlatformFn
  fetchImpl: typeof fetch
}

export async function _handleDynamicRegistrationWithDeps(
  req: Request,
  res: Response,
  deps: DynamicRegistrationDeps
): Promise<void> {
  const { registerPlatform, fetchImpl } = deps

  // Gate 1: the caller must present the configured registration secret.
  // Fails closed when LTI_REGISTRATION_SECRET is unset.
  try {
    assertRegistrationAuthorized(req)
  } catch (err) {
    sendRejection(res, err)
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const query = (req.query ?? {}) as Record<string, unknown>

  const openidConfigUrl = pickParam(body, query, 'openid_configuration')
  const registrationToken = pickParam(body, query, 'registration_token')

  if (!openidConfigUrl || !registrationToken) {
    res
      .status(400)
      .type('text/plain')
      .send(
        'Bad Request: openid_configuration and registration_token query params are required'
      )
    return
  }

  // Gate 2: the fetch target must be an allowlisted https host (SSRF).
  try {
    assertOpenIdConfigAllowed(openidConfigUrl)
  } catch (err) {
    sendRejection(res, err)
    return
  }

  // 1. Fetch the platform's OpenID configuration.
  let openidConfig: OpenIdConfig
  try {
    const r = await fetchImpl(openidConfigUrl, {
      headers: { Accept: 'application/json' },
    })
    if (!r.ok) {
      res
        .status(502)
        .type('text/plain')
        .send(
          `OpenID config fetch failed: ${r.status} ${r.statusText}`
        )
      return
    }
    openidConfig = (await r.json()) as OpenIdConfig
  } catch (err) {
    res
      .status(502)
      .type('text/plain')
      .send(`OpenID config fetch error: ${(err as Error).message}`)
    return
  }

  if (!openidConfig.registration_endpoint) {
    res
      .status(502)
      .type('text/plain')
      .send('OpenID config missing registration_endpoint')
    return
  }

  // The registration endpoint comes from the (already allowlisted) config
  // document, but the document itself is remote input — re-check it so a
  // compromised or spoofed config cannot redirect the bearer token elsewhere.
  try {
    assertOpenIdConfigAllowed(openidConfig.registration_endpoint)
  } catch (err) {
    sendRejection(res, err)
    return
  }

  // 2. Build our client registration body, scoped to placements the platform
  //    advertises support for (Canvas advertises both of ours).
  const platformConfig =
    openidConfig['https://purl.imsglobal.org/spec/lti-platform-configuration']
  const baseUrl = resolveBaseUrl(req)
  const registrationRequest = buildRegistrationRequest(baseUrl, platformConfig)

  // 3. POST it with the registration_token bearer.
  let registrationResponse: Record<string, unknown>
  try {
    const r = await fetchImpl(openidConfig.registration_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${registrationToken}`,
      },
      body: JSON.stringify(registrationRequest),
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      res
        .status(502)
        .type('text/plain')
        .send(
          `Registration POST failed: ${r.status} ${r.statusText} ${text}`
        )
      return
    }
    registrationResponse = (await r.json()) as Record<string, unknown>
  } catch (err) {
    res
      .status(502)
      .type('text/plain')
      .send(`Registration POST error: ${(err as Error).message}`)
    return
  }

  const clientId = registrationResponse.client_id
  if (typeof clientId !== 'string' || clientId.length === 0) {
    res
      .status(502)
      .type('text/plain')
      .send('Registration response missing client_id')
    return
  }

  // 4. Inspect the platform's echo of the LTI tool-config — confirms which
  //    placements Canvas accepted. Used in the success log.
  const toolConfigEcho = (registrationResponse[
    'https://purl.imsglobal.org/spec/lti-tool-configuration'
  ] ?? {}) as { messages?: unknown[] }
  const acceptedPlacementCount = Array.isArray(toolConfigEcho.messages)
    ? toolConfigEcho.messages.length
    : 0

  // 5. Persist the platform via ltijs so subsequent LTI launches authenticate.
  //    Mirrors what ltijs's own DynamicRegistration.register() does at
  //    node_modules/ltijs/dist/Provider/Services/DynamicRegistration.js:119-131,
  //    but on our schedule. PLATFORM_ALREADY_REGISTERED is treated as a no-op
  //    for re-registration idempotency.
  try {
    await registerPlatform({
      url: openidConfig.issuer,
      name: platformConfig?.product_family_code ?? openidConfig.issuer,
      clientId,
      authenticationEndpoint: openidConfig.authorization_endpoint,
      accesstokenEndpoint: openidConfig.token_endpoint,
      authConfig: { method: 'JWK_SET', key: openidConfig.jwks_uri },
    })
  } catch (err) {
    if (isPlatformAlreadyRegistered(err)) {
      console.info(
        '[lti/dynamic-registration] platform already registered, continuing',
        JSON.stringify({ issuer: openidConfig.issuer, client_id: clientId })
      )
    } else {
      // Don't leak internals; ltijs/Mongo errors can carry connection strings.
      console.error(
        '[lti/dynamic-registration] registerPlatform failed',
        (err as Error)?.message
      )
      res
        .status(500)
        .type('text/plain')
        .send('Internal Server Error: failed to persist platform')
      return
    }
  }

  console.info(
    '[lti/dynamic-registration] client registered',
    JSON.stringify({
      client_id: clientId,
      issuer: openidConfig.issuer,
      accepted_placements: acceptedPlacementCount,
    })
  )

  // 6. Render the close-window HTML.
  res.status(200).type('text/html; charset=utf-8').send(CLOSE_TEMPLATE)
}
