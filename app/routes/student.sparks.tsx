/**
 * `/student/sparks` — sparkz shop (ports `sparks.html`). Query: `?back`.
 *
 * Sidebar-bearing stage page (Phase 11): a cost-gated 2×4 artwork grid, the
 * clip-path unlock overlay with confirm → success crossfade + purchase
 * flight-to-slot, owned-reward → collectible cloud/lightning exits, and the
 * `?back=1` re-entry. Shared module — also mounted at `/preview/student/sparks`
 * (explicit id in `routes.ts`). Client-only render (see `HydrateFallback`).
 */

import { SparksShop } from '~/components/dashboard/student/sparks'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Sparkz · Blueprint' }, { name: 'description', content: 'Student sparkz shop.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — sparks reads the balance + collection progress via the adapter. */
export function clientLoader() {
  return {
    sparks: studentStorage.ensureSparks(),
    todaySections: studentStorage.getTodaySections(),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Sparkz" route="/student/sparks" source="sparks.html" chrome />
}

/** Stub action — the future write seam (unlock decrements `bp_sparks`). */
export function action() {
  return null
}

export default function StudentSparksRoute() {
  return <SparksShop />
}
