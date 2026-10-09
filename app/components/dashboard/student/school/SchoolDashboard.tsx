import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { Sidebar } from '../chrome/Sidebar'
import { SupportPanel } from '../chrome/SupportPanel'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { ATTENDANCE, GRADES_COPY, GRADES_VIDEO, SUBJECTS } from './grades-data'
import { GRADES_CSS } from './grades-styles'
import { GradesJournalOverlay } from './GradesJournalOverlay'
import { SubjectDrawer } from './SubjectDrawer'

/**
 * `/student/school` — the grades / attendance dashboard (ports `grades.html`).
 *
 * Two tabs (`?tab=attend`): **Grades** (a six-subject list opening the
 * {@link SubjectDrawer}) and **Attendance** (a stat card + clip-path
 * chart-reveal). Each tab's right column carries a calming-breath video promo
 * (heart-save via the shared `bp_saved` adapter; tap → `/student/toolkit/video`
 * with the tab-specific `?from`) and a "Remember" card (Journal → the
 * {@link GradesJournalOverlay}, Get support → the shared `SupportPanel`). The
 * grades "Remember" text plays the circle-rise cinematic into
 * `/student/support/write`.
 *
 * Mostly declarative React state (tabs, drawer, hearts); the only imperative bit
 * is the `goToSupportWrite` circle cinematic, driven over refs (no state change,
 * so no clobber). Sidebar-bearing stage page; mounted at both `/student/school`
 * and `/preview/student/school`. Client-only render (see the route's
 * `HydrateFallback`).
 */

const CIRCLE_BEZ = 'cubic-bezier(0.81, 0, 0.26, 0.98)'

const REMEMBER_LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 12,
  fontWeight: 500,
  color: '#737472',
}

