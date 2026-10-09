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

import { graphql } from './client.server'
import type { GqlResult } from './types'

/** One row of the tenant's avatar catalogue. */
export interface CatalogueAvatar {
  id: string
  /** The catalogue's `name`, which the seeder writes as our slug. */
  name: string
  /** Absolute URL to the art, hosted outside the gateway. May be empty. */
  imageUrl: string | null
  /** The picker's background disc. */
  background: string | null
  order: number
}

const AVATAR_FIELDS = 'id name image_url background order status'

const LIST_AVATARS = `query ListAvatars($pageSize: Int) {
  listAvatars(pageSize: $pageSize) { avatars { ${AVATAR_FIELDS} } }
}`

/**
 * `setMyAvatar` returns the whole `User`; this asks for the one field that
 * says whether the write landed. Selecting more would pull a child's date of
 * birth and grade into a response nothing reads.
 */
const SET_MY_AVATAR = `mutation SetMyAvatar($avatarId: String!) {
  setMyAvatar(avatarId: $avatarId) { id avatar_id }
}`

/**
 * The student's current pick, read back off their own record.
 *
 * A separate query rather than a field added to `bpProfile`: that module
 * documents its selection set as deliberately narrow — *"a loader that fetched
 * a child's date of birth in order to render a greeting would be collecting it
 * for no reason"* — and it is fetched on every document load for the greeting.
 * The avatar is needed by one screen, so it is paid for by that screen.
 */
const GET_MY_AVATAR = `query GetMyAvatar($id: String!) {
  getUser(id: $id) { avatar_id }
}`

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readAvatar(value: unknown, index: number): CatalogueAvatar | null {
  if (value === null || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = str(row.id)
  const name = str(row.name)
  if (!id || !name) return null
  // `status` is a free string. Anything not explicitly active is treated as
  // not active, so a value nobody has seen yet fails closed — the gateway
  // rejects a `setMyAvatar` naming an archived row, and offering one would
  // hand the student a choice that cannot be saved.
  if ((str(row.status) ?? 'active') !== 'active') return null
  return {
    id,
    name,
    imageUrl: str(row.image_url),
    background: str(row.background),
    order: num(row.order) ?? index,
  }
}

/** The tenant's avatar catalogue, ordered, archived rows removed. */
export async function bpAvatars(accessToken: string): Promise<GqlResult<CatalogueAvatar[]>> {
  const result = await graphql<Record<string, unknown>>(LIST_AVATARS, { pageSize: 100 }, { accessToken })
  if (!result.ok) return result

  const payload = result.data.listAvatars
  const rows =
    payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).avatars)
      ? ((payload as Record<string, unknown>).avatars as unknown[])
      : []

  const avatars = rows.map(readAvatar).filter((a): a is CatalogueAvatar => a !== null)
  avatars.sort((a, b) => a.order - b.order)
  return { ok: true, data: avatars }
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

/**
 * Which avatar this student currently has, or `null` for none.
 *
 * `getUser` is self-scoped: a student's own token returns their record and any
 * other id answers `FORBIDDEN`, which is what makes this safe to call from a
 * loader with nothing but the session — the id comes from the sealed cookie
 * and there is nothing the client could tamper with to widen it.
 */
export async function bpMyAvatarId(
  accessToken: string,
  userId: string,
): Promise<GqlResult<string | null>> {
  const result = await graphql<Record<string, unknown>>(GET_MY_AVATAR, { id: userId }, { accessToken })
  if (!result.ok) return result

  const user = result.data.getUser
  if (user === null || typeof user !== 'object') {
    return { ok: false, error: { kind: 'unknown', message: 'BP AI getUser returned no record.' } }
  }
  return { ok: true, data: str((user as Record<string, unknown>).avatar_id) }
}
