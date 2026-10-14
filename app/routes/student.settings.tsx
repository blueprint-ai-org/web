/**
 * `/student/settings` — avatar + privacy settings (ports `settings.html`).
 *
 * Full-bleed page (no sidebar): Avatar / Privacy tabs, dirty-gated Save →
 * gateway writes (avatar, privacy), and the return matrix
 * (back → `history.back()`; save → `bp_settings_from` → hub index). Mirrored at
 * `/preview/student/settings`.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import type { Route } from './+types/student.settings'

import { SettingsPage } from '~/components/dashboard/student/settings'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpAvatars, bpSetMyAvatar } from '~/lib/bp-ai/avatars.server'
import { bpMyPrivacySettings, bpUpdateMyPrivacySettings, readChoice } from '~/lib/bp-ai/privacy.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import type { PickableAvatar } from '~/lib/student/avatars'

export function meta() {
  return [{ title: 'Settings · Blueprint' }, { name: 'description', content: 'Student settings.' }]
}

/**
 * The privacy rows, copy and all, as the gateway serves and enforces them, and
 * the tenant's avatar catalogue.
 *
 * Without a session (an LTI launch, a preview) or on a failed read, each is
 * empty: the Privacy tab shows no cards and the Avatar tab no avatars, rather
 * than inventing values the server may not hold.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { privacy: null, avatars: [] as PickableAvatar[] }

  const { accessToken } = bp
  const [privacy, avatars] = await Promise.all([bpMyPrivacySettings(accessToken), bpAvatars(accessToken)])
  if (!privacy.ok) {
    console.error(`[student/settings] myPrivacySettings failed (${privacy.error.kind}): ${privacy.error.message}`)
  }
  if (!avatars.ok) {
    console.error(`[student/settings] listAvatars failed (${avatars.error.kind}): ${avatars.error.message}`)
  }
  return { privacy: privacy.ok ? privacy.data : null, avatars: avatars.ok ? avatars.data : [] }
}

/**
 * Keeps the page client-only: `bp_settings_from`, the Save return target, is
 * session storage.
 */
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Settings" route="/student/settings" source="settings.html" />
}

/**
 * Persist the avatar (`setMyAvatar`, by the catalogue id the picker already
 * has) and the privacy choices (`updateMyPrivacySettings`) — each only when the
 * page sent it, i.e. when it changed.
 */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  // No BP AI session, so there is nothing to write with.
  if (!bp) return { saved: false }

  const form = await request.formData()
  const [avatarSaved, privacySaved] = await Promise.all([
    saveAvatar(bp.accessToken, String(form.get('avatarId') ?? '').trim()),
    savePrivacy(bp.accessToken, form),
  ])
  return { saved: avatarSaved && privacySaved }
}

async function savePrivacy(accessToken: string, form: FormData): Promise<boolean> {
  const choice = readChoice(form)
  if (choice.mood === undefined && choice.classStats === undefined) return true

  const result = await bpUpdateMyPrivacySettings(accessToken, choice)
  if (!result.ok) {
    console.error(`[student/settings] updateMyPrivacySettings failed (${result.error.kind}): ${result.error.message}`)
    return false
  }
  return true
}

async function saveAvatar(accessToken: string, avatarId: string): Promise<boolean> {
  if (!avatarId) return true

  const result = await bpSetMyAvatar(accessToken, avatarId)
  if (!result.ok) {
    console.error(`[student/settings] setMyAvatar failed (${result.error.kind}): ${result.error.message}`)
    return false
  }
  return result.data === avatarId
}

export default function StudentSettingsRoute({ loaderData }: Route.ComponentProps) {
  return <SettingsPage privacy={loaderData?.privacy ?? null} avatars={loaderData?.avatars ?? []} />
}
