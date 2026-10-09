/**
 * Dependency-free GraphQL client for the BP AI consumer API.
 *
 * Hand-rolled on native `fetch` (decision D9): the repo ships no HTTP or
 * GraphQL client at all, and one endpoint with five operations and no caching
 * needs does not justify adding one.
 *
 * Everything here is server-only. Callers get a discriminated `GqlResult<T>`
 * and must branch on `ok`; the client never throws for an expected failure
 * (bad password, duplicate email, dead network). It only throws for a
 * programming error, and there is currently none it can raise.
 *
 * Contract source of truth (measured, not documented):
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`.
 * Two facts from it shape this whole file:
 *
 *  1. **Every failure is HTTP 200** with `data: null` and a GraphQL `errors[]`
 *     array. Status codes carry almost no signal, so classification happens on
 *     the payload.
 *  2. **Only duplicate-email carries `extensions.code`.** Every other kind is
 *     matched on message substrings — see `classifyKind`.
 */

import { BP_AI_GRAPHQL_URL } from './config.server'
import type { BpAiError, BpAiErrorKind, GqlResult } from './types'

/**
 * How to render the access token into the `Authorization` header.
 *
 * `'bearer'` is correct for every operation except one. **`validateToken`
 * requires `'raw'`**: its resolver feeds the entire header value into the JWT
 * parser without stripping the scheme, so `Bearer <jwt>` fails to base64-decode
 * ("illegal base64 data at input byte 6" — byte 6 is the space). The gateway's
 * own auth middleware handles `Bearer` correctly everywhere else; `logout` and
 * `login` both prove it.
 *
 * This is a **known backend bug**, not a contract. It is an explicit per-call
 * flag rather than a client-wide default precisely so that a fix on their side
 * surfaces as one failing operation with a pointer to this comment, instead of
 * silently breaking a global raw-token workaround. When `validateToken` starts
 * accepting `Bearer`, delete the flag from that call site and then from here.
 */
export type AuthScheme = 'bearer' | 'raw'

export interface GraphqlOptions {
  /**
   * Access token to authenticate with. **Omit it** for the `NO_USER`
   * operations (`login`, `signup`, `refreshToken`): the gateway rejects those
   * outright when the request arrives already authenticated
   * (`BAD_REQUEST: User already authenticated`). Omitting sends no credential
   * header at all.
   */
  accessToken?: string
  /** Defaults to `'bearer'`. Pass `'raw'` only for `validateToken`. */
  authScheme?: AuthScheme
}

/** A single entry of a GraphQL `errors[]` array, as this gateway emits them. */
interface GqlErrorEntry {
  message?: unknown
  extensions?: { code?: unknown } | null
}

interface GqlResponseBody {
  data?: unknown
  errors?: unknown
}

/**
 * The gateway leaks its internal transport layer into user-visible messages,
 * e.g. `rpc error: code = Unknown desc = invalid credentials`. Strip it before
 * matching or displaying.
 */
const RPC_PREFIX = /^rpc error: code = \S+ desc = /

/** Cap on how much of an unexpected body we keep for logs. */
const RAW_SNIPPET_LIMIT = 500

function normaliseMessage(raw: string): string {
  return raw.replace(RPC_PREFIX, '').trim()
}

/**
 * Map a gateway error onto a `BpAiErrorKind`.
 *
 * Every string below was observed in the Phase 0 spike — see the error table in
 * the findings doc. **This is the most fragile code in the module**: apart from
 * `EMAIL_ALREADY_REGISTERED` the gateway gives us no machine-readable code, so
 * a backend reword silently downgrades a case to `unknown`. That is the failure
 * mode to expect, and it is why `unknown` keeps the raw message.
 *
 * Checks are ordered most-specific-first; the two `authenticated` cases are
 * genuinely different and must not be collapsed:
 *   - "User already authenticated"  → we sent a credential to a NO_USER op (our bug)
 *   - "Authentication required"     → we sent none to a USER op (session gone)
 */
