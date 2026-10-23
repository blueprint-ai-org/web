/**
 * `/counselor/insights` — Support Mission Control view.
 *
 * The watchlist is the caller's school's `cohortRisk` (step-15). No BP session
 * — a credential-less visit, a launch the gateway would not exchange, an admin
 * launch — or a failed read is the empty watchlist, never the prototype's
 * students and never a `localStorage` fallback.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { useFetcher, useLoaderData } from 'react-router'

import { SupportMissionControl } from '~/components/dashboard/views/SupportMissionControl'
import { bpAcknowledgeRiskAlert, bpSchoolWatchlist } from '~/lib/bp-ai/dashboard.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import type { WatchlistRow } from '~/lib/watchlist'

export function meta() {
  return [
    { title: 'Insights · Counselor · Blueprint' },
    { name: 'description', content: 'Counselor support mission control.' },
  ]
}

export async function loader({ request }: LoaderFunctionArgs): Promise<{ watchlist: WatchlistRow[] }> {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { watchlist: [] }

  const result = await bpSchoolWatchlist(bp.accessToken)
  if (!result.ok) {
    console.error(`[counselor/insights] cohortRisk failed (${result.error.kind}): ${result.error.message}`)
    return { watchlist: [] }
  }
  return { watchlist: result.data }
}

/** "Resolved" in the escalation modal closes the alert. */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  const alertId = String((await request.formData()).get('alertId') ?? '')
  if (!bp || !alertId) return { ok: false }

  const result = await bpAcknowledgeRiskAlert(bp.accessToken, alertId)
  if (!result.ok) {
    console.error(`[counselor/insights] acknowledgeRiskAlert failed (${result.error.kind}): ${result.error.message}`)
  }
  return { ok: result.ok }
}

export default function CounselorInsightsRoute() {
  const { watchlist } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  return (
    <SupportMissionControl
      watchlist={watchlist}
      onResolve={(alertId) => fetcher.submit({ alertId }, { method: 'post' })}
    />
  )
}
