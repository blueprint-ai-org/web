/**
 * `/student/summary` — day summary (ports `summary.html`).
 *
 * Full-bleed page (no sidebar): a 2×2 section grid (Mood · Write · About · Wins)
 * over a day carousel, with a mood-detail overlay and per-card edit deep links
 * (Phase 7). Read-only — no write action. Client-only render (see
 * `HydrateFallback`). Mirrored at `/preview/student/summary`.
 */

import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { Summary } from '~/components/dashboard/student/summary'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Summary · Blueprint' }, { name: 'description', content: 'Day summary.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — the summary grid reads all of today's card state via the adapter. */
export function clientLoader() {
  return {
    todaySections: studentStorage.getTodaySections(),
    moodEmotions: studentStorage.getMoodEmotions(),
    winsNote: studentStorage.getWinsNote(),
    writeText: studentStorage.getWriteText('local'),
    aboutEmoji: studentStorage.getAboutEmoji(),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Summary" route="/student/summary" source="summary.html" />
}

export default function StudentSummaryRoute() {
  return <Summary />
}
