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
import type { SummaryDay } from '~/components/dashboard/student/summary/summary-data'
import { bpSummaryDays } from '~/lib/bp-ai/activity.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor, timeZoneFor } from '~/lib/student/time-zone'

export function meta() {
  return [{ title: 'Summary · Blueprint' }, { name: 'description', content: 'Day summary.' }]
}

/** Nothing recorded: today alone, empty. */
const EMPTY: SummaryDay[] = [{ label: 'Today', sections: [], mood: { emotions: [], reasons: [], chips: [] } }]

const PREVIEW: SummaryDay[] = [
  {
    label: '13.10.26',
    sections: ['mood', 'write'],
    mood: {
      emotions: [{ name: 'TIRED', img: 'emotion-tired.svg' }],
      reasons: ['School life'],
      chips: ['Drained', 'Sleepy', 'Worn out'],
    },
    write: { text: 'A note written yesterday.' },
  },
  {
    label: 'Today',
    sections: ['mood', 'wins'],
    mood: { emotions: [{ name: 'HAPPY', img: 'emotion-happy.svg' }], reasons: [], chips: ['Joyful', 'Content', 'Cheerful'] },
    wins: { question: 'A wins question?', answer: 'Its answer.' },
  },
]

/**
 * The last seven local days from `studentActivity`, today last: each day's
 * check-in, journal note, about-you answer and win. No BP session or a failed
 * read ⇒ an empty today, never `localStorage` or invented days.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ days: SummaryDay[] }> {
  if (isPreviewRequest(request)) return { days: PREVIEW }

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { days: EMPTY }

  const today = localDateFor(request) ?? new Date().toISOString().slice(0, 10)
  const result = await bpSummaryDays(bp.accessToken, today, timeZoneFor(request))
  if (!result.ok || result.data.length === 0) {
    if (!result.ok) console.error(`[summary] activity read failed (${result.error.kind}): ${result.error.message}`)
    return { days: EMPTY }
  }
  return { days: result.data }
}

/** Keeps the render client-only. */
export async function clientLoader({ serverLoader }: { serverLoader: () => ReturnType<typeof loader> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Summary" route="/student/summary" source="summary.html" />
}

export default function StudentSummaryRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <Summary days={loaderData.days} />
}
