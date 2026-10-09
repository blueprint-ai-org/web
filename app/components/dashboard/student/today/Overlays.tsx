import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { EMOTIONS, type EmotionKey } from '~/lib/student/emotions'
import { studentStorage } from '~/lib/student/storage'

import { BackArrow } from '../mood-checkin/MoodChrome'
import { useStudentNavBase } from '../nav/useStudentNavBase'

import { REASON_EMOJI, WINS_DEFAULT_QUESTION, moodChipsFor } from './today-data'

/**
 * In-page done-card overlays (`today.html:610-630`, `openMoodOverlay` :779-821,
 * `openWinsOverlay` :827-840). Full-bleed dark panels that recap the stored
 * answer with an edit deep-link back into the flow. Opened by the hub when a
 * done mood/wins card is clicked; the back chevron closes.
 */

const PANEL_BG = '#1f1f25'

function OverlayShell({
  onClose,
  icon,
  title,
  children,
}: {
  onClose: () => void
  icon: string
  title: string
  children: ReactNode
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: PANEL_BG,
        zIndex: 50,
        opacity: shown ? 1 : 0,
        transition: 'opacity 220ms ease',
      }}
    >
      <button
        type="button"
        className="th-ov-back"
        aria-label="Back"
        onClick={onClose}
        style={{
          position: 'absolute',
          left: 24,
          top: 48,
          width: 48,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.12)',
          border: 'none',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          zIndex: 5,
        }}
      >
        <BackArrow />
      </button>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 132,
          transform: 'translateX(-50%)',
          width: 640,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src={studentAsset(icon)} alt="" style={{ width: 64, height: 64, display: 'block' }} />
          <h2
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 48,
              lineHeight: '106%',
              color: '#f2f3e5',
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  )
}

const editBtnStyle: React.CSSProperties = {
  height: 48,
  padding: '0 24px',
  background: '#f2f3e5',
  color: '#1f1f25',
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
}

const chipStyle: React.CSSProperties = {
  height: 36,
  padding: '0 16px',
  border: '1px solid #444450',
  borderRadius: 99,
  background: '#2f2f37',
  color: '#f2f3e5',
  fontFamily: 'var(--font-student-body)',
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

export function MoodOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [{ emotions, reasons }] = useState(() => ({
    emotions: studentStorage.getMoodEmotions() as EmotionKey[],
    reasons: studentStorage.getMoodReasons(),
  }))
  const chips = moodChipsFor(emotions)

  return (
    <OverlayShell onClose={onClose} icon="section-icon-mood.svg" title="Mood check-in">
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {emotions.map((k) => {
          const em = EMOTIONS[k]
          if (!em) return null
          return (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 96 }}>
              <img src={studentAsset(`emotion-${k}.svg`)} alt="" style={{ width: 72, height: 72, display: 'block' }} />
              <span
                style={{
                  fontFamily: 'var(--font-student-display)',
                  fontSize: 16,
                  textTransform: 'uppercase',
                  color: '#f2f3e5',
                  lineHeight: 1.05,
                }}
              >
                {em.name}
              </span>
            </div>
          )
        })}
      </div>

      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <span key={c} style={chipStyle}>
              {c}
            </span>
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 420 }}>
          {reasons.map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#2f2f37',
                border: '1px solid rgba(92,92,101,0.3)',
                borderRadius: 8,
                padding: '10px 16px',
              }}
            >
              <span style={{ fontSize: 18 }}>{REASON_EMOJI[label] ?? '•'}</span>
              <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 600, color: '#f2f3e5' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="th-ov-edit"
        style={editBtnStyle}
        onClick={() => navigate(`${base}/mood-checkin?edit=1`)}
      >
        Edit mood check-in
      </button>
    </OverlayShell>
  )
}

export function WinsOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [{ note, question }] = useState(() => ({
    note: studentStorage.getWinsNote(),
    question: studentStorage.getWinsQuestion() || WINS_DEFAULT_QUESTION,
  }))

  return (
    <OverlayShell onClose={onClose} icon="section-icon-wins.svg" title="Notice your wins">
      <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#a4a59f', margin: 0, maxWidth: 520 }}>
        {question}
      </p>
      {note && (
        <div
          style={{
            background: '#2f2f37',
            border: '1px solid rgba(92,92,101,0.3)',
            borderRadius: 12,
            padding: 20,
            width: 520,
            fontFamily: 'var(--font-student-body)',
            fontSize: 16,
            color: '#f2f3e5',
            textAlign: 'left',
            lineHeight: 1.4,
          }}
        >
          {note}
        </div>
      )}
      <button type="button" className="th-ov-edit" style={editBtnStyle} onClick={() => navigate(`${base}/notice-wins`)}>
        Edit
      </button>
    </OverlayShell>
  )
}