export function SchoolDashboard() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState<'grades' | 'attend'>(() => (searchParams.get('tab') === 'attend' ? 'attend' : 'grades'))
  const [drawerSubject, setDrawerSubject] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [gjOpen, setGjOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [saved, setSaved] = useState<string[]>(() => studentStorage.getSaved(['v1']))

  const orangeRef = useRef<HTMLDivElement | null>(null)
  const circleRef = useRef<HTMLDivElement | null>(null)

  function openSubject(key: string) {
    setDrawerSubject(key)
    setDrawerOpen(true)
  }

  function toggleHeart(vid: string) {
    setSaved((prev) => {
      const next = prev.includes(vid) ? prev.filter((id) => id !== vid) : [...prev, vid]
      studentStorage.setSaved(next)
      return next
    })
  }

  // Circle-rise cinematic → support-write (grades.html:1341-1363). Imperative:
  // no state change, so nothing re-renders to clobber the refs.
  function goToSupportWrite() {
    const orange = orangeRef.current
    const circle = circleRef.current
    if (orange) orange.style.display = 'block'
    if (circle) {
      circle.style.display = 'block'
      circle.style.transition = 'none'
      circle.style.transform = 'translateY(0)'
      circle.getBoundingClientRect() // force reflow before the slide
      circle.style.transition = `transform 800ms ${CIRCLE_BEZ}`
      circle.style.transform = 'translateY(607px)'
    }
    window.setTimeout(() => navigate(`${base}/support/write`), 800)
  }

  const isGrades = tab === 'grades'

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="school">
      <style>{GRADES_CSS}</style>

      {/* Main content (dims behind the subject drawer) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: drawerOpen ? 0.3 : 1,
          pointerEvents: drawerOpen ? 'none' : 'auto',
          transition: 'opacity 500ms ease',
        }}
      >
        <Sidebar />

        {/* Right dark background */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 545, background: '#2b2b32' }} />

        {/* Left column */}
        <div style={{ position: 'absolute', left: 152, top: 72, width: 449, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 64, lineHeight: 1.06, color: '#f2f3e5', margin: '0 0 16px' }}>{GRADES_COPY.title}</h1>
          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, letterSpacing: '-0.1px', lineHeight: '20px', color: '#737472', margin: '0 0 36px' }}>{GRADES_COPY.desc}</p>

          {/* Tab pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <TabPill label={GRADES_COPY.tabGrades} active={isGrades} onClick={() => setTab('grades')} />
            <TabPill label={GRADES_COPY.tabAttendance} active={!isGrades} onClick={() => setTab('attend')} />
          </div>

          {/* Grades panel */}
          {isGrades ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUBJECTS.map((s) => (
                <div
                  key={s.key}
                  className="gr-subject-card"
                  onClick={() => openSubject(s.key)}
                  style={{ width: 449, height: 82, borderRadius: 12, background: '#1f1f25', border: '1px solid #36363f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, boxSizing: 'border-box' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#f2f3e5', lineHeight: 1.1, letterSpacing: '-0.4px' }}>{s.name}</span>
                    <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: '#737472', letterSpacing: '-0.1px' }}>{s.teacher}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#f2f3e5', lineHeight: 1.1, letterSpacing: '-0.4px' }}>{s.grade}</span>
                    <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: '#737472', letterSpacing: '-0.1px' }}>{s.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Attendance panel */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: 449, borderRadius: 16, background: '#1f1f25', border: '1px solid #444450', padding: 24, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 12, fontWeight: 500, color: '#737472' }}>{ATTENDANCE.statLabel}</span>
                  <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, lineHeight: 1.25, letterSpacing: '-0.8px', color: '#f2f3e5' }}>{ATTENDANCE.statNumber}</span>
                </div>
                <div style={{ background: '#36363f', border: '1px solid #36363f', borderRadius: 8, padding: 8, fontFamily: 'var(--font-student-body)', fontSize: 12, fontWeight: 500, color: '#f2f3e5', whiteSpace: 'nowrap' }}>{ATTENDANCE.badge}</div>
              </div>
              <div style={{ width: 449, height: 282, borderRadius: 16, background: '#1f1f25', border: '1px solid #444450', position: 'relative', overflow: 'hidden', marginTop: 16 }}>
                <img className="gr-chart-line" src={studentAsset('chart-attendance.svg')} alt="" style={{ position: 'absolute', top: 38, left: 36, width: 374, height: 163 }} />
                <div style={{ position: 'absolute', bottom: 16, left: 37, right: 39, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-student-body)', fontSize: 10, fontWeight: 500, color: '#737472', letterSpacing: '0.1px' }}>
                  {ATTENDANCE.months.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — Grades */}
        {isGrades ? (
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 697, width: 449, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <VideoCard
              bg="#addbf2"
              vid="grades-v1"
              saved={saved.includes('grades-v1')}
              onHeart={() => toggleHeart('grades-v1')}
              onOpen={() => navigate(`${base}/toolkit/video?video=calming-breath&from=${GRADES_VIDEO.grades.from}`)}
              duration={GRADES_VIDEO.grades.duration}
              spark={GRADES_VIDEO.grades.spark}
              title={GRADES_VIDEO.grades.title}
              decorations={
                <>
                  <img src={studentAsset('cloud-grades-1.svg')} alt="" style={{ position: 'absolute', left: 37, top: 96, width: 561, transform: 'rotate(15deg)', pointerEvents: 'none' }} />
                  <img src={studentAsset('cloud-grades-2.svg')} alt="" style={{ position: 'absolute', left: -303, top: 237, width: 687, pointerEvents: 'none' }} />
                </>
              }
            />
            <RememberCard onJournal={() => setGjOpen(true)} onSupport={() => setSupportOpen(true)} onTextClick={goToSupportWrite} />
          </div>
        ) : (
          /* Right column — Attendance */
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 697, width: 449, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <VideoCard
              bg="#d6c0fe"
              vid="grades-v2"
              saved={saved.includes('grades-v2')}
              onHeart={() => toggleHeart('grades-v2')}
              onOpen={() => navigate(`${base}/toolkit/video?video=calming-breath&from=${GRADES_VIDEO.attend.from}`)}
              duration={GRADES_VIDEO.attend.duration}
              spark={GRADES_VIDEO.attend.spark}
              title={GRADES_VIDEO.attend.title}
              decorations={
                <>
                  <img src={studentAsset('mithosis.svg')} alt="" style={{ position: 'absolute', left: -136, top: 121, width: 408, transform: 'rotate(-30deg)', pointerEvents: 'none', opacity: 0.7 }} />
                  <img src={studentAsset('mithosis.svg')} alt="" style={{ position: 'absolute', left: 132, top: -123, width: 408, transform: 'rotate(-30deg)', pointerEvents: 'none', opacity: 0.7 }} />
                </>
              }
            />
            <RememberCard onJournal={() => setGjOpen(true)} onSupport={() => setSupportOpen(true)} textLineHeight={1.2} />
          </div>
        )}
      </div>

      {/* Subject drawer (over a dimmed main-content) */}
      <SubjectDrawer subjectKey={drawerSubject} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Grades journal overlay */}
      {gjOpen ? <GradesJournalOverlay onClose={() => setGjOpen(false)} /> : null}

      {/* Support panel (controlled — also opened by "Get support") */}
      <SupportPanel open={supportOpen} onOpenChange={setSupportOpen} />

      {/* Circle-rise cinematic layers (support-write hand-off) */}
      <div ref={orangeRef} style={{ position: 'absolute', inset: 0, background: '#f08b31', zIndex: 998, display: 'none', pointerEvents: 'none' }} />
      <div ref={circleRef} style={{ position: 'absolute', width: 1910, height: 1910, borderRadius: '50%', background: '#1f1f25', left: -358, top: -538, zIndex: 999, display: 'none', pointerEvents: 'none' }} />
    </StudentStage>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="gr-tab-pill"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        padding: '0 20px',
        borderRadius: 12,
        fontFamily: 'var(--font-student-body)',
        fontSize: 16,
        fontWeight: 500,
        border: 'none',
        background: active ? '#f2f3e5' : '#2b2b35',
        color: active ? '#1f1f25' : 'rgba(242,243,229,0.5)',
      }}
    >
      {label}
    </button>
  )
}

