/**
 * The student's avatar — the tenant's catalogue, and the one write a student
 * is allowed to make about themselves.
 *
 * ```graphql
 * listAvatars(pageSize: Int, pageToken: String): ListAvatarsPayload!
 * setMyAvatar(avatarId: String!): User!
 * ```
 *
 * **Both are student-scoped, measured against the live gateway.** `listAvatars`
 * answers a student's own token with the full catalogue — not `FORBIDDEN` — and
 * `setMyAvatar`'s own description calls it *"el único cambio que un no-admin
 * puede hacerse"*: the only self-service write in the whole schema. A student
 * cannot edit even their own `display_name`.
 *
 * ## Why the id has to come from here
 *
 * `setMyAvatar` takes a **catalogue id**, minted per tenant — not a slug, not a
 * URL, not the colour. Nothing the app ships can name a row, so a screen that
 * wants to persist a pick must first read the catalogue to learn what the ids
 * are. The read and the write are one feature, not two.
 *
 * ## The write was broken until 2026-09-24
 *
 * It used to echo the id it was given and never store it — `getUser(self)
 * .avatar_id` came back `null` across sessions (MOA-167). Fixed upstream and
 * re-measured here before this module was written: the round trip now holds.
 * `scripts/bp-ai-avatar-roundtrip.ts` is the check, and it is worth re-running
 * rather than trusted.
 */

import type { PickableAvatar } from '~/lib/student/avatars'
import { NEUTRAL_AVATAR_BG } from '~/lib/student/avatars'

import { graphql } from './client.server'
import type { GqlResult } from './types'

// `status` sale de la selección: ya no se lee. El servidor filtra.
const AVATAR_FIELDS = 'id key isDefault image_url background order'

const LIST_AVATARS = `query ListAvatars($pageSize: Int) {
  listAvatars(status: ACTIVE, pageSize: $pageSize) { avatars { ${AVATAR_FIELDS} } }
}`

/**
 * `setMyAvatar` returns the whole `User`; this asks for the one field that
 * says whether the write landed. Selecting more would pull a child's date of
 * birth and grade into a response nothing reads.
 */
const SET_MY_AVATAR = `mutation SetMyAvatar($avatarId: String!) {
  setMyAvatar(avatarId: $avatarId) { id avatar_id }
}`

// `GET_MY_AVATAR` lived here. It is `me { user { avatar_id } }` now — see
// `me.server.ts`, which carries no user id at all and answers the greeting's
// name in the same call, so the avatar screen pays for one round-trip instead
// of two.

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

type Row = PickableAvatar & { order: number }

function readAvatar(value: unknown, index: number): Row | null {
  if (value === null || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = str(row.id)
  const key = str(row.key)
  if (!id || !key) return null
  // No status check here any more: the query asks for `status: ACTIVE` and the
  // service filters. It used to default an absent status to "active" and drop
  // anything else — fail-closed, but it meant paging the whole library to throw
  // most of it away, and `status` was a free string the schema did not name.
  return {
    id,
    key,
    // Empty until the art is uploaded (`uploadAsset`): the picker draws the disc.
    src: str(row.image_url),
    bg: str(row.background) ?? NEUTRAL_AVATAR_BG,
    isDefault: row.isDefault === true,
    order: num(row.order) ?? index,
  }
}

/** The tenant's avatar catalogue, ordered, archived rows removed. */
export async function bpAvatars(accessToken: string): Promise<GqlResult<PickableAvatar[]>> {
  const result = await graphql<Record<string, unknown>>(LIST_AVATARS, { pageSize: 100 }, { accessToken })
  if (!result.ok) return result

  const payload = result.data.listAvatars
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).avatars)
      ? ((payload as Record<string, unknown>).avatars as unknown[])
      : []

  const avatars = rows.map(readAvatar).filter((a): a is Row => a !== null)
  avatars.sort((a, b) => a.order - b.order)
  return { ok: true, data: avatars.map(({ order: _order, ...a }) => a) }
}

/**
 * Record the student's pick.
 *
 * Takes the id explicitly rather than deriving it, so the caller has to have
 * gotten it from {@link bpAvatars} — the client cannot invent one, and the
 * gateway refuses an id that is not a live row anyway.
 *
 * Returns the stored `avatar_id` so the caller can confirm the write landed
 * rather than assume it. That is not paranoia: this operation spent a day
 * returning the id it was handed while storing nothing.
 */
export async function bpSetMyAvatar(
  accessToken: string,
  avatarId: string,
): Promise<GqlResult<string | null>> {
  const result = await graphql<Record<string, unknown>>(SET_MY_AVATAR, { avatarId }, { accessToken })
  if (!result.ok) return result

  const user = result.data.setMyAvatar
  if (user === null || typeof user !== 'object') {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI setMyAvatar returned no record.' } }
  }
  return { ok: true, data: str((user as Record<string, unknown>).avatar_id) }
}
