/**
 * Grades/School data model — ported 1:1 from `grades.html`'s inline JS + markup.
 *
 * The page is entirely demo/hardcoded in the prototype: nothing but the journal
 * note (`bp_grades_note`) and the video hearts (`bp_saved`) touch storage. This
 * module carries the baked constants so {@link SchoolDashboard},
 * {@link SubjectDrawer}, and {@link GradesJournalOverlay} stay declarative.
 *
 *  - {@link SUBJECTS} — the six subject cards on the Grades tab (`grades.html:701-762`).
 *  - {@link SUBJECT_DETAIL} — per-subject drawer data (`grades.html:1110-1183`).
 *  - {@link GRADE_ORDER} — the target-grade ordering that gates the picker.
 *  - {@link ATTENDANCE} — the Attendance tab stat + chart months.
 *
 * Documented prototype quirk: the subject *cards* hardcode `Mr Smith` as the
 * teacher for Art/Music/Physics, while the *drawer* data names Ms Rivera /
 * Ms Park / Mr Nowak. Both are ported verbatim — the card shows the markup
 * fallback, the drawer shows `subjectData`, exactly as the prototype rendered.
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
  statNumber: '70.2%',
  badge: 'Less active lately',
  months: ['Feb', 'Mar', 'Apr', 'May'],
} as const

export const GJ_COPY = {
  sparkPill: '1',
  title: 'Grades & attendance',
  bubbleText: "There's more to you than your grades. Want to write about what's been going on?",
  placeholder: 'Start writing here',
  save: 'Save',
  donePlus: '+1',
  doneTitle: 'Note saved!',
  doneBubbleText: 'Did writing this help you understand your feelings more?',
  btnNotReally: 'Not really',
  btnYesABit: 'Yes, a bit!',
} as const

export const DRW_COPY = {
  statHomework: 'Homework',
  statQuizzes: 'Quizzes',
  statMidterm: 'Midterm',
  statFinal: 'Final Exam',
  na: 'Not graded yet',
  btnSeeAll: 'See all assignments',
  btnCalc: 'Calculate my target grade',
  assignHw: 'Homework',
  assignQz: 'Quizzes',
  assignMt: 'Midterm',
  calcQuestion: 'What final grade do you want to achieve?',
  calcNeeded: 'Needed',
  calcContext: 'On final exam',
} as const

// ── Subject cards (grades.html:701-762) ──────────────────────────────────────

export interface SubjectCard {
  readonly key: string
  readonly name: string
  readonly teacher: string
  readonly grade: string
  readonly pct: string
}

export const SUBJECTS: readonly SubjectCard[] = [
  { key: 'Math', name: 'Math', teacher: 'Mr Kowalski', grade: 'B', pct: '84.2%' },
  { key: 'Art', name: 'Art', teacher: 'Mr Smith', grade: 'A-', pct: '84.2%' },
  { key: 'Biology', name: 'Biology', teacher: 'Mr Smith', grade: 'C', pct: '66.3%' },
  { key: 'Music', name: 'Music', teacher: 'Mr Smith', grade: 'C', pct: '66.3%' },
  { key: 'Physics', name: 'Physics', teacher: 'Mr Smith', grade: 'C', pct: '66.3%' },
  { key: 'History', name: 'History', teacher: 'Ms Johnson', grade: 'B+', pct: '88.1%' },
] as const

// ── Subject drawer detail (grades.html:1110-1183) ────────────────────────────

export type NoteRow = readonly [name: string, score: string]

export interface SubjectDetail {
  readonly grade: string
  readonly pct: string
  readonly teacher: string
  readonly message: string
  readonly hw: string
  readonly hwBar: number
  readonly qz: string
  readonly qzBar: number
  readonly mt: string
  readonly mtBar: number
  readonly hint: string
  readonly notes: { readonly hw: readonly NoteRow[]; readonly qz: readonly NoteRow[]; readonly mt: readonly NoteRow[] }
  readonly calc: Readonly<Record<string, string>>
}

export const SUBJECT_DETAIL: Record<string, SubjectDetail> = {
  Math: {
    grade: 'B', pct: '84.2%', teacher: 'Mr Kowalski',
    message: "Things are looking good here. You've been consistent with homework and it shows. Next up: quiz on Dec 3.",
    hw: '91.7%', hwBar: 91.7, qz: '80.5%', qzBar: 80.5, mt: '84.0%', mtBar: 84,
    hint: "Review chapter 7 before the quiz — it's only 12 pages.",
    notes: { hw: [['HW 1', '18/20'], ['HW 2', '18/20'], ['HW 3', '19/20']], qz: [['Quiz 1', '82/100'], ['Quiz 2', '70/100']], mt: [['Exam', '84/100']] },
    calc: { A: '95%', 'A-': '89%', 'B+': '81%', B: '72%', 'B-': '68%', 'C+': '55%', C: '42%' },
  },
  Art: {
    grade: 'A-', pct: '84.2%', teacher: 'Ms Rivera',
    message: "You're crushing it in Art. Your portfolio piece really stood out. Keep that energy for the final project.",
    hw: '88.0%', hwBar: 88, qz: '92.5%', qzBar: 92.5, mt: '80.0%', mtBar: 80,
    hint: 'Final project brief drops next week — start thinking about your theme.',
    notes: { hw: [['HW 1', '17/20'], ['HW 2', '19/20'], ['Portfolio', 'A']], qz: [['Quiz 1', '91/100'], ['Quiz 2', '94/100']], mt: [['Project', '80/100']] },
    calc: { A: '92%', 'A-': '82%', 'B+': '70%', B: '58%', 'B-': '46%', 'C+': '34%', C: '22%' },
  },
  Biology: {
    grade: 'C', pct: '66.3%', teacher: 'Mr Smith',
    message: 'Homework has been solid but tests are pulling the grade down. Reviewing your notes before each quiz would help.',
    hw: '75.0%', hwBar: 75, qz: '62.0%', qzBar: 62, mt: '58.0%', mtBar: 58,
    hint: "Cell division is worth 30% of the final. It's worth the extra hour.",
    notes: { hw: [['HW 1', '14/20'], ['HW 2', '16/20'], ['HW 3', '12/20']], qz: [['Quiz 1', '65/100'], ['Quiz 2', '60/100']], mt: [['Exam', '58/100']] },
    calc: { A: '100%', 'A-': '97%', 'B+': '89%', B: '80%', 'B-': '71%', 'C+': '63%', C: '54%' },
  },
  Music: {
    grade: 'C', pct: '66.3%', teacher: 'Ms Park',
    message: 'You started well but performance scores have dipped. Practice sessions are logged — try to get two in before Friday.',
    hw: '70.0%', hwBar: 70, qz: '68.0%', qzBar: 68, mt: '65.0%', mtBar: 65,
    hint: 'The rhythm section quiz is Dec 8. Three practice runs should do it.',
    notes: { hw: [['HW 1', '13/20'], ['HW 2', '15/20'], ['HW 3', '14/20']], qz: [['Quiz 1', '68/100'], ['Quiz 2', '72/100']], mt: [['Performance', '65/100']] },
    calc: { A: '100%', 'A-': '95%', 'B+': '87%', B: '78%', 'B-': '70%', 'C+': '61%', C: '52%' },
  },
  Physics: {
    grade: 'C', pct: '66.3%', teacher: 'Mr Nowak',
    message: "Lab work has been great — that's saving you here. Brush up on motion equations before the next test.",
    hw: '72.0%', hwBar: 72, qz: '65.0%', qzBar: 65, mt: '60.0%', mtBar: 60,
    hint: "Chapter 4 is where most people drop marks. Don't skip the examples.",
    notes: { hw: [['HW 1', '15/20'], ['HW 2', '13/20'], ['Lab', '18/20']], qz: [['Quiz 1', '68/100'], ['Quiz 2', '62/100']], mt: [['Exam', '60/100']] },
    calc: { A: '100%', 'A-': '96%', 'B+': '88%', B: '79%', 'B-': '70%', 'C+': '61%', C: '52%' },
  },
  History: {
    grade: 'B+', pct: '88.1%', teacher: 'Ms Johnson',
    message: 'Strong overall — your essays show real engagement with the material. Keep it up through the final stretch.',
    hw: '90.0%', hwBar: 90, qz: '86.0%', qzBar: 86, mt: '88.0%', mtBar: 88,
    hint: "The final covers chapters 8–12. You've already nailed 8 and 9.",
    notes: { hw: [['Essay 1', '18/20'], ['HW 1', '19/20'], ['HW 2', '17/20']], qz: [['Quiz 1', '86/100'], ['Quiz 2', '88/100']], mt: [['Exam', '88/100']] },
    calc: { A: '97%', 'A-': '88%', 'B+': '76%', B: '65%', 'B-': '53%', 'C+': '41%', C: '30%' },
  },
}

/** Target-grade ordering — the picker disables the current grade and anything below it. */
export const GRADE_ORDER = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'] as const
