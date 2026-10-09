/**
 * `/teacher` — Teacher persona dashboard.
 *
 * Renders `TeacherWellbeing`. The persona layout (`_persona.tsx`) owns the
 * LTI session gate, theme-mode cookie read, `CanvasHeader`, and the
 * `frame-ancestors` CSP — this route is just the content slot.
 */

import TeacherWellbeing from '~/components/dashboard/TeacherWellbeing'

export function meta() {
  return [
    { title: 'Teacher · Blueprint' },
    { name: 'description', content: 'Teacher wellbeing dashboard.' },
  ]
}

export default function TeacherRoute() {
  return <TeacherWellbeing />
}
