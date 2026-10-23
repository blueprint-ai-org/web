/**
 * `/preview/counselor/class-health` — dev-only Class Health preview.
 */

import { ClassHealth } from '~/components/dashboard/views/ClassHealth'
import { PREVIEW_CLASS_CLIMATE } from '~/lib/class-climate'

export function meta() {
  return [
    { title: 'Class Health · Counselor (preview) · Blueprint' },
    { name: 'description', content: 'Counselor class health overview preview.' },
  ]
}

export default function PreviewCounselorClassHealthRoute() {
  return <ClassHealth climate={PREVIEW_CLASS_CLIMATE} />
}
