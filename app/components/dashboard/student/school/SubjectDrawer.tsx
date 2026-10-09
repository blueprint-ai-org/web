import { useEffect, useState, type CSSProperties } from 'react'

import { studentAsset } from '~/assets/student-app'

import { DRW_COPY, GRADE_ORDER, SUBJECT_DETAIL, type NoteRow } from './grades-data'

/**
 * The subject detail drawer (ports `grades.html`'s `#subject-drawer`,
 * `:854-973`). Slides in from the right (1200ms anticipation curve) over a
 * dimmed main content + backdrop, showing the subject's grade breakdown, an
 * encouraging message, stat bars, and two toggleable panels: "See all
 * assignments" (note rows) and "Calculate my target grade" (a grade picker that
 * gates grades at or below the current one, then shows the needed final-exam %).
 *
 * Stays mounted for the slide transition; `open` drives the transform and the
 * `subjectKey` swaps the content. Panels + target grade reset whenever a new
 * subject opens (mirrors `openSubjectDrawer`'s reset, `:1211-1220`).
 */

const BEZ = 'cubic-bezier(0.73, -0.01, 0.2, 0.98)'

const LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 14,
  fontWeight: 500,
  color: '#737472',
  letterSpacing: '-0.1px',
  lineHeight: '20px',
  marginBottom: 4,
}
const STAT_VAL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-display)',
  fontWeight: 400,
  fontSize: 20,
  lineHeight: 1.05,
  color: '#f2f3e5',
  textTransform: 'uppercase',
}

