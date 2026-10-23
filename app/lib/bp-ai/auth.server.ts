/**
 * The BP AI auth operations, as thin typed wrappers over the Phase 1
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
 * joinTenant(code: String!, email: String!, name: String!): Boolean!
 * acceptInvitation(token: String!, password: String!): AuthPayload!
 * refreshToken(refresh_token: String): AuthPayload
 * logout(refresh_token: String): Boolean
 * type AuthPayload { token: String, refresh_token: String, user_id: String, tenant: String }
 * ```
 *
 * All of them live on the **Mutation** type, including the read-shaped ones. The
 * variables are declared `String!` even though the args are nullable `String`:
 * passing a non-null variable to a nullable arg is legal GraphQL, and it makes
 * the gateway reject a missing value instead of silently resolving with `null`.
 * That exact form is what the Phase 0 spike proved against the live host.
 *
 * Contract source of truth (measured, not documented):
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { AuthPayload, BpSession, GqlResult } from './types'

/**
 * The payload, written once.
 *
 * It is a FRAGMENT and no longer an interpolated string: `graphql-codegen`
 * parses documents statically, so a `${...}` inside one is invisible to it and
 * the whole document would go unchecked.
 *
 * `role`, `expiresAt` and `refreshExpiresAt` arrived with step-7. All three
 * were previously INVENTED on this side: the role was hard-coded to `student`
 * for every credential session, and the two expiries were a 900-second
 * constant applied to our own clock.
 */
const AUTH_PAYLOAD_FRAGMENT = gql(`fragment AuthPayloadFields on AuthPayload {
  token
  refresh_token
  user_id
  tenant
  role
  expiresAt
  refreshExpiresAt
}`)

// `BP_ACCESS_TOKEN_LIFETIME_SECONDS` lived here: 900 seconds, measured off a
// token because the response did not carry an expiry. It does now
// (`expires_at`), so there is no constant left to go stale and no clock of ours
// in the arithmetic.

const LOGIN_DOCUMENT = gql(`mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) { ...AuthPayloadFields }
}`)

const JOIN_TENANT_DOCUMENT = gql(`mutation JoinTenant($code: String!, $email: String!, $name: String!) {
  joinTenant(code: $code, email: $email, name: $name)
}`)

const ACCEPT_INVITATION_DOCUMENT = gql(`mutation AcceptInvitation($token: String!, $password: String!) {
  acceptInvitation(token: $token, password: $password) { ...AuthPayloadFields }
}`)

const REFRESH_DOCUMENT = gql(`mutation Refresh($refresh_token: String!) {
  refreshToken(refresh_token: $refresh_token) { ...AuthPayloadFields }
}`)

const LOGOUT_DOCUMENT = gql(`mutation Logout($refresh_token: String!) {
  logout(refresh_token: $refresh_token)
}`)

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Accept a payload only if all four fields arrived non-empty.
 *
 * The schema declares all four `String!`, so this is NOT a null guard any more
 * — the generated type already rules null out. It guards EMPTINESS, which
 * `String!` cannot express and which the gateway really does return:
 * `validateToken` resolves with an empty `token`. A half-populated payload has
 * to fail here rather than seal a session with an empty access token that
 * every later request would 401 on.
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
  document: { toString(): string },
  variables: Record<string, unknown>,
): Promise<GqlResult<AuthPayload>> {
  const result = await graphql<Record<string, unknown>>(String(document), variables)
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
 * Ask to join the school a join code belongs to. Returns no session: on
 * success the gateway emails an ordinary invitation, and the password is chosen
 * at `/invite` when it is redeemed — so the address is proven by the same
 * channel an admin's invitation uses, and this anonymous call never carries a
 * password.
 *
 * **`true` says nothing about the address.** The gateway answers it for every
 * valid code, whether or not the email already has an account (anti-
 * enumeration). Only an invalid code fails, with reason `JOIN_CODE_INVALID`.
 *
 * `NO_USER`, same as {@link bpLogin}.
 */
export async function bpJoinTenant(
  code: string,
  email: string,
  name: string,
): Promise<GqlResult<boolean>> {
  const result = await graphql(JOIN_TENANT_DOCUMENT, { code, email, name })
  if (!result.ok) return result
  return { ok: true, data: result.data.joinTenant }
}

/**
 * Redeem an invitation token, set the password, and come back with a session.
 *
 * **The only operation here that creates a credential**, and therefore the
 * only way a *student* gets a password-login at all. The person was created
 * beforehand — by an admin, or by {@link bpJoinTenant} — inside their school,
 * with the role they were created with; this sets their password.
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
 * **This is a `USER` operation.** Called with no `Authorization` header it
 * returns `UNAUTHORIZED: Authentication required`. It needs the access token
 * *and* the refresh token: the gateway denylists the access token's `jti` from
 * the header and revokes the refresh family from the body.
 *
 * The access token goes as `Bearer <token>`, like every other operation. It
 * used to have to be sent raw — the `logout` resolver forwarded the header
 * verbatim and auth's JWT parser choked on the scheme, so only the refresh
 * family actually died. The gateway strips the prefix itself now
 * (`bearerTokenCtx`).
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
  // No explicit type argument: that selected the untyped `string` overload and
  // threw away what codegen knows about this document.
  const result = await graphql(LOGOUT_DOCUMENT, { refresh_token: refreshToken }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.logout === true }
}

/**
 * Map a gateway payload onto our session shape.
 *
 * The boundary where the wire's snake_case stops (see the `AuthPayload` /
 * `BpSession` note in `types.ts`). Nothing is computed here any more — both
 * expiries and the role are fields on the payload, so there is no injectable
 * clock and no arithmetic to assert.
 *
 * `role` is the one that changes behaviour rather than just provenance: this
 * app answered `'student'` for every credential session, which was honest only
 * while students were the only people who could log in.
 */
export function bpSessionFromPayload(payload: AuthPayload): BpSession {
  return {
    accessToken: payload.token,
    refreshToken: payload.refresh_token,
    userId: payload.user_id,
    tenant: payload.tenant,
    // The expiry the server SIGNED, not now + a copied TTL.
    accessTokenExpiresAt: Date.parse(payload.expiresAt),
    role: payload.role,
    // Null on a response that mints no refresh half. The cookie then falls back
    // to the documented 30 days — see `bpCookieMaxAge`.
    refreshExpiresAt: payload.refreshExpiresAt ? Date.parse(payload.refreshExpiresAt) : null,
  }
}
