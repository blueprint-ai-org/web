/**
 * `/counselor/class-health` — Class Health view.
 */

import { ClassHealth } from '~/components/dashboard/views/ClassHealth'

export function meta() {
  return [
    { title: 'Class Health · Counselor · Blueprint' },
    { name: 'description', content: 'Counselor class health overview.' },
  ]
}

export default function CounselorClassHealthRoute() {
  return <ClassHealth />
}
