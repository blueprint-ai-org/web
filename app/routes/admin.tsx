/**
 * `/admin` — Admin persona placeholder.
 *
 * Unlike `/teacher` and `/parent`, this route runs a small loader to surface
 * the detected role URIs + LTI custom fields so the placeholder can render a
 * dev/QA debug panel. The prototype has no real admin dashboard yet; this is
 * a stub that confirms admin classification end-to-end.
 *
 * The persona layout (`_persona.tsx`) still owns the LTI session gate, theme
 * cookie, Canvas header chrome, and `frame-ancestors` CSP.
 */

import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { useLoaderData } from 'react-router'
import { getLtiToken } from '~/lib/lti-session.server'
import { AdminPlaceholder } from '~/components/dashboard/AdminPlaceholder'

export const meta: MetaFunction = () => [{ title: 'Admin · Blueprint' }]

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getLtiToken(request)
  return {
    detectedRoles: (token?.platformContext?.roles ?? []) as string[],
    customFields: (token?.platformContext?.custom ?? {}) as Record<string, string>,
  }
}

export default function AdminRoute() {
  const data = useLoaderData<typeof loader>()
  return <AdminPlaceholder {...data} />
}
