/**
 * `/student/recap` — 6-slide monthly-recap story (ports `recap.html`).
 *
 * Full-bleed page (no sidebar): a direction-aware slide machine with an
 * animation lock, segmented progress, a device-level clip-path entry reveal, and
 * a final-slide wave shrink (Phase 10). The figures are the current month's
 * `studentActivity` totals, in the student's zone. Exit →
 * `/student/journey?from=recap`. Mirrored at `/preview/student/recap`.
 */

import type { LoaderFunctionArgs } from 'react-router'

import { RecapStory } from '~/components/dashboard/student/recap'
import { bpRecap, monthLabel, type RecapData } from '~/lib/bp-ai/activity.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor, timeZoneFor } from '~/lib/student/time-zone'

export function meta() {
  return [{ title: 'Recap · Blueprint' }, { name: 'description', content: 'Monthly recap story.' }]
}

function empty(today: string): RecapData {
  return { month: monthLabel(today), moodsNamed: 0, journals: 0, lessonsViewed: 0, lessonsCompleted: 0 }
}

/**
 * This month's totals. No BP session or a failed read ⇒ the month with zeros,
 * never the prototype's "May 2026".
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<RecapData> {
  const today = localDateFor(request) ?? new Date().toISOString().slice(0, 10)
  if (isPreviewRequest(request)) return { month: monthLabel(today), moodsNamed: 27, journals: 5, lessonsViewed: 10, lessonsCompleted: 12 }

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return empty(today)

  const result = await bpRecap(session.session.accessToken, today, timeZoneFor(request))
  if (!result.ok) {
    console.error(`[recap] activity read failed (${result.error.kind}): ${result.error.message}`)
    return empty(today)
  }
  return result.data
}

export default function StudentRecapRoute({ loaderData }: { loaderData: RecapData }) {
  return <RecapStory data={loaderData} />
}
