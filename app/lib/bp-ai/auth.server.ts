/**
 * The five BP AI auth operations, as thin typed wrappers over the Phase 1
 * client (`client.server.ts`).
 *
 * Each wrapper owns exactly three things — the GraphQL document, the auth
 * scheme the operation needs, and the unwrapping of `data.<field>` into a
 * validated payload. Nothing here classifies errors (the client does that) and
 * nothing here decides what a user sees (the route actions do that).
 *
 * Every document below is transcribed from the **introspected** schema, not the
 * reference doc:
 *
 * ```graphql
 * login(email: String, password: String): AuthPayload
 * signup(email: String, password: String, name: String, org_name: String): AuthPayload
 * acceptInvitation(token: String!, password: String!): AuthPayload!
 * refreshToken(refresh_token: String): AuthPayload
 * logout(refresh_token: String): Boolean
 * type AuthPayload { token: String, refresh_token: String, user_id: String, tenant: String }
 * ```
 *
 * All five live on the **Mutation** type, including the read-shaped ones. The
 * variables are declared `String!` even though the args are nullable `String`:
 * passing a non-null variable to a nullable arg is legal GraphQL, and it makes
 * the gateway reject a missing value instead of silently resolving with `null`.
 * That exact form is what the Phase 0 spike proved against the live host.
 *
 * Contract source of truth (measured, not documented):
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`.
 */

import { graphql } from './client.server'
import type { AuthPayload, BpSession, GqlResult } from './types'

/**
 * Every `AuthPayload` field, measured lifetime included. The schema declares
 * all four as nullable `String`, so {@link isAuthPayload} re-checks them at
 * runtime rather than trusting the selection set.
 */
const AUTH_PAYLOAD_FIELDS = '{ token refresh_token user_id tenant }'

/**
 * Access-token lifetime in **seconds**.
 *
 * Measured, not documented: `exp - iat === 900` exactly on every token the
 * Phase 0 spike observed. The gateway never tells us the expiry in the
 * response, so this constant is the only way to compute
 * `BpSession.accessTokenExpiresAt` without decoding the JWT — which would mean
 * trusting an unverified token's own claims about itself.
 *
 * If the backend changes the lifetime this becomes wrong in the *safe*
 * direction only when it gets longer. A shorter real lifetime means Phase 4's
 * middleware refreshes too late and a call 401s; the recovery path for that is
 * the same `unauthenticated` handling a revoked token already needs.
 */
export const BP_ACCESS_TOKEN_LIFETIME_SECONDS = 900

const LOGIN_DOCUMENT = `mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) ${AUTH_PAYLOAD_FIELDS}
}`

const SIGNUP_DOCUMENT = `mutation Signup($email: String!, $password: String!, $name: String!) {
  signup(email: $email, password: $password, name: $name) ${AUTH_PAYLOAD_FIELDS}
}`

const ACCEPT_INVITATION_DOCUMENT = `mutation AcceptInvitation($token: String!, $password: String!) {
  acceptInvitation(token: $token, password: $password) ${AUTH_PAYLOAD_FIELDS}
}`

const REFRESH_DOCUMENT = `mutation Refresh($refresh_token: String!) {
  refreshToken(refresh_token: $refresh_token) ${AUTH_PAYLOAD_FIELDS}
}`

const LOGOUT_DOCUMENT = `mutation Logout($refresh_token: String!) {
  logout(refresh_token: $refresh_token)
}`

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Accept a payload only if all four fields arrived non-empty.
 *
 * Not paranoia: `validateToken` genuinely returns an **empty** `token`, which
 * proves the gateway will happily resolve an `AuthPayload` with holes in it. A
 * half-populated payload must fail here rather than seal a session with an
 * empty access token that every later request would then 401 on.
 */
function isAuthPayload(value: unknown): value is AuthPayload {
  if (value === null || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    nonEmptyString(payload.token) &&
    nonEmptyString(payload.refresh_token) &&
    nonEmptyString(payload.user_id) &&
    nonEmptyString(payload.tenant)
  )
}

/**
 * Run an `AuthPayload`-returning mutation and unwrap `data.<field>`.
 *
 * The client resolves with the whole `data` object — it does not know which
 * operation it just ran — so the field name is passed in. A shape failure maps
 * to `unknown`, which is correct: a well-formed response we cannot use is a
 * contract break, not a credential problem, and the raw field name in the
 * message is what makes it diagnosable in a log.
 */
async function authMutation(
  field: string,
  document: string,
  variables: Record<string, unknown>,
): Promise<GqlResult<AuthPayload>> {
  const result = await graphql<Record<string, unknown>>(document, variables)
  if (!result.ok) return result

  const payload = result.data[field]
  if (!isAuthPayload(payload)) {
    return {
      ok: false,
      error: {
        kind: 'unknown',
        message: `BP AI ${field} returned an unusable AuthPayload.`,
        raw: JSON.stringify(payload),
      },
    }
  }
  return { ok: true, data: payload }
}

/**
 * Exchange credentials for a token pair.
 *
 * `NO_USER`: sends no `Authorization` header, because the gateway rejects this
 * outright (`BAD_REQUEST: User already authenticated`) when the request already
 * carries a credential.
 */
export function bpLogin(email: string, password: string): Promise<GqlResult<AuthPayload>> {
  return authMutation('login', LOGIN_DOCUMENT, { email, password })
}