function classifyKind(message: string, code: string | undefined): BpAiErrorKind {
  if (code === 'EMAIL_ALREADY_REGISTERED') return 'duplicate_email'

  const m = message.toLowerCase()

  // signup with an address that already exists
  if (m.includes('email already registered')) return 'duplicate_email'

  // login with a wrong password
  if (m.includes('invalid credentials')) return 'invalid_credentials'

  // a credential was sent to a NO_USER operation, or the gateway rejected the
  // request shape. `BAD_REQUEST:` is its generic client-error prefix.
  if (m.includes('user already authenticated') || m.startsWith('bad_request')) {
    return 'validation'
  }

  // the session is not usable: absent, revoked, or reuse-detected. A malformed
  // token lands here too — including the `Bearer`-prefix bug above, which is
  // why the raw message is preserved for the log.
  if (
    m.startsWith('unauthorized') ||
    m.includes('authentication required') ||
    m.includes('refresh token reuse detected') ||
    m.includes('token revoked') ||
    m.includes('failed to validate token') ||
    m.includes('token is malformed')
  ) {
    return 'unauthenticated'
  }

  return 'unknown'
}

function asErrorEntries(errors: unknown): GqlErrorEntry[] {
  if (!Array.isArray(errors)) return []
  return errors.filter((e): e is GqlErrorEntry => typeof e === 'object' && e !== null)
}

/**
 * Build a `BpAiError` from a GraphQL `errors[]` array. The first entry wins —
 * these operations return exactly one error in practice, and the first is the
 * one worth showing a user.
 */
function mapGraphqlErrors(entries: GqlErrorEntry[], status: number): BpAiError {
  const first = entries[0]
  const rawMessage = typeof first?.message === 'string' ? first.message : ''
  const rawCode = first?.extensions?.code
  const code = typeof rawCode === 'string' ? rawCode : undefined
  const message = normaliseMessage(rawMessage) || 'The BP AI API rejected the request.'

  const error: BpAiError = {
    kind: classifyKind(message, code),
    message,
    status,
  }
  if (code !== undefined) error.code = code
  if (rawMessage !== message) error.raw = rawMessage
  return error
}

function networkError(message: string, opts: { status?: number; raw?: string } = {}): BpAiError {
  const error: BpAiError = { kind: 'network', message }
  if (opts.status !== undefined) error.status = opts.status
  if (opts.raw !== undefined) error.raw = opts.raw
  return error
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Execute one operation against the BP AI gateway.
 *
 * @param query     GraphQL document. Callers own the selection set — the
 *                  gateway's field names are snake_case (`refresh_token`).
 * @param variables Operation variables; omit for none.
 * @param opts      See {@link GraphqlOptions}.
 *
 * Resolves `{ ok: true, data }` on success, `{ ok: false, error }` for every
 * expected failure. `T` is asserted, not validated — the caller owns the
 * selection set, so the caller owns the shape.
 */
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: GraphqlOptions = {},
): Promise<GqlResult<T>> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  }
  if (opts.accessToken) {
    headers.authorization =
      opts.authScheme === 'raw' ? opts.accessToken : `Bearer ${opts.accessToken}`
  }

  let status = 0
  let text = ''
  try {
    const response = await fetch(BP_AI_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })
    status = response.status
    text = await response.text()
  } catch (err) {
    // DNS failure, TLS failure, connection reset, aborted body — anything that
    // means we never got a complete answer.
    return {
      ok: false,
      error: networkError(`BP AI request failed: ${messageOf(err)}`, { raw: messageOf(err) }),
    }
  }

  let body: GqlResponseBody | null = null
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed !== null && typeof parsed === 'object') body = parsed as GqlResponseBody
  } catch {
    body = null
  }

  // GraphQL errors first, and regardless of status: this gateway answers 200
  // for application failures, but a spec-compliant 4xx with a usable errors[]
  // must classify the same way rather than being flattened into `network`.
  const entries = asErrorEntries(body?.errors)
  if (entries.length > 0) {
    return { ok: false, error: mapGraphqlErrors(entries, status) }
  }

  if (status < 200 || status >= 300) {
    return {
      ok: false,
      error: networkError(`BP AI API returned HTTP ${status}.`, {
        status,
        raw: text.slice(0, RAW_SNIPPET_LIMIT),
      }),
    }
  }

  // 2xx that is not JSON, or is JSON but not an object: a proxy or gateway
  // spoke instead of the API. Same actionable meaning as a transport failure.
  if (body === null) {
    return {
      ok: false,
      error: networkError('BP AI API returned a non-JSON body.', {
        status,
        raw: text.slice(0, RAW_SNIPPET_LIMIT),
      }),
    }
  }

  if (body.data === null || body.data === undefined) {
    return {
      ok: false,
      error: {
        kind: 'unknown',
        message: 'BP AI API returned no data and no errors.',
        status,
        raw: text.slice(0, RAW_SNIPPET_LIMIT),
      },
    }
  }

  return { ok: true, data: body.data as T }
}
