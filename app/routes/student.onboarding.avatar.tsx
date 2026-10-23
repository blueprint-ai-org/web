/**
 * `/student/onboarding/avatar` — onboarding step 5 (prototype `#s3`).
 * Avatar picker, backed by the tenant's BP AI avatar catalogue.
 * Mirrored at `/preview/student/onboarding/avatar`.
 *
 * Picking an avatar is **the only change a student is allowed to make to their
 * own record** — `setMyAvatar` is the single self-service write in the whole
 * schema — so this is the one onboarding screen whose answer genuinely belongs
 * on the server rather than in the browser.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { AvatarScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpAvatars, bpSetMyAvatar } from '~/lib/bp-ai/avatars.server'
import { bpMe } from '~/lib/bp-ai/me.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { initialAvatarId, type PickableAvatar } from '~/lib/student/avatars'
import { isPreviewRequest } from '~/lib/student/preview'

export function meta() {
  return [{ title: 'Select your avatar · Blueprint' }]
}

interface AvatarData {
  avatars: PickableAvatar[]
  /** The tile the picker opens on: the student's pick, else the tenant default. */
  selectedId: string | null
}

const fixture = (n: number, bg: string): PickableAvatar => ({
  id: `preview-${n}`,
  key: `avatar-${n}`,
  src: null,
  bg,
  isDefault: n === 3,
})

/** `/preview` has no session: four art-less avatars (the placeholder), eyes by key. */
const PREVIEW_AVATARS: AvatarData = {
  avatars: [fixture(1, '#b38aff'), fixture(2, '#f3beaf'), fixture(3, '#b8c0ed'), fixture(4, '#58b880')],
  selectedId: 'preview-3',
}

/**
 * The catalogue, drawn as the catalogue says: its `image_url` (empty until the
 * art is uploaded — the picker then draws the background disc) and its
 * `background`, keyed by `Avatar.key`.
 *
 * **No BP session ⇒ no avatars.** An LTI launch carries Canvas claims and no
 * BP AI token, so there is no catalogue to read and no record to write a pick
 * to. It used to draw four local avatars that could not be saved; an empty
 * picker is the honest version of that.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<AvatarData> {
  if (isPreviewRequest(request)) return PREVIEW_AVATARS

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { avatars: [], selectedId: null }

  const [catalogue, current] = await Promise.all([
    bpAvatars(bp.accessToken),
    // `me`, not `getUser(id:)`: the caller is resolved from the token, so no
    // user id travels.
    bpMe(bp.accessToken),
  ])

  if (!catalogue.ok) {
    console.error(`[onboarding/avatar] listAvatars failed (${catalogue.error.kind}): ${catalogue.error.message}`)
    return { avatars: [], selectedId: null }
  }
  return {
    avatars: catalogue.data,
    selectedId: initialAvatarId(catalogue.data, current.ok ? current.data.avatarId : null),
  }
}

/**
 * Persist the pick.
 *
 * **Never fails the screen.** A refused or unreachable write is logged and
 * reported back as `{ saved: false }`; the student carries on. Losing an avatar choice is a cosmetic problem, and
 * blocking someone's onboarding on it would turn that into a dead end.
 *
 * The stored id is read out of the mutation's own response rather than assumed
 * — this operation spent a day returning the id it was handed while storing
 * nothing (MOA-167), and a write that silently does not write is exactly what
 * this check catches.
 */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { saved: false }

  const form = await request.formData()
  const avatarId = String(form.get('avatarId') ?? '').trim()
  if (!avatarId) return { saved: false }

  const result = await bpSetMyAvatar(bp.accessToken, avatarId)
  if (!result.ok) {
    console.error(`[onboarding/avatar] setMyAvatar failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  if (result.data !== avatarId) {
    console.error(`[onboarding/avatar] setMyAvatar stored ${result.data ?? 'nothing'}, expected ${avatarId}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentOnboardingAvatarRoute({ loaderData }: { loaderData: AvatarData }) {
  return <AvatarScreen avatars={loaderData.avatars} selectedId={loaderData.selectedId} />
}
