/**
 * `/preview/admin` — dev-only Admin persona placeholder preview.
 *
 * Renders `AdminPlaceholder` with empty `detectedRoles` and `customFields`
 * since there's no LTI session in the preview flow.
 */

import { AdminPlaceholder } from '~/components/dashboard/AdminPlaceholder'

export function meta() {
  return [
    { title: 'Admin (preview) · Blueprint' },
    { name: 'description', content: 'Admin placeholder preview.' },
  ]
}

export default function PreviewAdminRoute() {
  return <AdminPlaceholder detectedRoles={[]} customFields={{}} />
}
