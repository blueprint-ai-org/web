/**
 * `/student/school` — grades / attendance dashboard (ports `grades.html`).
 * Query: `?tab`.
 *
 * Sidebar-bearing stage page (Phase 12): tabbed grades/attendance dashboard, the
 * subject drawer, the two video promos (heart-save + `?from=grades|grades-attend`
 * return), the grades-journal overlay, and the circle-rise cinematic into
 * `/student/support/write`. Shared module — also mounted at
 * `/preview/student/school` (explicit id in `routes.ts`). Client-only render
 * (see `HydrateFallback`).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from 'react-router'

import { SchoolDashboard, type PromoLesson } from '~/components/dashboard/student/school/SchoolDashboard'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpLessonsWithSaved, lessonAction } from '~/lib/bp-ai/content.server'
import { bpRuleReward, FAMILY_EVENT } from '~/lib/bp-ai/gamification.server'
import { bpCreateGradesNote, bpMyGrades, gradesView, NO_GRADE, type GradesView } from '~/lib/bp-ai/grades.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

const TAG = '[school]'

export function meta() {
  return [{ title: 'Grades · Blueprint' }, { name: 'description', content: 'Student grades and attendance.' }]
}

interface SchoolData {
  grades: GradesView
  /** What the grades note pays (`write` rule), or null for no figure. */
  noteReward: number | null
  promos: { grades: PromoLesson | null; attend: PromoLesson | null }
}

const NO_PROMOS: SchoolData['promos'] = { grades: null, attend: null }

/**
 * The lesson category the two promos are seeded under
 * (`scripts/bp-ai-seed-toolkit.ts`): grades first, attendance second, by
 * `order`. Not a browse category, so they do not show up in the toolkit's.
 */
const PROMO_CATEGORY = 'school'

/** The promos' lessons and hearts. A failed read only costs the hearts. */
async function promos(accessToken: string): Promise<SchoolData['promos']> {
  const result = await bpLessonsWithSaved(accessToken, PROMO_CATEGORY)
  if (!result.ok) {
    console.error(`${TAG} promo lessons failed (${result.error.kind}): ${result.error.message}`)
    return NO_PROMOS
  }
  const saved = new Set(result.data.savedIds)
  const promo = (i: number): PromoLesson | null => {
    const l = result.data.lessons[i]
    return l ? { id: l.id, saved: saved.has(l.id) } : null
  }
  return { grades: promo(0), attend: promo(1) }
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
export async function loader({ request }: LoaderFunctionArgs): Promise<SchoolData> {
  if (isPreviewRequest(request)) return { grades: PREVIEW_GRADES, noteReward: 10, promos: NO_PROMOS }

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { grades: { state: 'unavailable' }, noteReward: null, promos: NO_PROMOS }

  const { accessToken } = session.session
  // The note is a Journal, which pays the `write` rule — announced on the pill
  // before the student writes.
  const [result, noteReward, promoLessons] = await Promise.all([
    bpMyGrades(accessToken),
    bpRuleReward(accessToken, FAMILY_EVENT.WRITE),
    promos(accessToken),
  ])
  if (!result.ok) {
    console.error(`${TAG} myGrades failed (${result.error.kind}): ${result.error.message}`)
    return { grades: { state: 'unavailable' }, noteReward, promos: promoLessons }
  }
  return { grades: gradesView(result.data), noteReward, promos: promoLessons }
}

/** Client loader — only so the render stays client-only. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

/** A heart changes nothing the loader read; do not spend three gateway calls on it. */
export function shouldRevalidate({ formData, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  return formData?.has('intent') ? false : defaultShouldRevalidate
}

export function HydrateFallback() {
  return <StagePlaceholder page="Grades" route="/student/school" source="grades.html" chrome />
}

/**
 * Save the grades-journal note as a Journal tagged `grades`.
 *
 * **Never fails the screen** — the overlay has already moved to "Note saved!".
 * A refused or unreachable write is logged and reported as `{ saved: false }`.
 * `sparksAwarded` is what the write paid, for the done screen's reward.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { saved: false, sparksAwarded: null }

  const form = await request.formData()
  // A promo's heart (`intent: save`) rather than the note.
  if (form.has('intent')) {
    const result = await lessonAction(session.session.accessToken, form, TAG)
    return { saved: result.ok, sparksAwarded: null }
  }

  const note = String(form.get('note') ?? '').trim()
  if (!note) return { saved: false, sparksAwarded: null }

  const result = await bpCreateGradesNote(session.session.accessToken, session.session.userId, note)
  if (!result.ok) {
    console.error(`${TAG} grades note failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false, sparksAwarded: null }
  }
  return { saved: true, sparksAwarded: result.data.sparksAwarded }
}

export default function StudentSchoolRoute({ loaderData }: { loaderData: SchoolData }) {
  return <SchoolDashboard grades={loaderData.grades} noteReward={loaderData.noteReward} promos={loaderData.promos} />
}