function NoteCard({ label, rows }: { label: string; rows: readonly NoteRow[] }) {
  return (
    <div style={{ flex: 1, border: '1px solid #444450', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ ...LABEL_STYLE, marginBottom: 0 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(([name, score], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, letterSpacing: '-0.1px', lineHeight: '20px' }}>
            <span style={{ color: '#737472' }}>{name}</span>
            <span style={{ color: '#a4a59f' }}>{score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBar({ label, value, bar }: { label: string; value: string; bar: number }) {
  return (
    <div style={{ flex: 1, border: '1px solid #444450', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div>
        <div style={LABEL_STYLE}>{label}</div>
        <div style={STAT_VAL_STYLE}>{value}</div>
      </div>
      <div style={{ height: 3, background: '#2f2f37', borderRadius: 2, position: 'relative', width: '100%' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: 3, background: '#737472', borderRadius: 2, width: `${bar}%` }} />
      </div>
    </div>
  )
}

export interface SubjectDrawerProps {
  subjectKey: string | null
  open: boolean
  onClose: () => void
}

export function SubjectDrawer({ subjectKey, open, onClose }: SubjectDrawerProps) {
  const [activePanel, setActivePanel] = useState<'assign' | 'calc' | null>(null)
  const [targetGrade, setTargetGrade] = useState<string | null>(null)

  // Reset panels + picker on every open (grades.html:1211-1220 runs this each
  // time, so reopening the same subject starts clean too). Closing keeps the
  // content so it doesn't flicker during the slide-out.
  useEffect(() => {
    if (!open) return
    setActivePanel(null)
    setTargetGrade(null)
  }, [open, subjectKey])

  const detail = subjectKey ? SUBJECT_DETAIL[subjectKey] : null
  const curIdx = detail ? GRADE_ORDER.indexOf(detail.grade as (typeof GRADE_ORDER)[number]) : -1

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
        {detail && subjectKey ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 16, borderRadius: 8 }}>
            {/* Header + message */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, lineHeight: '40px', letterSpacing: '-0.8px', color: '#fff', display: 'block', marginBottom: 2 }}>{subjectKey}</span>
                  <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: '#737472', lineHeight: '20px', letterSpacing: '-0.1px', display: 'block' }}>{detail.teacher}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, lineHeight: '40px', letterSpacing: '-0.8px', color: '#fff', display: 'block' }}>{detail.grade}</span>
                  <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.25)', lineHeight: '20px', letterSpacing: '-0.1px', display: 'block' }}>{detail.pct}</span>
                </div>
              </div>
              <div style={{ height: 1, background: '#444450' }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#36363f', padding: 10 }}>
                <div style={{ width: 32, height: 32, flexShrink: 0, background: '#49aee1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={studentAsset('monster-01.svg')} alt="" style={{ width: 26.667, height: 26.667, display: 'block' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#a4a59f', letterSpacing: '-0.1px', lineHeight: '20px', flex: 1, margin: 0 }}>{detail.message}</p>
              </div>
            </div>

            {/* Stats + hint */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <StatBar label={DRW_COPY.statHomework} value={detail.hw} bar={detail.hwBar} />
                  <StatBar label={DRW_COPY.statQuizzes} value={detail.qz} bar={detail.qzBar} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <StatBar label={DRW_COPY.statMidterm} value={detail.mt} bar={detail.mtBar} />
                  <div style={{ flex: 1, border: '1px solid #444450', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', opacity: 0.6, justifyContent: 'space-between', minHeight: 86 }}>
                    <div style={{ ...LABEL_STYLE, marginBottom: 0 }}>{DRW_COPY.statFinal}</div>
                    <div style={{ fontFamily: 'var(--font-student-body)', fontSize: 12, fontWeight: 500, color: '#444450', lineHeight: '16px' }}>{DRW_COPY.na}</div>
                  </div>
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#a4a59f', letterSpacing: '-0.1px', lineHeight: '20px', margin: 0 }}>{detail.hint}</p>
            </div>

            <div style={{ height: 1, background: '#444450' }} />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className={`gr-drw-btn${activePanel === 'assign' ? ' gr-drw-btn-on' : ''}`}
                onClick={() => setActivePanel((p) => (p === 'assign' ? null : 'assign'))}
                style={{ flex: 1, height: 40, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: '#f5f5f5', letterSpacing: '-0.1px' }}
              >
                {DRW_COPY.btnSeeAll}
              </button>
              <button
                type="button"
                className={`gr-drw-btn${activePanel === 'calc' ? ' gr-drw-btn-on' : ''}`}
                onClick={() => setActivePanel((p) => (p === 'calc' ? null : 'calc'))}
                style={{ flex: 1, height: 40, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: '#f5f5f5', letterSpacing: '-0.1px' }}
              >
                {DRW_COPY.btnCalc}
              </button>
            </div>

            {/* Panel: See all assignments */}
            {activePanel === 'assign' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <NoteCard label={DRW_COPY.assignHw} rows={detail.notes.hw} />
                  <NoteCard label={DRW_COPY.assignQz} rows={detail.notes.qz} />
                </div>
                <div style={{ width: 'calc(50% - 6px)' }}>
                  <NoteCard label={DRW_COPY.assignMt} rows={detail.notes.mt} />
                </div>
              </div>
            ) : null}

            {/* Panel: Calculate target grade */}
            {activePanel === 'calc' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#a4a59f', letterSpacing: '-0.1px', lineHeight: '20px', margin: '0 0 16px' }}>{DRW_COPY.calcQuestion}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GRADE_ORDER.map((g, idx) => {
                      const disabled = idx >= curIdx
                      return (
                        <button
                          key={g}
                          type="button"
                          className={`gr-grade-pill${targetGrade === g ? ' selected' : ''}`}
                          disabled={disabled}
                          onClick={() => setTargetGrade(g)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #444450', background: 'transparent', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#f2f3e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {g}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {targetGrade ? (
                  <div style={{ border: '1px solid #444450', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 20, lineHeight: 1.05, color: '#f2f3e5', textTransform: 'uppercase' }}>{detail.calc[targetGrade] ?? '—'}</div>
                      <div style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: '#737472', letterSpacing: '-0.1px', lineHeight: '20px' }}>{DRW_COPY.calcNeeded}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-student-body)', fontSize: 12, fontWeight: 500, color: '#737472', lineHeight: '16px', whiteSpace: 'nowrap' }}>{DRW_COPY.calcContext}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
