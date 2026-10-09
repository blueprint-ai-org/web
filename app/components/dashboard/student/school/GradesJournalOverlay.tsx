import { useState } from 'react'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { GJ_COPY } from './grades-data'

/**
 * The grades-journal overlay (ports `grades.html`'s `#gjOverlay`, `:976-1038`).
 *
 * A full-stage purple takeover: a write screen (spark pill, prompt bubble,
 * textarea) that saves to `bp_grades_note` and crossfades into a "Note saved!"
 * done screen with the +1 reward. The done-screen entry (reward/title, then
 * bubble/buttons +300ms) is one-shot CSS (`grades-styles.ts`, `gr-gj-*`), so no
 * rAF/`classList` is needed. Rendered only while open (parent-controlled).
 */

function MonsterAvatar() {
  return (
    <div style={{ width: 48, height: 48, background: '#f2f3e5', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        <img src={studentAsset('monster-butterfly.svg')} alt="" style={{ position: 'absolute', width: 36, height: 36, top: 2, left: 2 }} />
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1 }}>
          <img src={studentAsset('monster-eye.svg')} alt="" style={{ width: 5.78, height: 7.58, display: 'block' }} />
          <img src={studentAsset('monster-eye.svg')} alt="" style={{ width: 5.78, height: 7.58, display: 'block' }} />
        </div>
      </div>
    </div>
  )
}

const BUBBLE_TEXT_STYLE = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 20,
  fontWeight: 500,
  color: '#2f2f37',
  lineHeight: 1.1,
  letterSpacing: '-0.4px',
} as const

export function GradesJournalOverlay({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)

  function save() {
    const val = text.trim()
    if (!val) return
    studentStorage.setGradesNote(val)
    setDone(true)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#b38aff', borderRadius: 20, overflow: 'hidden' }}>
      {/* Dark circle backdrop */}
      <div style={{ position: 'absolute', width: 1910, height: 1910, borderRadius: '50%', background: '#1f1f25', left: -358, top: 80, pointerEvents: 'none', zIndex: 0 }} />

      <button type="button" className="gr-gj-back" aria-label="Back" onClick={onClose} style={{ position: 'absolute', top: 36, left: 24, zIndex: 10, width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.16)', border: 'none', display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
          <path d="M12 5L7 10L12 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!done ? (
        <>
          {/* Write screen */}
          <div style={{ position: 'absolute', top: 115, left: '50%', transform: 'translateX(-50%)', zIndex: 5, width: 440, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2f2f37', borderRadius: 99, padding: '8px 12px', fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 20, color: '#f2f3e5', marginBottom: 10 }}>
              {GJ_COPY.sparkPill} <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, color: '#f2f3e5', margin: '0 0 48px', lineHeight: '40px', textAlign: 'center', letterSpacing: '-0.8px' }}>
              {GJ_COPY.title}
            </h1>
            <div style={{ background: '#b38aff', padding: 10, display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', boxSizing: 'border-box', marginBottom: 24 }}>
              <MonsterAvatar />
              <p style={BUBBLE_TEXT_STYLE}>{GJ_COPY.bubbleText}</p>
            </div>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8 }}>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={GJ_COPY.placeholder}
                style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 600, color: '#f2f3e5', padding: '10px 16px', background: 'transparent', minHeight: 200 }}
              />
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <button type="button" className="gr-gj-save" onClick={save} disabled={text.trim().length === 0} style={{ width: 270, height: 48, borderRadius: 8, background: '#f2f3e5', color: '#1f1f25', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {GJ_COPY.save}
            </button>
          </div>
        </>
      ) : (
        /* Done screen */
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 253, boxSizing: 'border-box', gap: 24 }}>
          <div className="gr-gj-done-reward" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, color: '#f2f3e5', lineHeight: '40px', letterSpacing: '-0.8px' }}>{GJ_COPY.donePlus}</span>
            <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 32, height: 32, display: 'block' }} />
          </div>
          <p className="gr-gj-done-title" style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 80, lineHeight: 1.06, color: '#f2f3e5', letterSpacing: '1.5px', margin: 0, textAlign: 'center' }}>
            {GJ_COPY.doneTitle}
          </p>
          <div className="gr-gj-done-bubble" style={{ background: '#58b880', padding: 10, display: 'flex', alignItems: 'flex-start', gap: 12, width: 439, boxSizing: 'border-box' }}>
            <MonsterAvatar />
            <p style={BUBBLE_TEXT_STYLE}>{GJ_COPY.doneBubbleText}</p>
          </div>
          <div className="gr-gj-btn-row" style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 24 }}>
            <button type="button" onClick={onClose} style={{ width: 270, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.16)', color: '#ededed', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              {GJ_COPY.btnNotReally}
            </button>
            <button type="button" onClick={onClose} style={{ width: 270, height: 48, borderRadius: 8, background: '#f2f3e5', color: '#1f1f25', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              {GJ_COPY.btnYesABit}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
