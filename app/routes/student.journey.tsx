/**
 * `/student/journey` — journey dashboard (ports `journey.html`). Query: `?from`.
 *
 * Sidebar-bearing stage page (Phase 10): a 2×2 stat grid + spring-physics spark
 * swarm (Sparkz stat detail), a drag carousel with rubber-band + 460px snap,
 * "Open monthly recap" → `/student/recap`, and the `?from=recap` slide-up entry.
 * Shared module — also mounted at `/preview/student/journey` (explicit id in
 * `routes.ts`). Client-only render (see `HydrateFallback`).
 */

import { JourneyHome } from '~/components/dashboard/student/journey'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Journey · Blueprint' }, { name: 'description', content: 'Student journey.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — journey derives its stats from completed sections + sparks. */
export function clientLoader() {
  return {
    todaySections: studentStorage.getTodaySections(),
    moodEmotions: studentStorage.getMoodEmotions(),
    sparks: studentStorage.getSparks(),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Journey" route="/student/journey" source="journey.html" chrome />
}

export default function StudentJourneyRoute() {
  return <JourneyHome />
}
