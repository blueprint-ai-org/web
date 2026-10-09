/**
 * The student's own profile record.
 *
 * ```graphql
 * getUser(id: String!): User!
 * ```
 *
 * **Self-scoped, measured 2026-09-23.** Called with a student's own access
 * token it returns their full record; called with anybody else's id it answers
 * `FORBIDDEN: access denied: cannot act on another user's data`. That is what
 * makes this safe to call from a loader with nothing but the session — there is
 * no admin credential anywhere in this path, and no id the client could tamper
 * with to widen it, because the id comes from the sealed cookie.
 *
 * It is also the *only* profile access a student has. `updateTenantUser` is
 * ADMIN-gated with a rank guard and answers `UNAUTHORIZED` even for a student
 * editing their own record; the one self-service write in the whole schema is
 * `setMyAvatar`. So this module reads and will never write.
 */

import { graphql } from './client.server'
import type { GqlResult } from './types'

/** What the student flow needs from the record, and nothing more. */
export interface BpProfile {
  /** `display_name`, or `null` when the admin who created them left it blank. */
  displayName: string | null
  firstName: string | null
  lastName: string | null
}

/**
 * The selection set is deliberately narrow.
 *
 * `getUser` can return email, date of birth and grade. This app needs a name to
 * say hello with, so it asks for names — a loader that fetched a child's date
 * of birth in order to render a greeting would be collecting it for no reason,
 * and it would then be sitting in the SSR payload of every student page.
 */
const GET_PROFILE = `query GetProfile($id: String!) {
  getUser(id: $id) { display_name first_name last_name }
}`

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Fetch the signed-in student's own names.
 *
 * Takes the id explicitly rather than deriving it, so the caller has to have
 * gotten it from the session — the one place it cannot be forged.
 */
export async function bpProfile(
  accessToken: string,
  userId: string,
): Promise<GqlResult<BpProfile>> {
  const result = await graphql<Record<string, unknown>>(GET_PROFILE, { id: userId }, { accessToken })
  if (!result.ok) return result

  const user = result.data.getUser
  if (user === null || typeof user !== 'object') {
    return {
      ok: false,
      error: { kind: 'unknown', message: 'BP AI getUser returned no record.' },
    }
  }
  const record = user as Record<string, unknown>
  return {
    ok: true,
    data: {
      displayName: str(record.display_name),
      firstName: str(record.first_name),
      lastName: str(record.last_name),
    },
  }
}
