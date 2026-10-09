/**
 * BP AI consumer-API types.
 *
 * Hand-written from *observed* gateway behaviour, not from the reference doc:
 * `../../../../thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`
 * (Phase 0 spike, measured 2026-08-24). Where that document and the API
 * reference disagree, the document wins — it was measured.
 */

/**
 * The gateway's `AuthPayload`, returned by `login` / `signup` / `refreshToken`
 * / `validateToken`.
 *
 * Field names are exactly as introspected — the access token is `token`, NOT
 * `access_token`, and the snake_case is the wire format, so it is preserved
 * here rather than camelCased. Map to `BpSession` at the operation boundary.
 *
 * The schema declares every field as nullable `String`, and `validateToken`
 * really does return an **empty** `token` — never read `token` off a validate
 * response. Operation wrappers must therefore check for presence before
 * building a `BpSession`; this type describes the shape, not a guarantee.
 */
export interface AuthPayload {
  /** Access token: HS256 JWT, `iss: agatha-auth`, 900s lifetime (measured). */
  token: string
  /** Refresh token: 64-char opaque hex. Rotates on every use. */
  refresh_token: string
  user_id: string
  tenant: string
}

/**
 * Our server-side session, derived from an `AuthPayload`. camelCase because
 * this is ours, not the wire's; `snake_case` stops at `AuthPayload`.
 *
 * This is the repo's first session-shaped type — `lti/session.ts` signs raw
 * Canvas claims and has no equivalent.
 */
export interface BpSession {
  accessToken: string
  refreshToken: string
  userId: string
  tenant: string
  /**
   * Absolute expiry of `accessToken` in epoch **milliseconds**. The gateway
   * issues access tokens with `exp - iat === 900` exactly, so this is
   * computable at issue time without decoding the JWT.
   */
  accessTokenExpiresAt: number
}

/**
 * Normalised failure kind. The gateway supplies a machine-readable
 * `extensions.code` for exactly one case (`EMAIL_ALREADY_REGISTERED`), so
 * every other kind is matched on message substrings — see `classifyKind` in
 * `client.server.ts` for the mapping and its fragility.
 */
export type BpAiErrorKind =
  | 'network'
  | 'invalid_credentials'
  | 'duplicate_email'
  | 'validation'
  | 'unauthenticated'
  | 'unknown'

/** Every failure the client can report, transport and GraphQL alike. */
export interface BpAiError {
  kind: BpAiErrorKind
  /**
   * Human-readable message with the gateway's internal
   * `rpc error: code = … desc = ` transport prefix stripped.
   */
  message: string
  /** `extensions.code`, when the gateway supplies one. */
  code?: string
  /** HTTP status, when a response arrived at all. */
  status?: number
  /** Untouched gateway message (or body snippet), for logs. */
  raw?: string
}

/**
 * Result of a gateway call. The client resolves with this instead of throwing
 * for expected failures, so callers must branch on `ok` rather than
 * `try`/`catch`.
 */
export type GqlResult<T> = { ok: true; data: T } | { ok: false; error: BpAiError }
