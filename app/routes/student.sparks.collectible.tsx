/**
 * `/student/sparks/collectible` — collectible detail (ports `collectible.html`).
 * Query: `?c` (the collectible's id), `?anim`.
 *
 * Full-bleed purple page (no sidebar, Phase 11): the collectible's art and
 * text, the `?anim=1` cloud-shrink entrance, and the back-exit →
 * `/student/sparks?back=1`. No write action; SSRs directly with no
 * `clientLoader`. Mirrored at `/preview/student/sparks/collectible`.
 */

import type { LoaderFunctionArgs } from 'react-router'

import { SparksCollectible } from '~/components/dashboard/student/sparks'
import { bpCollectibles, type ShopCard } from '~/lib/bp-ai/gamification.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

export function meta() {
  return [{ title: 'Collectible · Blueprint' }, { name: 'description', content: 'Sparkz collectible.' }]
}

const PREVIEW_COLLECTIBLE: ShopCard = {
  id: 'preview',
  art: null,
  cost: 0,
  section: 'MOOD',
  text: 'A collectible',
  owned: true,
  affordable: false,
}

/**
 * The collectible `?c` names, from the catalogue (there is no single-row
 * getter; the catalogue is one small page). `null` — no session, an unknown id,
 * a failed read — renders the page without art or text.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ collectible: ShopCard | null }> {
  if (isPreviewRequest(request)) return { collectible: PREVIEW_COLLECTIBLE }

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { collectible: null }

  const id = new URL(request.url).searchParams.get('c')
  const all = await bpCollectibles(bp.accessToken)
  if (!all.ok) {
    console.error(`[collectible] listCollectibles failed (${all.error.kind}): ${all.error.message}`)
    return { collectible: null }
  }
  return { collectible: all.data.find((c) => c.id === id) ?? null }
}

export default function StudentSparksCollectibleRoute({ loaderData }: { loaderData: { collectible: ShopCard | null } }) {
  return <SparksCollectible collectible={loaderData.collectible} />
}
