/**
 * `/counselor/class-health` — Class Health view.
 *
 * The climate card reads the caller's school's `cohortMetrics` (step-15). No
 * BP session or a failed read is the empty card, never the prototype's
 * dimensions.
 */

import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'

import { ClassHealth } from '~/components/dashboard/views/ClassHealth'
import { bpSchoolClimate } from '~/lib/bp-ai/dashboard.server'
import type { ClassClimate } from '~/lib/class-climate'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

export function meta() {
  return [
    { title: 'Class Health · Counselor · Blueprint' },
    { name: 'description', content: 'Counselor class health overview.' },
  ]
}

export async function loader({ request }: LoaderFunctionArgs): Promise<{ climate: ClassClimate | null }> {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { climate: null }

  const result = await bpSchoolClimate(bp.accessToken)
  if (!result.ok) {
    console.error(`[counselor/class-health] cohortMetrics failed (${result.error.kind}): ${result.error.message}`)
    return { climate: null }
  }
  return { climate: result.data }
}

export default function CounselorClassHealthRoute() {
  const { climate } = useLoaderData<typeof loader>()
  return <ClassHealth climate={climate} />
}
