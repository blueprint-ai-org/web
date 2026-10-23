/**
 * Everything the app needs about the signed-in person, in one call.
 *
 * ```graphql
 * me: Me!   # @auth(type: USER)
 * ```
 *
 * ## What this replaces
 *
 * Two modules and two round-trips, both of which took the user id as an
 * argument and asked `getUser(id:)` for it:
 *
 *   - `profile.server.ts` — `bpProfile`, fetched on every document load for the
 *     greeting (`display_name`, `first_name`, `last_name`);
 *   - `bpMyAvatarId` in `avatars.server.ts` — `getUser { avatar_id }`, fetched
 *     by the avatar screen.
 *
 * `me` resolves the caller from the token, so the id does not travel at all.
 * That removes the thing those two modules each had to argue was safe: both
 * carried a paragraph explaining that `getUser` is self-scoped and that the id
 * came from a sealed cookie so the client could not widen it. With `me` there
 * is no id to widen.
 *
 * ## `preferredName` is the server's answer now
 *
 * It used to be composed here, from `first_name ?? display_name`, by
 * `~/lib/student/display-name.ts`. The gateway applies the same rule — a first
 * name is what *"Hi {name}!"* wants, and a `display_name` from a SIS is often
 * "Last, First" — so the app asks rather than re-deriving. `display-name.ts`
 * keeps only the LTI fallback, for a launch with no BP AI record at all.
 *
 * ## The selection set is still deliberately narrow
 *
 * `Me.user` is the whole tenant-internal `User`, which includes a child's date
 * of birth and grade. This asks for the avatar and nothing else: a loader that
 * fetched a date of birth to render a greeting would be collecting it for no
 * reason, and it would then sit in the SSR payload of every student page.
 *
 * `user` is **null for the tenant owner** (who has no tenant-internal record)
 * and **null inside a support pass**, so the avatar is nullable twice over.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { GqlResult } from './types'

const ME = gql(`query Me {
  me {
    preferredName
    user {
      avatar_id
      avatar { id name image_url background }
      onboardingCompletedAt
    }
  }
}`)

/** The chosen avatar, as the gateway resolves it. */
export interface BpMyAvatar {
  id: string
  name: string
  imageUrl: string | null
  background: string | null
}

export interface BpMe {
  /** What to greet them with, or `null` when the record has no usable name. */
  preferredName: string | null
  /** Their chosen avatar's id, or `null` for none — and for an owner or a pass. */
  avatarId: string | null
  /**
   * The avatar itself, resolved (`User.avatar`, step-11).
   *
   * It is here so a screen that needs the ART does not have to find the row in
   * `listAvatars` to get it — which is a join against a paged library for a
   * single row the server already has. `avatarId` stays for the picker, which
   * only needs to know which tile is selected.
   *
   * Null when none is chosen, and also when the avatar has been removed from
   * the library: both render as "none", which is what the student sees.
   */
  avatar: BpMyAvatar | null
  /**
   * When they finished onboarding (RFC 3339), or `null` if they have not.
   *
   * Also `null` for an owner or a pass — which is why callers must look at
   * {@link BpMe.hasUserRecord} before treating `null` as "not done".
   */
  onboardingCompletedAt: string | null
  /** False for the tenant owner and inside a support pass: no `User` exists. */
  hasUserRecord: boolean
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/** The signed-in person, resolved from the token. */
export async function bpMe(accessToken: string): Promise<GqlResult<BpMe>> {
  const result = await graphql(ME, {}, { accessToken })
  if (!result.ok) return result

  const me = result.data.me
  const avatar = me.user?.avatar ?? null
  return {
    ok: true,
    data: {
      preferredName: str(me.preferredName),
      avatarId: str(me.user?.avatar_id),
      avatar: avatar
        ? {
            id: avatar.id,
            name: avatar.name,
            imageUrl: str(avatar.image_url),
            background: str(avatar.background),
          }
        : null,
      onboardingCompletedAt: str(me.user?.onboardingCompletedAt),
      hasUserRecord: me.user != null,
    },
  }
}
