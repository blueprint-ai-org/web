/**
 * `/counselor/student-wellbeing` — Student Wellbeing detail view.
 */

import { StudentWellbeing } from '~/components/dashboard/views/StudentWellbeing'

export function meta() {
  return [
    { title: 'Student Wellbeing · Counselor · Blueprint' },
    { name: 'description', content: 'Counselor student wellbeing detail.' },
  ]
}

export default function CounselorStudentWellbeingRoute() {
  return <StudentWellbeing />
}
