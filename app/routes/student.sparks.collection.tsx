/**
 * `/student/sparks/collection` — collection grid (ports `collection.html`).
 *
 * Full-bleed page (no sidebar, Phase 11): the x/20 counter, mount-fill progress
 * bar, four-section category list, and a scrollable grid of collected cards +
 * empty slots — all derived from `bp_today_sections`. Read-only — no write
 * action. Mirrored at `/preview/student/sparks/collection`; client-only render.
 */

import { SparksCollection } from '~/components/dashboard/student/sparks'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Collection · Blueprint' }, { name: 'description', content: 'Sparkz collection.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — the x/20 counter derives from completed sections. */
export function clientLoader() {
  return { todaySections: studentStorage.getTodaySections() }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Collection" route="/student/sparks/collection" source="collection.html" />
}

export default function StudentSparksCollectionRoute() {
  return <SparksCollection />
}
