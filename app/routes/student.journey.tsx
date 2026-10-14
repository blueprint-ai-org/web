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
import { bpHub } from '~/lib/bp-ai/gamification.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

export function meta() {
  return [{ title: 'Journey · Blueprint' }, { name: 'description', content: 'Student journey.' }]
}

/**
 * The Sparkz stat is the server's balance (`sparkBalance`). No BP session ⇒ 0,
 * never a `localStorage` fallback. The other stats are step-24's.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ sparks: number }> {
  if (isPreviewRequest(request)) return { sparks: 120 }

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { sparks: 0 }

  // `bpHub` rather than a balance-only query: one module, one request either way.
  const hub = await bpHub(session.session.accessToken, undefined)
  if (!hub.ok) {
    console.error(`[journey] sparkBalance failed (${hub.error.kind}): ${hub.error.message}`)
    return { sparks: 0 }
  }
  return { sparks: hub.data.balance }
}

/** Keeps the render client-only (the spark swarm and carousel run on refs). */
export async function clientLoader({ serverLoader }: { serverLoader: () => ReturnType<typeof loader> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Journey" route="/student/journey" source="journey.html" chrome />
}

export default function StudentJourneyRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <JourneyHome sparks={loaderData.sparks} />
}
