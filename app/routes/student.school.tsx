/**
 * `/student/school` — grades / attendance dashboard (ports `grades.html`).
 * Query: `?tab`.
 *
 * Sidebar-bearing stage page (Phase 12): tabbed grades/attendance dashboard, the
 * subject drawer, the attendance chart-reveal, calming-breath video promos
 * (heart-save + `?from=grades|grades-attend` return), the grades-journal overlay
 * (`bp_grades_note`), and the circle-rise cinematic into `/student/support/write`.
 * Shared module — also mounted at `/preview/student/school` (explicit id in
 * `routes.ts`). Client-only render (see `HydrateFallback`).
 */

import { SchoolDashboard } from '~/components/dashboard/student/school'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Grades · Blueprint' }, { name: 'description', content: 'Student grades and attendance.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — grades reads its journal note + hearted items via the adapter. */
export function clientLoader() {
  return {
    gradesNote: studentStorage.getGradesNote(),
    saved: studentStorage.getSaved(['v1']),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Grades" route="/student/school" source="grades.html" chrome />
}

/** Stub action — the future write seam (grades-journal note + heart). */
export function action() {
  return null
}

export default function StudentSchoolRoute() {
  return <SchoolDashboard />
}