interface VideoCardProps {
  bg: string
  vid: string
  saved: boolean
  onHeart: () => void
  onOpen: () => void
  duration: string
  spark: string
  title: readonly string[]
  decorations: ReactNode
}

function VideoCard({ bg, saved, onHeart, onOpen, duration, spark, title, decorations }: VideoCardProps) {
  return (
    <div onClick={onOpen} style={{ borderRadius: 20, position: 'relative', overflow: 'hidden', flexShrink: 0, width: '100%', height: 449, background: bg, cursor: 'pointer' }}>
      {decorations}
      <button
        type="button"
        className="gr-heart-btn"
        aria-label={saved ? 'Unsave' : 'Save'}
        onClick={(e) => {
          e.stopPropagation()
          onHeart()
        }}
        style={{ position: 'absolute', top: 12, right: 12, width: 48, height: 48, background: 'none', border: 'none', padding: 0, margin: 0, outline: 'none', display: 'block', zIndex: 2 }}
      >
        <img src={studentAsset(saved ? 'heart-saved.svg' : 'heart-default.svg')} alt="" style={{ width: 48, height: 48, display: 'block' }} />
      </button>
      <div className="gr-video-play" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 44, height: 44, borderRadius: 12, background: '#f2f3e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M7 4L16 10L7 16V4Z" fill="#1f1f25" />
        </svg>
      </div>
      <div style={{ position: 'absolute', bottom: 12, right: 12, width: 260, borderRadius: 12, background: '#36363f', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#f2f3e5', letterSpacing: '-0.2px' }}>{duration}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#f2f3e5', letterSpacing: '-0.2px' }}>
            {spark} <img src={studentAsset('spark-4.svg')} alt="spark" style={{ width: 16, height: 16, display: 'block' }} />
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 24, lineHeight: 1.12, color: '#f2f3e5', letterSpacing: '-0.4px', margin: 0 }}>
          {title.map((line, i) => (
            <span key={i}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}

function RememberCard({
  onJournal,
  onSupport,
  onTextClick,
  textLineHeight,
}: {
  onJournal: () => void
  onSupport: () => void
  onTextClick?: () => void
  textLineHeight?: number
}) {
  return (
    <div style={{ borderRadius: 20, width: '100%', background: '#1f1f25', padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 36, flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={REMEMBER_LABEL_STYLE}>{GRADES_COPY.rememberLabel}</span>
        <p
          onClick={onTextClick}
          style={{
            fontFamily: 'var(--font-student-body)',
            fontSize: 20,
            fontWeight: 500,
            color: '#f2f3e5',
            lineHeight: textLineHeight ?? 1.1,
            letterSpacing: '-0.4px',
            margin: 0,
            cursor: onTextClick ? 'pointer' : 'default',
          }}
        >
          {GRADES_COPY.rememberText[0]}
          <br />
          {GRADES_COPY.rememberText[1]}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" className="gr-remember-btn" onClick={onJournal} style={{ flex: 1, height: 48, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#f5f5f5' }}>
          {GRADES_COPY.btnJournal}
        </button>
        <button type="button" className="gr-remember-btn" onClick={onSupport} style={{ flex: 1, height: 48, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#f5f5f5' }}>
          {GRADES_COPY.btnGetSupport}
        </button>
      </div>
    </div>
  )
}
