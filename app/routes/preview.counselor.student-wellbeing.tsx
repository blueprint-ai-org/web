/**
 * `/preview/counselor/student-wellbeing` — dev-only Student Wellbeing preview.
 */

import { StudentWellbeing } from '~/components/dashboard/views/StudentWellbeing'

export function meta() {
  return [
    { title: 'Student Wellbeing · Counselor (preview) · Blueprint' },
    { name: 'description', content: 'Counselor student wellbeing detail preview.' },
  ]
}

export default function PreviewCounselorStudentWellbeingRoute() {
  return <StudentWellbeing />
}
