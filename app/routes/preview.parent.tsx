/**
 * `/preview/parent` — dev-only Parent persona placeholder preview.
 */

import { ParentPlaceholder } from '~/components/dashboard/ParentPlaceholder'

export function meta() {
  return [
    { title: 'Parent (preview) · Blueprint' },
    { name: 'description', content: 'Parent wellbeing portal preview.' },
  ]
}

export default function PreviewParentRoute() {
  return <ParentPlaceholder />
}
