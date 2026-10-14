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
import type { TypedDocumentString } from './gql/graphql'

export interface GraphqlOptions {
  /**
   * Access token to authenticate with. **Omit it** for the `NO_USER`
   * operations (`login`, `joinTenant`, `refreshToken`): the gateway rejects those
   * outright when the request arrives already authenticated
   * (`BAD_REQUEST: User already authenticated`). Omitting sends no credential
   * header at all.
   */
  accessToken?: string
}

/** A single entry of a GraphQL `errors[]` array, as this gateway emits them. */
interface GqlErrorEntry {
  message?: unknown
  extensions?: { code?: unknown; reason?: unknown; field?: unknown } | null
}

interface GqlResponseBody {
  data?: unknown
  errors?: unknown
}


/** Cap on how much of an unexpected body we keep for logs. */
const RAW_SNIPPET_LIMIT = 500

/**
 * Map a gateway error onto a `BpAiErrorKind`, from `extensions` alone.
 *
 * Until step-5 this matched SUBSTRINGS of the message, because the gateway gave
 * a machine-readable code for exactly one case. Every other kind depended on
 * backend prose, so a reword downgraded a case to `unknown` silently and the
 * screen fell back to generic copy. The schema now publishes `ErrorCode` and
 * `ErrorReason`, and the message is explicitly not contract.
 *
 * `reason` wins over `code` where both say something: `UNAUTHENTICATED` +
 * `INVITATION_INVALID` is a dead link, which is a different screen from a dead
 * session even though the code is the same.
 */
function classifyKind(code: string | undefined, reason: string | undefined): BpAiErrorKind {
  switch (reason) {
    case 'INVITATION_INVALID':
      return 'invitation_invalid'
    case 'INVALID_CREDENTIALS':
      return 'invalid_credentials'
    case 'TOKEN_REVOKED':
    case 'REFRESH_TOKEN_REUSED':
      return 'unauthenticated'
    case 'PASSWORD_TOO_SHORT':
    case 'PASSWORD_TOO_LONG':
    case 'JOIN_CODE_INVALID':
      return 'validation'
  }

  switch (code) {
    case 'EMAIL_ALREADY_REGISTERED':
      return 'duplicate_email'
    case 'UNAUTHORIZED':
    case 'INVALID_TOKEN':
    case 'INVALID_API_KEY':
      return 'unauthenticated'
    case 'FORBIDDEN':
      // Signed in, lacking the role. NOT `unauthenticated`: sending this user
      // to the login screen would be a loop.
      return 'not_permitted'
    case 'BAD_REQUEST':
    case 'VALIDATION_FAILED':
      return 'validation'
    case 'SERVICE_UNAVAILABLE':
    case 'TIMEOUT':
    case 'UNAVAILABLE':
    case 'PAYMENT_UNAVAILABLE':
      return 'unreachable'
    default:
      return 'unknown'
  }
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
  const code = asString(first?.extensions?.code)
  const reason = asString(first?.extensions?.reason)
  const field = asString(first?.extensions?.field)

  const error: BpAiError = {
    // The message is kept for the LOG only. Nothing branches on it any more.
    kind: classifyKind(code, reason),
    message: rawMessage || 'The BP AI API rejected the request.',
    status,
  }
  if (code !== undefined) error.code = code
  if (reason !== undefined) error.reason = reason
  if (field !== undefined) error.field = field
  return error
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
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
 * Two shapes, and the first is the one to use:
 *
 * 1. A `TypedDocumentString` from `./gql` — generated from the gateway's
 *    published SDL, so the result type and the variables are *derived* from
 *    the document rather than asserted next to it. A selection set that does
 *    not validate against the schema fails `npm run codegen`, which is a
 *    build error instead of an `undefined` at runtime.
 * 2. A plain string, with `T` asserted by the caller. This is the pre-codegen
 *    signature and it stays only while modules are still being migrated —
 *    step-27 removes it once nothing calls it.
 *
 * Resolves `{ ok: true, data }` on success, `{ ok: false, error }` for every
 * expected failure.
 */
export async function graphql<TResult, TVariables extends Record<string, unknown>>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
  opts?: GraphqlOptions,
): Promise<GqlResult<TResult>>
export async function graphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: GraphqlOptions,
): Promise<GqlResult<T>>
export async function graphql<T>(
  query: string | TypedDocumentString<unknown, Record<string, unknown>>,
  variables: Record<string, unknown> = {},
  opts: GraphqlOptions = {},
): Promise<GqlResult<T>> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  }
  if (opts.accessToken) {
    headers.authorization = `Bearer ${opts.accessToken}`
  }

  let status = 0
  let text = ''
  try {
    const response = await fetch(BP_AI_GRAPHQL_URL, {
      method: 'POST',
      headers,
      // `query` may be a TypedDocumentString, which is a String OBJECT rather
      // than a primitive. `JSON.stringify` unwraps one on its own (it reads
      // [[StringData]]), so this is for explicitness and not a fix: measured
      // 2026-10-13 by removing it, and the body is byte-identical either way.
      body: JSON.stringify({ query: String(query), variables }),
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
