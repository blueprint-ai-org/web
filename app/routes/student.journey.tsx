/**
 * `/student/journey` — journey dashboard (ports `journey.html`). Query: `?from`.
 *
 * Sidebar-bearing stage page (Phase 10): a 2×2 stat grid + spring-physics spark
 * swarm (Sparkz stat detail), a drag carousel with rubber-band + 460px snap,
 * "Open monthly recap" → `/student/recap`, and the `?from=recap` slide-up entry.
 * Shared module — also mounted at `/preview/student/journey` (explicit id in
 * `routes.ts`). Client-only render (see `HydrateFallback`).
 */

import type { LoaderFunctionArgs } from 'react-router'

import { JourneyHome } from '~/components/dashboard/student/journey'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpJourney, CHECKIN_CELLS, EMPTY_JOURNEY, type JourneyData } from '~/lib/bp-ai/activity.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor, timeZoneFor } from '~/lib/student/time-zone'

export function meta() {
  return [{ title: 'Journey · Blueprint' }, { name: 'description', content: 'Student journey.' }]
}

/** `/preview` has no session: a fixed month with something in every panel. */
const PREVIEW: JourneyData = {
  feelings: 12,
  checkins: 6,
  sparks: 120,
  activities: 4,
  moods: [
    { name: 'Happy', count: 5 },
    { name: 'Tired', count: 4 },
    { name: 'Calm', count: 3 },
  ],
  checkinDays: Array.from({ length: CHECKIN_CELLS }, (_, i) => i % 3 === 0),
  activityByCategory: [
    { name: 'Calm down', count: 3 },
    { name: 'Focus', count: 1 },
  ],
  milestones: [
    { title: 'A milestone', date: 'Today' },
    { title: 'An earlier one', date: '01.10.26' },
  ],
}

/**
 * The month so far, in the student's zone: the four stats, the check-in days,
 * the feelings and activities behind them, and the milestones reached
 * (`studentActivity` + `moodCounts` + milestones, one request). No BP session
 * or a failed read ⇒ zeros, never a `localStorage` fallback.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<JourneyData> {
  if (isPreviewRequest(request)) return PREVIEW

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return EMPTY_JOURNEY

  const today = localDateFor(request) ?? new Date().toISOString().slice(0, 10)
  const result = await bpJourney(bp.accessToken, today, timeZoneFor(request))
  if (!result.ok) {
    console.error(`[journey] activity read failed (${result.error.kind}): ${result.error.message}`)
    return EMPTY_JOURNEY
  }
  return result.data
}

/** Keeps the render client-only (the spark swarm and carousel run on refs). */
export async function clientLoader({ serverLoader }: { serverLoader: () => ReturnType<typeof loader> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Journey" route="/student/journey" source="journey.html" chrome />
}

export default function StudentJourneyRoute({ loaderData }: { loaderData: JourneyData }) {
  return <JourneyHome data={loaderData} />
}
