import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'

import { StudentStage } from '../stage/StudentStage'

import { SUPPORT_COPY } from './support-data'
import { SUPPORT_CSS } from './support-styles'

/**
 * `/student/support/write` — the standalone "write it out" support page (ports
 * `support-write.html`).
 *
 * Full-bleed page (orange `#f08b31` stage, no sidebar). A 2-screen flow: a write
 * screen (spark pill, prompt bubble, textarea, disabled-until-typed Save) that
 * crossfades into a "Message Sent!" done screen. `save()` reproduces the
 * prototype's imperative sequence 1:1 — slide the shared dark circle down, fade
 * the write screen out (opacity 320ms), then fade the done screen in +340ms —
 * via state-driven inline `opacity`/`top` transitions (no rAF/`classList`).
 *
 * The page persists nothing (the prototype touches no `bp_*`/`localStorage`);
 * the route's stub `action` is the future write seam. BOTH exits — the write
 * screen's back button and the done screen's Done button — `navigate(-1)`, the
 * prototype's `history.back()`. Mounted at both `/student/support/write` and
 * `/preview/student/support/write`; client-only render.
 */

/** The message-bubble monster avatar (`support-write.html:186-193`). */
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

/** Avatar + text message bubble (`.msg-bubble`, `support-write.html:80-101`). */
function MessageBubble({ bg, text }: { bg: string; text: string }) {
  return (
    <div style={{ background: bg, padding: 10, display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', boxSizing: 'border-box' }}>
      <MonsterAvatar />
      <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#2f2f37', lineHeight: 1.1, letterSpacing: '-0.4px', margin: 0, flex: 1 }}>
        {text}
      </p>
    </div>
  )
}

export function SupportWrite() {
  const navigate = useNavigate()

  const [text, setText] = useState('')
  const [circleDown, setCircleDown] = useState(false)
  const [writeActive, setWriteActive] = useState(true)
  const [doneActive, setDoneActive] = useState(false)

  const timeoutRef = useRef<number | null>(null)
  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  /** Back on either screen returns to wherever the user came from (`history.back()`). */
  function exit() {
    navigate(-1)
  }

  /** Slide the circle, fade write out, fade done in +340ms (`support-write.html:250-261`). */
  function save() {
    if (!text.trim()) return
    setCircleDown(true)
    setWriteActive(false)
    timeoutRef.current = window.setTimeout(() => setDoneActive(true), 340)
  }

  return (
    <StudentStage style={{ backgroundColor: '#f08b31' }} data-testid="support-write">
      <style>{SUPPORT_CSS}</style>

      {/* Shared animated dark circle (support-write.html:35-43) */}
      <div style={{ position: 'absolute', width: 1910, height: 1910, borderRadius: '50%', background: '#1f1f25', left: -358, top: circleDown ? 150 : 69, pointerEvents: 'none', zIndex: 0, transition: 'top 700ms cubic-bezier(0.81, 0, 0.26, 0.98)' }} />

      {/* ── SCREEN 1: Write ── */}
      <div style={{ position: 'absolute', inset: 0, opacity: writeActive ? 1 : 0, pointerEvents: writeActive ? 'all' : 'none', transition: 'opacity 320ms ease' }}>
        <button type="button" className="sw-back" aria-label="Back" onClick={exit} style={{ position: 'absolute', top: 36, left: 24, zIndex: 10, width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.16)', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
            <path d="M12 5L7 10L12 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Header: spark pill + title (support-write.html:57-73) */}
        <div style={{ position: 'absolute', top: 115, left: '50%', transform: 'translateX(-50%)', zIndex: 5, width: 351, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2f2f37', borderRadius: 99, padding: '8px 12px', fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 20, color: '#f2f3e5', lineHeight: 1.05 }}>
            {SUPPORT_COPY.sparkPill} <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, letterSpacing: '-0.8px', color: '#f2f3e5', margin: 0, lineHeight: '40px', textAlign: 'center' }}>
            {SUPPORT_COPY.title}
          </h1>
        </div>

        {/* Body: prompt bubble + textarea (support-write.html:75-201) */}
        <div style={{ position: 'absolute', top: 257, left: '50%', transform: 'translateX(-50%)', zIndex: 5, width: 439, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <MessageBubble bg="#f08b31" text={SUPPORT_COPY.writeBubble} />
          <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, position: 'relative' }}>
            <textarea
              className="sw-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={SUPPORT_COPY.placeholder}
              style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 600, color: '#f2f3e5', padding: '10px 16px', background: 'transparent', minHeight: 200 }}
            />
          </div>
        </div>

        {/* Save (support-write.html:117-129, 203-205) */}
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <button type="button" className="sw-save" onClick={save} disabled={text.trim().length === 0} style={{ width: 270, height: 48, borderRadius: 8, background: '#f2f3e5', color: '#1f1f25', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {SUPPORT_COPY.save}
          </button>
        </div>
      </div>

      {/* ── SCREEN 2: Success ── */}
      <div style={{ position: 'absolute', inset: 0, opacity: doneActive ? 1 : 0, pointerEvents: doneActive ? 'all' : 'none', transition: 'opacity 320ms ease' }}>
        <h1 style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 301, zIndex: 5, width: 613, fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 80, lineHeight: 1.06, letterSpacing: '1.5px', color: '#f2f3e5', textAlign: 'center', margin: 0 }}>
          {SUPPORT_COPY.doneTitle.map((line, i) => (
            <Fragment key={line}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </h1>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 511, zIndex: 5, width: 395 }}>
          <MessageBubble bg="#58b880" text={SUPPORT_COPY.doneBubble} />
        </div>

        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
          <button type="button" className="sw-primary" onClick={exit} style={{ width: 270, height: 48, borderRadius: 8, background: '#f2f3e5', color: '#1f1f25', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            {SUPPORT_COPY.done}
          </button>
        </div>
      </div>
    </StudentStage>
  )
}