/**
 * Create an account and return its first token pair.
 *
 * **`org_name` is deliberately not sent.** The schema accepts it, and the
 * Phase 0 spike established what this operation really does: every
 * self-service signup **provisions a brand-new tenant and makes the signer its
 * `admin`**. That is an org-creation flow, not a student-joins-a-school flow,
 * and it contradicts decision D5. Sending an `org_name` would not change that
 * — it would only name the org we did not want created.
 *
 * This wrapper therefore matches the plan's contract (email + password + name,
 * per D7) and the mismatch stays where the research doc put it: a blocker on
 * the *product* question of how a student joins an existing tenant, to be
 * answered before the Phase 6 signup screen ships. Nothing about that question
 * changes the shape of this call.
 *
 * `NO_USER`, same as {@link bpLogin}.
 */
export function bpSignup(
  email: string,
  password: string,
  name: string,
): Promise<GqlResult<AuthPayload>> {
  return authMutation('signup', SIGNUP_DOCUMENT, { email, password, name })
}

/**
 * Redeem an invitation token, set the password, and come back with a session.
 *
 * **The one operation here that creates a credential without creating a
 * tenant**, and therefore the only way a *student* can get a password-login at
 * all. `bpSignup` provisions a brand-new org and makes the signer its `admin`
 * (see its doc comment, and `isSignupEnabled()`); this joins a person an admin
 * already created, inside the school they were created in, with the role they
 * were created with. That is the flow D5 assumes and the one `/signup` could
 * not provide.
 *
 * The gateway's own description: *"Redeems an invitation token, sets the
 * password and returns a full session — the invitee is logged in the moment
 * they choose a password. Unauthenticated on purpose: the token IS the
 * credential. Single use; a re-invitation invalidates the previous token."*
 *
 * `NO_USER`, for the same reason as {@link bpLogin}: the request must not carry
 * an `Authorization` header. Somebody accepting an invitation on a device that
 * still holds a stale `bp-session` would otherwise be answered
 * `BAD_REQUEST: User already authenticated` — which is the most likely device
 * for this to happen on.
 *
 * Contract: `thoughts/sergio/research/2026-09-16-bp-ai-master-admin-contract-live.md` §3.
 */
export function bpAcceptInvitation(
  token: string,
  password: string,
): Promise<GqlResult<AuthPayload>> {
  return authMutation('acceptInvitation', ACCEPT_INVITATION_DOCUMENT, { token, password })
}

/**
 * Trade a refresh token for a fresh pair.
 *
 * **The refresh token rotates on every call** — the returned
 * `refresh_token` differs from the one sent, and the old one is spent. Reusing
 * a spent token gets `refresh token reuse detected; family revoked`, which
 * kills the refresh family but leaves already-issued access tokens working
 * until they expire. Callers must persist the new pair, and must not run two
 * refreshes concurrently (Phase 4's single-flight guard).
 *
 * `NO_USER`: no `Authorization` header — the refresh token *is* the credential.
 */
export function bpRefresh(refreshToken: string): Promise<GqlResult<AuthPayload>> {
  return authMutation('refreshToken', REFRESH_DOCUMENT, { refresh_token: refreshToken })
}

/**
 * End a session server-side. Resolves with the gateway's `Boolean`.
 *
 * Two non-obvious requirements, both measured:
 *
 *  1. **This is a `USER` operation.** Called with no `Authorization` header it
 *     returns `UNAUTHORIZED: Authentication required`. It needs the access
 *     token *and* the refresh token.
 *  2. **The access token must be sent RAW, not as `Bearer <token>`.** With
 *     `Bearer` the gateway returns `true` and kills the refresh family, but the
 *     access-token revocation step silently no-ops; sent raw, a subsequent
 *     `validateToken` reproducibly reports `token revoked`. Raw is the only
 *     variant observed to actually revoke, so raw is what we send. The findings
 *     doc marks the underlying semantics UNRESOLVED — see the caveat below.
 *
 * **Treat the result as best-effort.** Callers must clear the local
 * `bp-session` cookie whether this resolves `ok` or not. A user is never left
 * logged in locally because a network call failed, and we never assume the
 * gateway has invalidated a token the user still holds.
 */
export async function bpLogout(
  accessToken: string,
  refreshToken: string,
): Promise<GqlResult<boolean>> {
  const result = await graphql<Record<string, unknown>>(
    LOGOUT_DOCUMENT,
    { refresh_token: refreshToken },
    { accessToken, authScheme: 'raw' },
  )
  if (!result.ok) return result
  return { ok: true, data: result.data.logout === true }
}

/**
 * Map a gateway payload onto our session shape, stamping the access token's
 * absolute expiry.
 *
 * This is the one place the 900s lifetime is applied, and the boundary where
 * the wire's snake_case stops (see the `AuthPayload` / `BpSession` note in
 * `types.ts`). `now` is injectable so tests can assert the arithmetic instead
 * of tolerating a range.
 */
export function bpSessionFromPayload(payload: AuthPayload, now: number = Date.now()): BpSession {
  return {
    accessToken: payload.token,
    refreshToken: payload.refresh_token,
    userId: payload.user_id,
    tenant: payload.tenant,
    accessTokenExpiresAt: now + BP_ACCESS_TOKEN_LIFETIME_SECONDS * 1000,
  }
}
