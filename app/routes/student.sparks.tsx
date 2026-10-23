/**
 * `/student/sparks` — sparkz shop (ports `sparks.html`). Query: `?back`.
 *
 * Sidebar-bearing stage page (Phase 11): the server's SHOP collectibles, the
 * clip-path unlock overlay with confirm → success crossfade + purchase
 * flight-to-slot, owned-reward → collectible cloud/lightning exits, and the
 * `?back=1` re-entry. Shared module — also mounted at `/preview/student/sparks`
 * (explicit id in `routes.ts`). Client-only render (see `HydrateFallback`).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { SparksShop } from '~/components/dashboard/student/sparks'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpCollectibles, bpHub, bpPurchase, type ShopCard } from '~/lib/bp-ai/gamification.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

const TAG = '[sparks]'

export function meta() {
  return [{ title: 'Sparkz · Blueprint' }, { name: 'description', content: 'Student sparkz shop.' }]
}

interface ShopData {
  balance: number
  cards: ShopCard[]
}

const card = (id: string, cost: number, owned: boolean, affordable: boolean): ShopCard => ({
  id,
  art: null,
  cost,
  section: 'SHOP',
  text: '',
  owned,
  affordable,
})

/** `/preview` has no session: one card in each state, no art (the placeholder). */
const PREVIEW_SHOP: ShopData = {
  balance: 120,
  cards: [card('p1', 20, false, true), card('p2', 0, true, false), card('p3', 200, false, false), card('p4', 400, false, false)],
}

/**
 * The balance and the SHOP collectibles, priced and gated by the server for
 * this student. No BP session (an LTI launch) ⇒ an empty shop with balance 0 —
 * never `localStorage`.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<ShopData> {
  if (isPreviewRequest(request)) return PREVIEW_SHOP

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { balance: 0, cards: [] }

  const { accessToken } = bp
  const [hub, shop] = await Promise.all([bpHub(accessToken, undefined), bpCollectibles(accessToken, 'SHOP')])
  if (!hub.ok) console.error(`${TAG} sparkBalance failed (${hub.error.kind}): ${hub.error.message}`)
  if (!shop.ok) console.error(`${TAG} listCollectibles failed (${shop.error.kind}): ${shop.error.message}`)
  return { balance: hub.ok ? hub.data.balance : 0, cards: shop.ok ? shop.data : [] }
}

/** Keeps the render client-only: the unlock choreography runs on refs. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<ShopData> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Sparkz" route="/student/sparks" source="sparks.html" chrome />
}

/**
 * Buy one collectible. `purchaseCollectible` checks the balance, charges and
 * delivers in one transaction; the answer carries the new balance, which is
 * what the screen shows.
 */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { ok: false }

  const id = String((await request.formData()).get('collectibleId') ?? '').trim()
  if (!id) return { ok: false }

  const result = await bpPurchase(bp.accessToken, id)
  if (!result.ok) {
    console.error(`${TAG} purchaseCollectible ${id} failed (${result.error.kind}): ${result.error.message}`)
    return { ok: false }
  }
  return { ok: true, balance: result.data }
}

export default function StudentSparksRoute({ loaderData }: { loaderData: ShopData }) {
  return <SparksShop balance={loaderData.balance} cards={loaderData.cards} />
}
