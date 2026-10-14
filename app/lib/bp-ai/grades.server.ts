/**
 * The student's own grades and attendance, from the school's connected LMS.
 *
 * ```graphql
 * myGrades: MyGrades!   # @auth(type: USER), no arguments
 * ```
 *
 * The student is the token's user — there is no id to pass, and an API key is
 * refused. Canvas only: with Classroom connected the gateway answers
 * `lmsConnected: true` and no courses, because Classroom has no course grade.
 *
 * **Null is "no data", never zero.** `currentScore`, `currentGrade` and
 * `attendancePercent` are null when the LMS has nothing yet (no grade posted,
 * no Roll Call in the course). {@link gradesView} keeps that distinction all the
 * way to the screen: a `0%` the student never earned is worse than no figure.
 */

import { bpCreateJournal } from './journal.server'
import { graphql } from './client.server'
import { gql } from './gql'
import type { MyGradesQuery } from './gql/graphql'
import type { GqlResult } from './types'

const MY_GRADES = gql(`query MyGrades {
  myGrades {
    lmsConnected
    studentMatched
    courses {
      lmsType
      courseExternalId
      courseName
      teacherName
      currentScore
      currentGrade
      attendancePercent
    }
  }
}`)

export type BpMyGrades = MyGradesQuery['myGrades']

export async function bpMyGrades(accessToken: string): Promise<GqlResult<BpMyGrades>> {
  const result = await graphql(MY_GRADES, {}, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.myGrades }
}

/** What a course card shows. Display strings — the screen does no formatting. */
export interface CourseGrade {
  key: string
  name: string
  teacher: string
  /** The letter, else the score, else {@link NO_GRADE}. */
  grade: string
  /** The score under the letter, or null when there is no letter or no score. */
  pct: string | null
  /** Roll Call attendance, or null when the course does not record it. */
  attendance: string | null
}

export type GradesView =
  /** No BP session, or the gateway failed. Never filled in with demo data. */
  | { state: 'unavailable' }
  | { state: 'no-lms' }
  | { state: 'unmatched' }
  | {
      state: 'ready'
      courses: CourseGrade[]
      /** Mean over the courses that HAVE attendance; null when none does. */
      attendanceAverage: string | null
    }

export const NO_GRADE = 'No grade yet'

const pct = (n: number) => `${n.toFixed(1)}%`

export function gradesView(grades: BpMyGrades): GradesView {
  // The gateway sends `studentMatched: false` too when nothing is connected;
  // "no LMS" is the truer of the two.
  if (!grades.lmsConnected) return { state: 'no-lms' }
  if (!grades.studentMatched) return { state: 'unmatched' }

  const courses = grades.courses.map((c) => ({
    key: `${c.lmsType}:${c.courseExternalId}`,
    name: c.courseName,
    teacher: c.teacherName,
    grade: c.currentGrade ?? (c.currentScore != null ? pct(c.currentScore) : NO_GRADE),
    pct: c.currentGrade != null && c.currentScore != null ? pct(c.currentScore) : null,
    attendance: c.attendancePercent != null ? pct(c.attendancePercent) : null,
  }))

  const attended = grades.courses.flatMap((c) => (c.attendancePercent != null ? [c.attendancePercent] : []))
  return {
    state: 'ready',
    courses,
    attendanceAverage: attended.length ? pct(attended.reduce((a, b) => a + b, 0) / attended.length) : null,
  }
}

/**
 * Save the grades-journal note as a Journal entry tagged `grades`.
 *
 * It used to live in `localStorage`: free text from a
 * student that never left the device and never reached the safety stack. A
 * Journal publishes `journal-created`, which is what `agent` analyses. No
 * catalogue prompt backs this note, so no `question_ids`.
 */
export function bpCreateGradesNote(accessToken: string, userId: string, note: string) {
  return bpCreateJournal(accessToken, userId, { prompt: 'Grades', note, tags: ['grades'] })
}
