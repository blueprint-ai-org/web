/**
 * `/student/toolkit/category` — toolkit category grid (ports `category.html`).
 * Query: `?cat`.
 *
 * Full-bleed page (no sidebar): the hardcoded category listing (2×2 tile grid)
 * with per-tile hearts (visual-only in the prototype — no `bp_saved` write) and
 * back → `/student/toolkit?tab=browse`. Mirrored at
 * `/preview/student/toolkit/category`. Client-only render (see `HydrateFallback`).
 */

import { ToolkitCategory } from '~/components/dashboard/student/toolkit'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Toolkit category · Blueprint' }, { name: 'description', content: 'Toolkit category.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — reads hearted items so toggles persist across category ⇄ toolkit. */
export function clientLoader() {
  return { saved: studentStorage.getSaved(['v2']) }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Toolkit category" route="/student/toolkit/category" source="category.html" />
}

export default function StudentToolkitCategoryRoute() {
  return <ToolkitCategory />
}
