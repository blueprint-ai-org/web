/**
 * BP AI consumer-API types.
 *
 * Hand-written from *observed* gateway behaviour, not from the reference doc:
 * `../../../../thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`
 * (Phase 0 spike, measured 2026-08-24). Where that document and the API
 * reference disagree, the document wins — it was measured.
 */

import type { Role } from './gql/schema'

/**
 * The gateway's `AuthPayload`, returned by `login` / `signup` / `refreshToken`
 * / `acceptInvitation`.
 *
 * GENERATED, not hand-written: it is an alias of the codegen fragment, so it
 * cannot drift from the schema again. The hand-written version declared all
 * four fields nullable because it was written from observed behaviour; the
 * schema declares them `String!`, and every caller carried a null branch that
 * could not happen.
 *
 * Non-null is not non-empty, though: `validateToken` resolves with an EMPTY
 * `token`, so `isAuthPayload` in `auth.server.ts` still checks for presence.
 *
 * Field names stay snake_case — that is the wire format. Map to `BpSession` at
 * the operation boundary.
 */
export type { AuthPayloadFieldsFragment as AuthPayload } from './gql/graphql'

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
   * Absolute expiry of `accessToken` in epoch **milliseconds**, as the gateway
   * SIGNED it (`expires_at`). It used to be computed here from a 900-second
   * constant and our own clock.
   */
  accessTokenExpiresAt: number
  /**
   * The role on the signed claim.
   *
   * Every credential session used to be `'student'` — a constant, because the
   * payload carried no role at all. It routes the app, so it is not optional:
   * a session without one is a session we cannot place.
   */
  role: Role
  /**
   * When the refresh half dies, epoch **milliseconds**, or `null` when the
   * response minted none. It is what the cookie's `Max-Age` is derived from:
   * a cookie that outlives its refresh token is a session that looks alive and
   * cannot be renewed.
   */
  refreshExpiresAt: number | null
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
  /** Signed in, but the credential lacks the role. Sending them to login loops. */
  | 'not_permitted'
  /** A downstream service is unreachable. Retrying is the right advice. */
  | 'unreachable'
  /**
   * The invitation link is unusable — expired, already used, or of another
   * kind. Its own kind because the screen is different from a dead session,
   * and because `invite.tsx` used to infer it from `unauthenticated|validation`,
   * which also fires for a wrong password.
   */
  | 'invitation_invalid'
  | 'unknown'

/** Every failure the client can report, transport and GraphQL alike. */
export interface BpAiError {
  kind: BpAiErrorKind
  /**
   * `extensions.reason`: the domain RULE the gateway published, when a service
   * named one. A member of the schema's `ErrorReason`; the gateway drops
   * anything it does not publish, so this is never a surprise value.
   */
  reason?: string
  /** `extensions.field`: the input that failed validation, when named. */
  field?: string
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
