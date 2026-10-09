/**
 * `/student/completed` — card-complete animation route (ports `completed.html`).
 * Query: `?card`, `?from`.
 *
 * Full-bleed page (no sidebar): the ~3.9s drawer choreography then auto-redirects
 * to the hub (Phase 6). Client-only (see `HydrateFallback`). Mirrored at
 * `/preview/student/completed` (re-export).
 */

import { CompletedSequence } from '~/components/dashboard/student/today'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Completed · Blueprint' }, { name: 'description', content: 'Card completed.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — reads current sections to append the completed card to. */
export function clientLoader() {
  return { todaySections: studentStorage.getTodaySections() }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Completed" route="/student/completed" source="completed.html" />
}

/** Stub action — the future write seam (append to `bp_today_sections`). */
export function action() {
  return null
}

export default function StudentCompletedRoute() {
  return <CompletedSequence />
}
