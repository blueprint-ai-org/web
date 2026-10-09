import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

/**
 * `/student/helpful-content` — the post-check-in supportive interstitial (ports
 * `helpful-content.html`). Three screens cross-fading via opacity:
 *  - **s-intro** ("Lots of students feel this way sometimes") → Maybe later
 *    (exit) / Yes, show me → video;
 *  - **s-video** (a prototype video placeholder) → play → feedback;
 *  - **s-feedback** ("Did this help?") → both buttons exit.
 *
 * `bp_video_watched` is set when the video is played (`helpful-content.html:264`).
 * Every exit runs the shared enter-anim protocol back to the Today hub
 * (`goToday`, `helpful-content.html:258-261`): set `bp_enter_anim` +
 * `navigate(base, { state: { enterAnim: true } })`.
 *
 * Full-bleed page (no sidebar). SSR-safe (renders in place until the stage
 * mounts). Mounted at both `/student/helpful-content` and the preview mirror.
 */

type Screen = 's-intro' | 's-video' | 's-feedback'

const HC_CSS = `
.hc-screen { opacity: 0; pointer-events: none; transition: opacity 260ms cubic-bezier(0.4,0,0.2,1); }
.hc-screen.active { opacity: 1; pointer-events: all; }
.hc-btn-back { transition: opacity 120ms; cursor: pointer; }
.hc-btn-back:active { opacity: 0.75; }
.hc-btn-secondary, .hc-btn-primary { transition: opacity 120ms; cursor: pointer; }
.hc-btn-secondary:active, .hc-btn-primary:active { opacity: 0.75; }
.hc-vid-play { transition: opacity 120ms; cursor: pointer; }
.hc-vid-play:active { opacity: 0.7; }

/* Spark-badge crossfade (helpful-content.html:136-143) */
.hc-spark-badge { position: relative; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; }
.hc-spark-badge img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.hc-spark-badge img:nth-child(1) { animation: hc-sc1 6400ms linear 1600ms infinite; }
.hc-spark-badge img:nth-child(2) { opacity: 0; animation: hc-sc2 6400ms linear 1600ms infinite; }
.hc-spark-badge img:nth-child(3) { opacity: 0; animation: hc-sc3 6400ms linear 1600ms infinite; }
.hc-spark-badge img:nth-child(4) { opacity: 0; animation: hc-sc4 6400ms linear 1600ms infinite; }
@keyframes hc-sc1 { 0%{opacity:1} 25%{opacity:0} 75%{opacity:0} 100%{opacity:1} }
@keyframes hc-sc2 { 0%{opacity:0} 25%{opacity:1} 50%{opacity:0} 100%{opacity:0} }
@keyframes hc-sc3 { 0%{opacity:0} 50%{opacity:1} 75%{opacity:0} 100%{opacity:0} }
@keyframes hc-sc4 { 0%{opacity:0} 75%{opacity:1} 100%{opacity:0} }
`

const SCREEN_BASE: CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden' }

const BTN_SECONDARY: CSSProperties = {
  width: 260,
  height: 48,
  background: 'rgba(31,31,37,0.5)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 8,
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#f2f3e5',
}
const BTN_PRIMARY: CSSProperties = {
  width: 260,
  height: 48,
  background: '#f2f3e5',
  border: 'none',
  borderRadius: 8,
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#1f1f25',
}

