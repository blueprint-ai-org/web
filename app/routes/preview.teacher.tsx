/**
 * `/preview/teacher` — dev-only Teacher persona preview.
 *
 * Renders `TeacherWellbeing` without an LTI session. The `_preview.tsx`
 * layout owns the production 404 gate, the "PREVIEW MODE" banner, and the
 * theme query param.
 */

import TeacherWellbeing from '~/components/dashboard/TeacherWellbeing'

export function meta() {
  return [
    { title: 'Teacher (preview) · Blueprint' },
    { name: 'description', content: 'Teacher wellbeing dashboard preview.' },
  ]
}

export default function PreviewTeacherRoute() {
  return <TeacherWellbeing />
}
