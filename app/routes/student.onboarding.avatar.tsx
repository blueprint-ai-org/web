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
import { bpAvatars, bpMyAvatarId, bpSetMyAvatar } from '~/lib/bp-ai/avatars.server'
import { getAppSession } from '~/lib/session.server'
import { STUDENT_AVATARS, avatarBySlug, type PickableAvatar } from '~/lib/student/avatars'

export function meta() {
  return [{ title: 'Select your avatar · Blueprint' }]
}

/** The picker with no catalogue behind it: art only, nothing to persist. */
const BAKED: PickableAvatar[] = STUDENT_AVATARS.map((a) => ({
  id: null,
  slug: a.slug,
  src: a.src,
  bg: a.bg,
}))

/**
 * The catalogue, resolved to something renderable.
 *
 * **Art comes from `public/`, not from the row's `image_url`.** The catalogue
 * stores an absolute URL on this app's own public origin, so fetching it back
 * would be a round trip to ourselves for a file already in the bundle's
 * `public/` directory — and it is environment-specific, so a row seeded against
 * the deployed origin renders nothing in local dev. A row whose `name` matches
 * a known slug is drawn from the local file; anything else falls back to its
 * `image_url`, which is the only thing there is for an avatar this app has
 * never heard of.
 *
 * Returns `null` when there is no catalogue to speak of, so the screen can tell
 * "four avatars that cannot be saved" from "four avatars that can".
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries Canvas claims and no BP AI token, so there is nothing
  // to call the gateway with. That is the common case today, not an edge.
  if (session?.kind !== 'bp') return { avatars: BAKED, selectedId: null, persists: false }

  const [catalogue, current] = await Promise.all([
    bpAvatars(session.session.accessToken),
    bpMyAvatarId(session.session.accessToken, session.session.userId),
  ])

  if (!catalogue.ok) {
    console.error(`[onboarding/avatar] listAvatars failed (${catalogue.error.kind}): ${catalogue.error.message}`)
    return { avatars: BAKED, selectedId: null, persists: false }
  }
  // An unseeded tenant answers `[]`. Empty is a state, not a failure — but a
  // picker of four avatars none of which can be saved is a lie, so it renders
  // the baked art and says so by leaving `persists` false.
  if (catalogue.data.length === 0) {
    return { avatars: BAKED, selectedId: null, persists: false }
  }

  const avatars: PickableAvatar[] = catalogue.data.map((row) => {
    const known = avatarBySlug(row.name)
    return {
      id: row.id,
      slug: row.name,
      src: known?.src ?? row.imageUrl ?? '',
      bg: row.background ?? known?.bg ?? '#b8c0ed',
    }
  })

  return {
    avatars,
    selectedId: current.ok ? current.data : null,
    persists: true,
  }
}

/**
 * Persist the pick.
 *
 * **Never fails the screen.** A refused or unreachable write is logged and
 * reported back as `{ saved: false }`; the client keeps its local copy and the
 * student carries on. Losing an avatar choice is a cosmetic problem, and
 * blocking someone's onboarding on it would turn that into a dead end.
 *
 * The stored id is read out of the mutation's own response rather than assumed
 * — this operation spent a day returning the id it was handed while storing
 * nothing (MOA-167), and a write that silently does not write is exactly what
 * this check catches.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { saved: false }

  const form = await request.formData()
  const avatarId = String(form.get('avatarId') ?? '').trim()
  if (!avatarId) return { saved: false }

  const result = await bpSetMyAvatar(session.session.accessToken, avatarId)
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

export default function StudentOnboardingAvatarRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>
}) {
  return (
    <AvatarScreen
      avatars={loaderData?.avatars ?? BAKED}
      selectedId={loaderData?.selectedId ?? null}
      persists={loaderData?.persists ?? false}
    />
  )
}
