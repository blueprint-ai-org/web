import type { CourseGrade } from '~/lib/bp-ai/grades.server'

/**
 * The subject detail drawer (ports `grades.html`'s `#subject-drawer`,
 * `:854-973`). Slides in from the right (1200ms anticipation curve) over a
 * dimmed main content + backdrop, showing the course, its teacher and grade.
 *
 * Stays mounted for the slide transition; `open` drives the transform and
 * `course` swaps the content. Closing keeps the course so it doesn't flicker
 * during the slide-out.
 */

const BEZ = 'cubic-bezier(0.73, -0.01, 0.2, 0.98)'

export interface SubjectDrawerProps {
  course: CourseGrade | null
  open: boolean
  onClose: () => void
}

export function SubjectDrawer({ course, open, onClose }: SubjectDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 49, display: open ? 'block' : 'none' }} />

      <div
        className="gr-drawer"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 580,
          height: 834,
          background: '#2b2b32',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform 1200ms ${BEZ}`,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px 10px',
          boxSizing: 'border-box',
        }}
      >
        {course ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 16, borderRadius: 8 }}>
            {/* Header. The prototype's coach message, per-category stats, hint,
                "See all assignments" and target-grade calculator are gone: the
                LMS gives a course grade and nothing per category (step-26). */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, lineHeight: '40px', letterSpacing: '-0.8px', color: '#fff', display: 'block', marginBottom: 2 }}>{course.name}</span>
                <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: '#737472', lineHeight: '20px', letterSpacing: '-0.1px', display: 'block' }}>{course.teacher}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, lineHeight: '40px', letterSpacing: '-0.8px', color: '#fff', display: 'block' }}>{course.grade}</span>
                <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.25)', lineHeight: '20px', letterSpacing: '-0.1px', display: 'block' }}>{course.pct}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
