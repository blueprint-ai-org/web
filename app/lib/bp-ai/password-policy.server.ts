/**
 * The password rules authentication enforces, read from the gateway.
 *
 * ```graphql
 * passwordPolicy: PasswordPolicy!   # @auth(type: NO_USER)
 * type PasswordPolicy { minLength: Int!  maxBytes: Int! }
 * ```
 *
 * The screens that let someone choose a password check it in the browser
 * first, as UX; the server checks it again and its answer wins. Reading the
 * rule instead of copying it is what keeps those two checks agreeing.
 *
 * **Cached for the life of the process, once read.** The policy changes only
 * with a deploy of authentication, and `/graphql` is rate limited at 50/hour —
 * spending a request per page view on a constant would be the most wasteful
 * call in the app.
 *
 * A failure is NOT cached: the next request asks again. The caller then gets
 * `null`, and the screens skip their length checks rather than guess a number.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { PasswordPolicy } from './validate'

const PASSWORD_POLICY = gql(`query PasswordPolicy {
  passwordPolicy { minLength maxBytes }
}`)

// ponytail: never expires; a deploy that changes the policy without restarting
// this app serves the old one until the next restart of this app.
let cached: PasswordPolicy | null = null

export async function bpPasswordPolicy(): Promise<PasswordPolicy | null> {
  if (cached) return cached
  const result = await graphql(PASSWORD_POLICY, {})
  if (!result.ok) {
    console.error(`[password-policy] passwordPolicy failed (${result.error.kind}): ${result.error.message}`)
    return null
  }
  cached = result.data.passwordPolicy
  return cached
}
