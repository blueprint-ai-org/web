/**
 * `/student/settings` — avatar + privacy settings (ports `settings.html`).
 *
 * Full-bleed page (no sidebar): Avatar / Privacy tabs, dirty-gated Save →
 * adapter writes (avatar src/bg/id + `bp_privacy_1/2`), and the return matrix
 * (back → `history.back()`; save → `bp_settings_from` → hub index). Mirrored at
 * `/preview/student/settings`.
 */

import type { ActionFunctionArgs } from 'react-router'

import { SettingsPage } from '~/components/dashboard/student/settings'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpAvatars, bpSetMyAvatar } from '~/lib/bp-ai/avatars.server'
import { getAppSession } from '~/lib/session.server'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Settings · Blueprint' }, { name: 'description', content: 'Student settings.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — reads the profile + privacy flags via the adapter. */
export function clientLoader() {
  return {
    username: studentStorage.getUsername(),
    avatarId: studentStorage.getAvatarId(),
    privacy1: studentStorage.getPrivacy(1),
    privacy2: studentStorage.getPrivacy(2),
    settingsFrom: studentStorage.getSettingsFrom(),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Settings" route="/student/settings" source="settings.html" />
}

/**
 * Persist the avatar, so the two pickers cannot disagree.
 *
 * Onboarding records a pick on the gateway. If this screen only wrote
 * `studentStorage`, a student who changed their avatar here would leave the
 * server holding the onboarding choice — the hub pages would show one avatar
 * and their actual record another, and a second device would show the stale
 * one. Both pickers write the same way or neither should.
 *
 * **Takes a slug, not a catalogue id.** This screen's model is the prototype's
 * numeric 1–4 (`bp_avatar_id`), and rebuilding it around gateway ids to save a
 * lookup would be rewriting a working screen for the server's convenience. The
 * id is resolved here instead, on an action that runs only when Save is
 * pressed.
 *
 * Privacy is still local: `bp_privacy_1/2` have no gateway operation behind
 * them yet.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries no BP AI token, so there is nothing to write with.
  if (session?.kind !== 'bp') return { saved: false }

  const form = await request.formData()
  const slug = String(form.get('avatarSlug') ?? '').trim()
  if (!slug) return { saved: false }

  const catalogue = await bpAvatars(session.session.accessToken)
  if (!catalogue.ok) {
    console.error(`[student/settings] listAvatars failed (${catalogue.error.kind}): ${catalogue.error.message}`)
    return { saved: false }
  }
  const row = catalogue.data.find((a) => a.name === slug)
  // An avatar this app ships but the tenant has never been seeded with. The
  // local write already happened and the screen has already moved on.
  if (!row) return { saved: false }

  const result = await bpSetMyAvatar(session.session.accessToken, row.id)
  if (!result.ok) {
    console.error(`[student/settings] setMyAvatar failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: result.data === row.id }
}

export default function StudentSettingsRoute() {
  return <SettingsPage />
}
