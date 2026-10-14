/**
 * `/student/school` — grades / attendance dashboard (ports `grades.html`).
 * Query: `?tab`.
 *
 * Sidebar-bearing stage page (Phase 12): tabbed grades/attendance dashboard, the
 * subject drawer, calming-breath video promos (heart-save + `?from=grades|grades-attend`
 * return), the grades-journal overlay, and the circle-rise cinematic into
 * `/student/support/write`. Shared module — also mounted at
 * `/preview/student/school` (explicit id in `routes.ts`). Client-only render
 * (see `HydrateFallback`).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { SchoolDashboard } from '~/components/dashboard/student/school'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpCreateGradesNote, bpMyGrades, gradesView, NO_GRADE, type GradesView } from '~/lib/bp-ai/grades.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

const TAG = '[school]'

export function meta() {
  return [{ title: 'Grades · Blueprint' }, { name: 'description', content: 'Student grades and attendance.' }]
}

/** `/preview` has no session; it shows the layout with neutral rows. */
const PREVIEW_GRADES: GradesView = {
  state: 'ready',
  courses: [
    { key: 'preview:1', name: 'Course one', teacher: 'Teacher', grade: 'B', pct: '84.0%', attendance: '92.0%' },
    { key: 'preview:2', name: 'Course two', teacher: 'Teacher', grade: '71.5%', pct: null, attendance: null },
    { key: 'preview:3', name: 'Course three', teacher: 'Teacher', grade: NO_GRADE, pct: null, attendance: null },
  ],
  attendanceAverage: '92.0%',
}

/**
 * The student's courses from `myGrades`. **Never demo data**: no BP session (an
 * LTI launch has no BP AI token) or a failed read is `unavailable`, and the
 * screen says so.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ grades: GradesView }> {
  if (isPreviewRequest(request)) return { grades: PREVIEW_GRADES }

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { grades: { state: 'unavailable' } }

  const result = await bpMyGrades(session.session.accessToken)
  if (!result.ok) {
    console.error(`${TAG} myGrades failed (${result.error.kind}): ${result.error.message}`)
    return { grades: { state: 'unavailable' } }
  }
  return { grades: gradesView(result.data) }
}

/** Client loader — only so the render stays client-only (the hearts read storage). */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Grades" route="/student/school" source="grades.html" chrome />
}

/**
 * Save the grades-journal note as a Journal tagged `grades`.
 *
 * **Never fails the screen** — the overlay has already moved to "Note saved!".
 * A refused or unreachable write is logged and reported as `{ saved: false }`.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { saved: false }

  const note = String((await request.formData()).get('note') ?? '').trim()
  if (!note) return { saved: false }

  const result = await bpCreateGradesNote(session.session.accessToken, session.session.userId, note)
  if (!result.ok) {
    console.error(`${TAG} grades note failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentSchoolRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <SchoolDashboard grades={loaderData.grades} />
}
