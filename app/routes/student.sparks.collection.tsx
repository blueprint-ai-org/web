/**
 * `/student/sparks/collection` — collection grid (ports `collection.html`).
 *
 * Full-bleed page (no sidebar, Phase 11): the owned / total counter, mount-fill
 * progress bar, the next milestone's reward, the per-section list, and a
 * scrollable grid of collected cards + empty slots — all from the server.
 * Read-only — no write action. Mirrored at
 * `/preview/student/sparks/collection`; client-only render.
 */

import type { LoaderFunctionArgs } from 'react-router'

import { SparksCollection } from '~/components/dashboard/student/sparks'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpCollectibles, bpNextMilestoneReward, type ShopCard } from '~/lib/bp-ai/gamification.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

export function meta() {
  return [{ title: 'Collection · Blueprint' }, { name: 'description', content: 'Sparkz collection.' }]
}

interface CollectionData {
  /** Every live non-SHOP collectible, with `owned` for this student. */
  earnable: ShopCard[]
  nextReward: number | null
}

const fixture = (id: string, section: ShopCard['section'], owned: boolean): ShopCard => ({
  id,
  art: null,
  cost: 0,
  section,
  text: '',
  owned,
  affordable: false,
})

const PREVIEW_COLLECTION: CollectionData = {
  earnable: [fixture('p1', 'MOOD', true), fixture('p2', 'WINS', false), fixture('p3', 'WRITE', false)],
  nextReward: 25,
}

/**
 * Progress is owned / total over the earnable collectibles — one
 * `listCollectibles`, whose `owned` is computed for the caller, rather than a
 * second `listOwnedCollectibles` to intersect with it. No BP session ⇒ an empty
 * collection, never `localStorage`.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<CollectionData> {
  if (isPreviewRequest(request)) return PREVIEW_COLLECTION

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { earnable: [], nextReward: null }

  const { accessToken } = bp
  const [all, milestone] = await Promise.all([bpCollectibles(accessToken), bpNextMilestoneReward(accessToken)])
  if (!all.ok) console.error(`[collection] listCollectibles failed (${all.error.kind}): ${all.error.message}`)
  if (!milestone.ok) console.error(`[collection] milestones failed (${milestone.error.kind}): ${milestone.error.message}`)
  return {
    earnable: all.ok ? all.data.filter((c) => c.section !== 'SHOP') : [],
    nextReward: milestone.ok ? milestone.data : null,
  }
}

/** Keeps the render client-only (the progress bar fills after first paint). */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<CollectionData> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Collection" route="/student/sparks/collection" source="collection.html" />
}

export default function StudentSparksCollectionRoute({ loaderData }: { loaderData: CollectionData }) {
  return <SparksCollection earnable={loaderData.earnable} nextReward={loaderData.nextReward} />
}
