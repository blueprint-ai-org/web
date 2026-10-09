// Access control for `GET /lti/register` (LTI Dynamic Registration).
//
// The handler used to be fully open: anyone who could reach the URL could
// hand us an arbitrary `openid_configuration` URL, have the server fetch it,
// and get their own issuer + JWKS persisted via ltijs.registerPlatform. From
// there they could mint an id_token with an Administrator role that our
// launch path — and, downstream, `signupCanvas` — would treat as genuine.
//
// Two independent gates now stand in front of it:
//
//   1. A shared registration secret (LTI_REGISTRATION_SECRET). District
//      admins paste `https://<host>/lti/register?registration_secret=<value>`;
//      Canvas appends its own `openid_configuration` / `registration_token`
//      params to that URL. Compared in constant time. When the env var is
//      unset, registration is DISABLED (fail closed) rather than open.
//   2. A host allowlist for the `openid_configuration` URL, so the fetch
//      cannot be pointed at an attacker-controlled or internal-network host
//      (SSRF). Defaults to Instructure's own domains plus the host of
//      CANVAS_ISSUER; override with LTI_REGISTRATION_ALLOWED_HOSTS.
import { timingSafeEqual } from 'node:crypto'
import type { Request } from 'express'

export const REGISTRATION_SECRET_PARAM = 'registration_secret'

/** Default suffixes/hosts accepted for the openid_configuration fetch. */
const DEFAULT_ALLOWED_HOST_SUFFIXES = [
  'instructure.com',
  'canvaslms.com',
]

export class RegistrationRejected extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'RegistrationRejected'
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  // timingSafeEqual throws on length mismatch; compare lengths separately and
  // still run the comparison so the timing profile stays flat for same-length
  // guesses (the only case an attacker can iterate on usefully).
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Throws RegistrationRejected unless the request carries the configured
 * registration secret (query param, or `Authorization: Bearer <secret>`).
 */
export function assertRegistrationAuthorized(req: Request): void {
  const configured = process.env.LTI_REGISTRATION_SECRET?.trim()
  if (!configured) {
    throw new RegistrationRejected(
      503,
      'Dynamic registration is disabled: LTI_REGISTRATION_SECRET is not configured'
    )
  }

  const query = (req.query ?? {}) as Record<string, unknown>
  const fromQuery = query[REGISTRATION_SECRET_PARAM]
  const header = req.headers?.authorization
  const fromHeader =
    typeof header === 'string' && /^Bearer\s+/i.test(header)
      ? header.replace(/^Bearer\s+/i, '').trim()
      : undefined

  const presented =
    (typeof fromQuery === 'string' && fromQuery.length > 0 ? fromQuery : undefined) ??
    fromHeader

  if (!presented || !constantTimeEquals(presented, configured)) {
    throw new RegistrationRejected(401, 'Unauthorized: invalid registration secret')
  }
}

/** Hosts allowed as the target of the openid_configuration fetch. */
export function allowedRegistrationHosts(): string[] {
  const configured = (process.env.LTI_REGISTRATION_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
  if (configured.length > 0) return configured

  const hosts = [...DEFAULT_ALLOWED_HOST_SUFFIXES]
  const issuer = process.env.CANVAS_ISSUER?.trim()
  if (issuer) {
    try {
      hosts.push(new URL(issuer).hostname.toLowerCase())
    } catch {
      // Malformed CANVAS_ISSUER — ignore; the defaults still apply.
    }
  }
  return hosts
}

function hostMatches(hostname: string, allowed: string): boolean {
  return hostname === allowed || hostname.endsWith(`.${allowed}`)
}

/**
 * Throws RegistrationRejected unless `rawUrl` is an https URL on an allowlisted
 * host. Returns the parsed URL on success.
 */
export function assertOpenIdConfigAllowed(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new RegistrationRejected(400, 'Bad Request: openid_configuration is not a valid URL')
  }
  if (url.protocol !== 'https:') {
    throw new RegistrationRejected(
      400,
      'Bad Request: openid_configuration must be an https URL'
    )
  }
  const hostname = url.hostname.toLowerCase()
  const allowed = allowedRegistrationHosts()
  if (!allowed.some((a) => hostMatches(hostname, a))) {
    throw new RegistrationRejected(
      403,
      `Forbidden: openid_configuration host "${hostname}" is not allowlisted`
    )
  }
  return url
}
