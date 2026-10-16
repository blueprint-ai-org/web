/**
 * Grades/School copy — ported from `grades.html`.
 *
 * The prototype's subjects, per-category breakdown, letter scale and semester
 * attendance were all invented; the data now comes from `myGrades`
 * (`~/lib/bp-ai/grades.server`). What stays here is UI copy only.
 */

// ── Copy ────────────────────────────────────────────────────────────────────

export const GRADES_COPY = {
  title: 'Grades',
  desc: 'Stay on top of school.',
  tabGrades: 'Grades',
  tabAttendance: 'Attendance',
  rememberLabel: 'Remember',
  rememberText: ['Everyone has ups and downs.', "Want to write about what's been going on?"],
  btnJournal: 'Journal',
  btnGetSupport: 'Get support',
} as const

export const GRADES_VIDEO = {
  grades: { duration: '1:30', spark: '1', title: ['The emotional', 'side of grades'], from: 'grades' },
  attend: { duration: '1:30', spark: '1', title: ['How to catch up after missing school'], from: 'grades-attend' },
} as const

export const ATTENDANCE = {
  statLabel: 'This semester',
  // Roll Call is the only attendance source an LMS exposes; most courses have none.
  none: "Your school doesn't record attendance here.",
} as const

/** What the Grades tab says instead of a course list. */
export const GRADES_STATE_COPY = {
  unavailable: "Your grades aren't available right now.",
  'no-lms': "Your school hasn't connected its LMS.",
  unmatched: "We couldn't find your courses.",
  empty: 'No courses to show yet.',
} as const

export const GJ_COPY = {
  title: 'Grades & attendance',
  bubbleText: "There's more to you than your grades. Want to write about what's been going on?",
  placeholder: 'Start writing here',
  save: 'Save',
  doneTitle: 'Note saved!',
  doneBubbleText: 'Did writing this help you understand your feelings more?',
  btnNotReally: 'Not really',
  btnYesABit: 'Yes, a bit!',
} as const
