/**
 * `/preview/student` — dev-only Student persona preview layout.
 *
 * Mirrors `student.tsx`: renders an `<Outlet />` for the active child route.
 * The `_index` slot renders the dashboard; the `onboarding` slot renders the
 * wizard (same step components as the LTI tree, navigation kept inside preview
 * via `useOnboardingNav`). The `_preview.tsx` parent owns the production 404
 * gate, the "PREVIEW MODE" banner, and the `student-dark` scope.
 */

import { Outlet, useOutletContext } from 'react-router'
import type { PreviewOutletContext } from './_preview'

export function meta() {
  return [
    { title: 'Student (preview) · Blueprint' },
    { name: 'description', content: 'Student wellbeing dashboard preview.' },
  ]
}

export default function PreviewStudentLayout() {
  // Forward the preview context (themeMode) to children — same Outlet pattern
  // as `student.tsx`.
  const ctx = useOutletContext<PreviewOutletContext>()
  return <Outlet context={ctx} />
}
