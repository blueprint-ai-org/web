import { jwtVerify } from 'jose'

const ltiSecret = new TextEncoder().encode(process.env.LTI_KEY ?? '')

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1))
  }
  return null
}

async function verifyJwt(raw: string) {
  if (!process.env.LTI_KEY) return null
  try {
    const { payload } = await jwtVerify(raw, ltiSecret, { algorithms: ['HS256'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (payload as any).token ?? null
  } catch {
    return null
  }
}

/**
 * Resolve the active LTI claims token for this request.
 *
 * Two transports are accepted:
 *   1. `?lti_session=<jwt>` URL query param — the cookieless transport that
 *      survives Safari ITP / Firefox Strict ETP in iframe context. Set by
 *      `handleValidate` redirecting to `/app?lti_session=<jwt>`.
 *   2. `Cookie: lti-claims=<jwt>` — legacy transport for browsers that
 *      accept third-party cookies in an iframe (Chrome by default).
 *
 * URL param wins when both are present so a fresh launch overrides any
 * stale cookie from a previous session.
 */
export async function getLtiToken(request: Request) {
  const url = new URL(request.url)
  const fromUrl = url.searchParams.get('lti_session')
  if (fromUrl) {
    const token = await verifyJwt(fromUrl)
    if (token) return token
    // Fall through to cookie if the URL param was malformed/expired.
  }

  const cookie = request.headers.get('cookie')
  const raw = readCookie(cookie, 'lti-claims')
  if (!raw) return null
  return verifyJwt(raw)
}
