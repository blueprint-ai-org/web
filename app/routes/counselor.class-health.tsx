/**
 * `/counselor/class-health` — Class Health view.
 *
 * The climate card reads `cohortMetrics` (step-15). No BP session or a failed
 * read is the empty card, never the prototype's dimensions.
 *
 * `?group=` narrows the climate to one group of the school (step-30). An id
 * outside the caller's own list is IGNORED rather than forwarded: the gateway
 * would answer FORBIDDEN and the whole card would go empty for what is really
 * a stale link.
 */

import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import { ClassHealth } from '~/components/dashboard/views/ClassHealth'
import { bpClassFilters, bpSchoolClimate, type ClassGroup } from '~/lib/bp-ai/dashboard.server'
import type { ClassClimate } from '~/lib/class-climate'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

export function meta() {
  return [
    { title: 'Class Health · Counselor · Blueprint' },
    { name: 'description', content: 'Counselor class health overview.' },
  ]
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<{ climate: ClassClimate | null; groups: ClassGroup[]; group: string | null }> {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { climate: null, groups: [], group: null }

  const groups = await bpClassFilters(bp.accessToken)
  const asked = new URL(request.url).searchParams.get('group')
  const group = groups.some((g) => g.id === asked) ? asked : null

  const result = await bpSchoolClimate(bp.accessToken, group ?? undefined)
  if (!result.ok) {
    console.error(`[counselor/class-health] cohortMetrics failed (${result.error.kind}): ${result.error.message}`)
    return { climate: null, groups, group }
  }

  return { climate: result.data, groups, group }
}

export default function CounselorClassHealthRoute() {
  const { climate, groups, group } = useLoaderData<typeof loader>()
  return <ClassHealth climate={climate} groups={groups} group={group} />
}
