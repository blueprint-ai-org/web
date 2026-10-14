/**
 * `/student/summary` — day summary (ports `summary.html`).
 *
 * Full-bleed page (no sidebar): a 2×2 section grid (Mood · Write · About · Wins)
 * over a day carousel, with a mood-detail overlay and per-card edit deep links
 * (Phase 7). Read-only — no write action. Client-only render (see
 * `HydrateFallback`). Mirrored at `/preview/student/summary`.
 */

import type { LoaderFunctionArgs } from 'react-router'

import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { Summary } from '~/components/dashboard/student/summary'
import type { SectionKey } from '~/components/dashboard/student/summary/summary-data'
import { bpHub } from '~/lib/bp-ai/gamification.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor } from '~/lib/student/time-zone'

export function meta() {
  return [{ title: 'Summary · Blueprint' }, { name: 'description', content: 'Day summary.' }]
}

/**
 * Which of today's sections are done — `dailyCards`, for the student's day.
 * No BP session ⇒ none, never a `localStorage` fallback.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ todaySections: SectionKey[] }> {
  if (isPreviewRequest(request)) return { todaySections: ['mood', 'write'] }

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { todaySections: [] }

  const hub = await bpHub(session.session.accessToken, localDateFor(request))
  if (!hub.ok) {
    console.error(`[summary] hub read failed (${hub.error.kind}): ${hub.error.message}`)
    return { todaySections: [] }
  }
  // The family enum, lower-cased, is the summary's section key.
  return { todaySections: hub.data.done.map((f) => f.toLowerCase() as SectionKey) }
}

/** Keeps the render client-only: today's card content is still local storage. */
export async function clientLoader({ serverLoader }: { serverLoader: () => ReturnType<typeof loader> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Summary" route="/student/summary" source="summary.html" />
}

export default function StudentSummaryRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <Summary todaySections={loaderData.todaySections} />
}
