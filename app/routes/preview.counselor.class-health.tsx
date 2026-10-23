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

/** Dos grupos de ejemplo para que el filtro de la preview se vea poblado. */
const PREVIEW_GROUPS = [
  { id: 'g-1', label: 'Ana Ruiz · 5B' },
  { id: 'g-2', label: 'Luis Pérez · 6A' },
]

export default function PreviewCounselorClassHealthRoute() {
  return <ClassHealth climate={PREVIEW_CLASS_CLIMATE} groups={PREVIEW_GROUPS} />
}