function BackButton({ onClick, background }: { onClick: () => void; background: string }) {
  return (
    <button
      type="button"
      className="hc-btn-back"
      aria-label="Back to today"
      onClick={onClick}
      style={{ position: 'absolute', left: 24, top: 48, width: 48, height: 48, background, border: 'none', borderRadius: 8, display: 'grid', placeItems: 'center', zIndex: 20 }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13 4L7 10L13 16" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export function HelpfulContent() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [screen, setScreen] = useState<Screen>('s-intro')

  const goToday = () => {
    studentStorage.setEnterAnim(true)
    navigate(base, { state: { enterAnim: true } })
  }
  const playVideo = () => {
    studentStorage.setVideoWatched(true)
    setScreen('s-feedback')
  }

  const cls = (id: Screen) => `hc-screen${screen === id ? ' active' : ''}`

  return (
    <StudentStage style={{ backgroundColor: '#49aee1' }} data-testid="helpful-content">
      <style>{HC_CSS}</style>

      {/* ── S-INTRO ── */}
      <div className={cls('s-intro')} style={{ ...SCREEN_BASE, background: '#49aee1' }}>
        <img src={studentAsset('pillow.svg')} alt="" style={{ position: 'absolute', left: '50%', top: '50%', width: 2500, height: 2500, pointerEvents: 'none', zIndex: 0, transform: 'translate(-50%, -50%)' }} />
        <BackButton onClick={goToday} background="rgba(255,255,255,0.16)" />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 760, textAlign: 'center', zIndex: 5, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 80, lineHeight: 1.06, letterSpacing: '1px', color: '#f2f3e5', margin: 0 }}>
            Lots of students feel this way sometimes
          </h2>
          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 15, fontWeight: 500, color: 'rgba(242,243,229,0.8)', margin: 0 }}>Want to see what helps them?</p>
        </div>
        <div style={{ position: 'absolute', bottom: 65, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 16, zIndex: 5 }}>
          <button type="button" className="hc-btn-secondary" onClick={goToday} style={BTN_SECONDARY}>
            Maybe later
          </button>
          <button type="button" className="hc-btn-primary" onClick={() => setScreen('s-video')} style={BTN_PRIMARY}>
            Yes, show me
          </button>
        </div>
      </div>

      {/* ── S-VIDEO ── */}
      <div className={cls('s-video')} style={{ ...SCREEN_BASE, background: '#000' }}>
        <BackButton onClick={() => setScreen('s-intro')} background="rgba(255,255,255,0.1)" />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 994, height: 485, borderRadius: 20, overflow: 'hidden' }}>
          <img src={studentAsset('video-thumbnail.jpg')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <img src={studentAsset('heart-default.svg')} alt="save" style={{ width: 48, height: 48, display: 'block', cursor: 'pointer' }} />
          </div>
          <button type="button" className="hc-vid-play" aria-label="Play" onClick={playVideo} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'none', border: 'none', padding: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="36" fill="rgba(0,0,0,0.45)" />
              <polygon points="30,22 54,36 30,50" fill="#f2f3e5" />
            </svg>
          </button>
          <p style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-student-body)', fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, pointerEvents: 'none' }}>
            Tap to play (prototype)
          </p>
        </div>
      </div>

      {/* ── S-FEEDBACK ── */}
      <div className={cls('s-feedback')} style={{ ...SCREEN_BASE, background: '#49aee1' }}>
        <div style={{ position: 'absolute', left: -357, top: 79, width: 1910, height: 1910, borderRadius: '50%', background: '#1f1f25', pointerEvents: 'none', zIndex: 0 }} />
        <BackButton onClick={() => setScreen('s-video')} background="rgba(255,255,255,0.12)" />

        <div style={{ position: 'absolute', top: 274, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, alignItems: 'center', zIndex: 5 }}>
          <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, lineHeight: '40px', letterSpacing: '-0.8px', color: '#f2f3e5' }}>+1</span>
          <div className="hc-spark-badge">
            <img src={studentAsset('spark-4.svg')} alt="" />
            <img src={studentAsset('spark-01.svg')} alt="" />
            <img src={studentAsset('spark-02.svg')} alt="" />
            <img src={studentAsset('spark-03.svg')} alt="" />
          </div>
        </div>

        <h2 style={{ position: 'absolute', top: 326, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 80, lineHeight: 1.06, color: '#f2f3e5', textAlign: 'center', width: 600, margin: 0, zIndex: 5 }}>
          Did this help?
        </h2>

        <div style={{ position: 'absolute', top: 435, left: '50%', transform: 'translateX(-50%)', width: 439, padding: 10, background: '#b38aff', display: 'flex', alignItems: 'flex-start', gap: 12, zIndex: 5, boxSizing: 'border-box' }}>
          <div style={{ width: 48, height: 48, flexShrink: 0, background: '#f2f3e5', display: 'grid', placeItems: 'center' }}>
            <img src={studentAsset('monster-01.svg')} alt="" style={{ width: 40, height: 40, display: 'block', objectFit: 'cover' }} />
          </div>
          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#2f2f37', lineHeight: 1.1, letterSpacing: '-0.4px', flex: 1, paddingTop: 4, margin: 0 }}>
            You made it through a tough moment—and that counts.
          </p>
        </div>

        <div style={{ position: 'absolute', bottom: 65, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 16, zIndex: 20 }}>
          <button type="button" className="hc-btn-secondary" onClick={goToday} style={BTN_SECONDARY}>
            Not really
          </button>
          <button type="button" className="hc-btn-primary" onClick={goToday} style={BTN_PRIMARY}>
            Yes, a bit!
          </button>
        </div>
      </div>
    </StudentStage>
  )
}
