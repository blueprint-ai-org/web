import { useNavigate } from 'react-router'
import type { CSSProperties } from 'react'

import { StudentStage } from '../stage/StudentStage'

/**
 * `/student/journal/past-notes` — the static notes archive (ports
 * `journal-past-notes.html`). A scrolling two-section list ("This month" /
 * "Older notes") beside two stat cards. Fully static demo copy (the prototype
 * hard-codes these entries; no storage read). Full-bleed (no sidebar); back is a
 * plain `history.back()`. Client-only (see the route's `HydrateFallback`).
 * Mounted at both `/student/journal/past-notes` and the preview mirror.
 */

interface ArchiveNote {
  date: string
  text?: string
  question?: string
  answer?: string
}

const THIS_MONTH: readonly ArchiveNote[] = [
  { date: 'April 27, 2026', text: 'Today was really overwhelming with the math test and the thing with Jamie.' },
  { date: 'April 26, 2026', text: 'I feel excited!' },
  { date: 'April 20, 2026', question: 'What was the best thing that happened yesterday?', answer: 'Dancing!' },
  { date: 'April 15, 2026', text: 'Had a great conversation with Sarah; it really helped clear my mind after the stressful week.' },
]

const OLDER_NOTES: readonly ArchiveNote[] = [
  { date: 'March 30, 2026', text: "I don't know." },
  { date: 'March 20, 2026', text: 'What a day.' },
  { date: 'March 19, 2026', text: '......' },
  { date: 'March 10, 2026', question: 'What was the best thing that happened yesterday?', answer: 'Dancing!' },
  { date: 'February 15, 2026', text: 'Had a great conversation with Sarah; it really helped clear my mind after the stressful week.' },
]

const PAST_NOTES_CSS = `
.jpn-col-left { scrollbar-width: none; }
.jpn-col-left::-webkit-scrollbar { display: none; }
.jpn-back { transition: background 120ms; }
.jpn-back:hover { background: rgba(255,255,255,0.24); }
`

const SECTION_LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: 'rgba(242,243,229,0.4)',
  letterSpacing: '-0.1px',
}

function NoteCard({ note }: { note: ArchiveNote }) {
  return (
    <div
      style={{
        width: 658,
        borderRadius: 12,
        background: '#1f1f25',
        border: '1px solid #36363f',
        padding: 12,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#737472', letterSpacing: '-0.1px' }}>
        {note.date}
      </span>
      {note.text ? (
        <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#f2f3e5', lineHeight: '24px', letterSpacing: '-0.2px', margin: 0 }}>
          {note.text}
        </p>
      ) : (
        <>
          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#a4a59f', letterSpacing: '-0.1px', margin: 0 }}>
            {note.question}
          </p>
          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#f2f3e5', lineHeight: 1.1, letterSpacing: '-0.4px', margin: 0 }}>
            {note.answer}
          </p>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, background }: { label: string; value: string; background: string }) {
  return (
    <div
      style={{
        width: 220,
        height: 220,
        borderRadius: 20,
        background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#f2f3e5', letterSpacing: '-0.1px', lineHeight: '20px' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 64, lineHeight: 1.06, color: '#f2f3e5', width: 148, textAlign: 'center' }}>
        {value}
      </span>
    </div>
  )
}

export function PastNotes() {
  const navigate = useNavigate()

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="journal-past-notes">
      <style>{PAST_NOTES_CSS}</style>

      <button
        type="button"
        className="jpn-back"
        aria-label="Back"
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          left: 24,
          top: 48,
          zIndex: 20,
          width: 48,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.16)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15.8334L6.66667 10L12.5 4.16669" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <h1
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 52,
          margin: 0,
          fontFamily: 'var(--font-student-display)',
          fontWeight: 400,
          fontSize: 80,
          lineHeight: 1.06,
          color: '#f2f3e5',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        Past notes
      </h1>

      <div style={{ position: 'absolute', left: 111, right: 0, top: 186, bottom: 0, display: 'flex', gap: 32, alignItems: 'flex-start', overflow: 'hidden' }}>
        {/* Left column — scrollable note list */}
        <div
          className="jpn-col-left"
          style={{
            width: 658,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            overflowY: 'auto',
            height: '100%',
            paddingBottom: 32,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={SECTION_LABEL_STYLE}>This month</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {THIS_MONTH.map((n) => (
                <NoteCard key={n.date} note={n} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={SECTION_LABEL_STYLE}>Older notes</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {OLDER_NOTES.map((n) => (
                <NoteCard key={n.date} note={n} />
              ))}
            </div>
          </div>
        </div>

        {/* Right column — stat cards */}
        <div style={{ width: 282, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', paddingLeft: 31, boxSizing: 'border-box' }}>
          <span style={{ ...SECTION_LABEL_STYLE, textAlign: 'center', width: '100%' }}>Way to go!</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatCard label="This month" value="5" background="#3f50b8" />
            <StatCard label="Total notes" value="35" background="#7040c8" />
          </div>
        </div>
      </div>
    </StudentStage>
  )
}
