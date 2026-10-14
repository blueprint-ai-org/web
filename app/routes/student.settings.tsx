/**
 * `/student/settings` — avatar + privacy settings (ports `settings.html`).
 *
 * Full-bleed page (no sidebar): Avatar / Privacy tabs, dirty-gated Save →
 * adapter writes (avatar src/bg/id) + gateway writes (avatar, privacy), and the
 * return matrix
 * (back → `history.back()`; save → `bp_settings_from` → hub index). Mirrored at
 * `/preview/student/settings`.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import type { Route } from './+types/student.settings'

import { SettingsPage } from '~/components/dashboard/student/settings'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpAvatars, bpSetMyAvatar } from '~/lib/bp-ai/avatars.server'
import { bpMyPrivacySettings, bpUpdateMyPrivacySettings, readChoice } from '~/lib/bp-ai/privacy.server'
import { getAppSession } from '~/lib/session.server'

export function meta() {
  return [{ title: 'Settings · Blueprint' }, { name: 'description', content: 'Student settings.' }]
}

/**
 * The privacy rows, copy and all, as the gateway serves and enforces them.
 *
 * `null` when there is nothing to ask with (an LTI launch, a preview) or the
 * read failed: the Privacy tab then shows no cards rather than inventing
 * values the server may not hold.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { privacy: null }

  const result = await bpMyPrivacySettings(session.session.accessToken)
  if (!result.ok) {
    console.error(`[student/settings] myPrivacySettings failed (${result.error.kind}): ${result.error.message}`)
    return { privacy: null }
  }
  return { privacy: result.data }
}

/**
 * Keeps the page client-only: the avatar picker still reads its initial pick
 * from `studentStorage` in `useState` initializers, which need `window`.
 */
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return serverLoader()
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
 * Privacy goes to the gateway too (`updateMyPrivacySettings`), only when the
 * page sent it — i.e. when it had rows to edit.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries no BP AI token, so there is nothing to write with.
  if (session?.kind !== 'bp') return { saved: false }

  const form = await request.formData()
  const [avatarSaved, privacySaved] = await Promise.all([
    saveAvatar(session.session.accessToken, String(form.get('avatarSlug') ?? '').trim()),
    savePrivacy(session.session.accessToken, form),
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

async function saveAvatar(accessToken: string, slug: string): Promise<boolean> {
  if (!slug) return false

  const catalogue = await bpAvatars(accessToken)
  if (!catalogue.ok) {
    console.error(`[student/settings] listAvatars failed (${catalogue.error.kind}): ${catalogue.error.message}`)
    return false
  }
  const row = catalogue.data.find((a) => a.name === slug)
  // An avatar this app ships but the tenant has never been seeded with. The
  // local write already happened and the screen has already moved on.
  if (!row) return false

  const result = await bpSetMyAvatar(accessToken, row.id)
  if (!result.ok) {
    console.error(`[student/settings] setMyAvatar failed (${result.error.kind}): ${result.error.message}`)
    return false
  }
  return result.data === row.id
}

export default function StudentSettingsRoute({ loaderData }: Route.ComponentProps) {
  return <SettingsPage privacy={loaderData?.privacy ?? null} />
}
