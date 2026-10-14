/**
 * `/student/completed` — card-complete animation route (ports `completed.html`).
 * Query: `?card`, `?from`.
 *
 * Full-bleed page (no sidebar): the ~3.9s drawer choreography then auto-redirects
 * to the hub (Phase 6). Client-only (see `HydrateFallback`). Mirrored at
 * `/preview/student/completed` (re-export).
 */

import type { LoaderFunctionArgs } from 'react-router'

import { CompletedSequence } from '~/components/dashboard/student/today'
import { COMPLETED_CARDS } from '~/components/dashboard/student/today/today-data'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpHub, bpSparkRules, FAMILY_EVENT, sparkReward } from '~/lib/bp-ai/gamification.server'
import type { DailyCardFamily } from '~/lib/bp-ai/gql/schema'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor } from '~/lib/student/time-zone'

export function meta() {
  return [{ title: 'Completed · Blueprint' }, { name: 'description', content: 'Card completed.' }]
}

interface CompletedData {
  /** Families already done today — the drawer's pre-filled slots. */
  done: DailyCardFamily[]
  /** What this card's event pays (`listSparkRules`), or null for no figure. */
  reward: number | null
}

const EMPTY: CompletedData = { done: [], reward: null }

/**
 * The drawer pre-fill and the card's reward, from the server. Without a BP
 * session the drawer is empty and the badge shows no figure — never storage.
 *
 * The reward is the RULE, not what this write paid: the activity navigates here
 * before its write answers. A card done twice in a day shows the rule's amount
 * the second time too, although the daily cap paid nothing.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<CompletedData> {
  if (isPreviewRequest(request)) return { done: ['MOOD'], reward: 10 }

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return EMPTY

  const { accessToken } = session.session
  const card = COMPLETED_CARDS[new URL(request.url).searchParams.get('card') ?? 'wins'] ?? COMPLETED_CARDS.wins
  const [hub, rules] = await Promise.all([bpHub(accessToken, localDateFor(request)), bpSparkRules(accessToken)])
  if (!hub.ok) console.error(`[completed] hub read failed (${hub.error.kind}): ${hub.error.message}`)
  if (!rules.ok) console.error(`[completed] listSparkRules failed (${rules.error.kind}): ${rules.error.message}`)
  return {
    done: hub.ok ? hub.data.done : [],
    reward: rules.ok ? sparkReward(rules.data[FAMILY_EVENT[card.family]]) : null,
  }
}

/** Keeps the render client-only (the choreography runs on timers over refs). */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<CompletedData> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Completed" route="/student/completed" source="completed.html" />
}

export default function StudentCompletedRoute({ loaderData }: { loaderData: CompletedData }) {
  return <CompletedSequence done={loaderData.done} reward={loaderData.reward} />
}
