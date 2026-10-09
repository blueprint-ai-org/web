import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { VIDEO_CFG, VIDEO_DEFAULT_THUMB } from './toolkit-data'
import { VIDEO_CSS } from './toolkit-styles'

/**
 * `/student/toolkit/video` — the video player + feedback wizard (ports
 * `toolkit-video.html`). `?video=` selects a clip (`VIDEO_CFG`); `?from=`
 * chooses the exit destination.
 *
 * Screens: **s-video** (thumbnail + play) → the fullscreen `<video>` (rendered
 * OUTSIDE the scaled stage, `toolkit-video.html:262-283`, with a custom rAF
 * scrubber + pause-while-seek) → **did-try** → **helpful** → **why** →
 * **thanks**. `bp_video_watched` is set on play and on finish
 * (`toolkit-video.html:484,612`). The `?from` → exit matrix
 * (`toolkit-video.html:423-428`): `write` → today (with enter-anim), `grades` →
 * school, `grades-attend` → school?tab=attend, else → toolkit.
 *
 * Full-bleed page (no sidebar); client-only (see the route's `HydrateFallback`).
 * Mounted at both `/student/toolkit/video` and the preview mirror.
 */

type Screen = 's-video' | 's-did-try' | 's-helpful' | 's-why' | 's-thanks'
type Phase = 'initial' | 'entered' | 'phase2'

const SLIDE_DUR = 800
const SLIDE_BEZIER = 'cubic-bezier(0.75, 0, 0.3, 0.99)'
const FB_T = `transform ${SLIDE_DUR}ms ${SLIDE_BEZIER}, opacity 400ms ease`

const FB_CONTENT_BASE: CSSProperties = { position: 'absolute', inset: 0, zIndex: 2 }
const DOME_STYLE: CSSProperties = {
  position: 'absolute',
  width: 1910,
  height: 1910,
  left: -352,
  top: 150,
  borderRadius: '50%',
  background: '#1f1f25',
  pointerEvents: 'none',
}
const FB_TITLE_BASE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  width: 613,
  fontFamily: 'var(--font-student-display)',
  fontWeight: 400,
  fontSize: 80,
  lineHeight: 1.06,
  color: '#f2f3e5',
  textAlign: 'center',
  margin: 0,
}
const FB_BTN_BASE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  width: 270,
  height: 48,
  background: '#f2f3e5',
  color: '#1f1f25',
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  borderRadius: 8,
  border: 'none',
  letterSpacing: '-0.1px',
  boxShadow: '0 1px 1px rgba(20,21,26,0.03)',
}
const FB_BLOCK_LABEL: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#f2f3e5',
  textAlign: 'center',
  whiteSpace: 'nowrap',
}

/** The orange notification monster (`toolkit-video.html:308-315`). */
function NotifMonster() {
  return (
    <div style={{ width: 48, height: 48, flexShrink: 0, background: '#f2f3e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path
          d="M19.8931 37.566C8.7883 37.566 -0.2139 28.6003 -0.2139 17.5408C5.8012 17.5408 10.6774 12.6843 10.6774 6.6937C10.6774 4.5059 10.6774 2.4341 10.6774 2.4341L29.1087 2.4341C29.1087 2.4341 29.1087 4.5059 29.1087 6.6937C29.1087 12.6843 33.9849 17.5408 40 17.5408C40 28.6004 30.9979 37.566 19.8931 37.566Z"
          fill="#E65800"
        />
        <ellipse cx="2.84122" cy="3.7883" rx="2.84122" ry="3.7883" transform="matrix(-1 0 0 1 19.053 15.9763)" fill="#F2F3E5" />
        <circle cx="1.98886" cy="1.98886" r="1.98886" transform="matrix(-1 0 0 1 18.1058 19.9985)" fill="#36363F" />
        <ellipse cx="2.84122" cy="3.7883" rx="2.84122" ry="3.7883" transform="matrix(-1 0 0 1 26.6295 15.9763)" fill="#F2F3E5" />
        <circle cx="1.98886" cy="1.98886" r="1.98886" transform="matrix(-1 0 0 1 25.6825 19.9986)" fill="#36363F" />
      </svg>
    </div>
  )
}

interface FbBlock {
  icon: string
  label: string
}

function FeedbackBlocks({
  blocks,
  selected,
  onSelect,
  top,
}: {
  blocks: FbBlock[]
  selected: number | null
  onSelect: (i: number) => void
  top: number
}) {
  return (
    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top, display: 'flex', gap: 16 }}>
      {blocks.map((b, i) => (
        <button
          key={b.label}
          type="button"
          className={`fb-block${selected === i ? ' selected' : ''}`}
          onClick={() => onSelect(i)}
          style={{
            width: 179,
            height: 94,
            background: selected === i ? '#444454' : '#2f2f37',
            border: `1px solid ${selected === i ? 'rgba(242,243,229,0.4)' : 'rgba(92,92,101,0.3)'}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#2b2b32',
              border: '1px solid rgba(92,92,101,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            {b.icon}
          </span>
          <span style={FB_BLOCK_LABEL}>{b.label}</span>
        </button>
      ))}
    </div>
  )
}

export function VideoFlow() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()

  const from = searchParams.get('from')
  const fromWrite = from === 'write'
  const fromGrades = from === 'grades'
  const fromAttend = from === 'grades-attend'
  const videoSlug = searchParams.get('video') ?? ''
  const cfg = VIDEO_CFG[videoSlug] ?? null

  const [cur, setCur] = useState<Screen>('s-video')
  const [slide, setSlide] = useState<{ from: Screen; to: Screen; phase: 'enter' | 'run' } | null>(null)
  const [didTryPhase, setDidTryPhase] = useState<Phase>('initial')
  const [thanksPhase, setThanksPhase] = useState<Phase>('initial')
  const [didTrySel, setDidTrySel] = useState<number | null>(null)
  const [helpfulSel, setHelpfulSel] = useState<number | null>(null)
  const didTryNext = useRef<Screen>('s-thanks')
  const [whyText, setWhyText] = useState('')

  // ── Fullscreen video overlay ────────────────────────────────────────────────
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [ended, setEnded] = useState(false)
  const [showPauseIcon, setShowPauseIcon] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const progressRef = useRef<HTMLInputElement | null>(null)
  const seekingRef = useRef(false)
  const wasPlayingRef = useRef(false)

  const runEntry = useCallback((setPhase: (p: Phase) => void) => {
    setPhase('initial')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('entered')
        window.setTimeout(() => setPhase('phase2'), 300)
      })
    })
  }, [])

  // Instant screen switch (prototype `goTo`) + entry animation for did-try/thanks.
  const goTo = useCallback(
    (id: Screen) => {
      setCur(id)
      if (id === 's-did-try') runEntry(setDidTryPhase)
      if (id === 's-thanks') runEntry(setThanksPhase)
    },
    [runEntry],
  )

  // Horizontal slide (prototype `slideTo`) between feedback screens.
  const slideTo = useCallback(
    (to: Screen) => {
      setSlide((prev) => (prev ? prev : { from: cur, to, phase: 'enter' }))
    },
    [cur],
  )

  useEffect(() => {
    if (!slide) return
    if (slide.phase === 'enter') {
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setSlide((s) => (s ? { ...s, phase: 'run' } : s)))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    // phase === 'run' → commit after the slide duration.
    const to = slide.to
    const timer = window.setTimeout(() => {
      setCur(to)
      setSlide(null)
      if (to === 's-thanks') runEntry(setThanksPhase)
    }, SLIDE_DUR + 60)
    return () => window.clearTimeout(timer)
  }, [slide, runEntry])

  // ── Video playback ────────────────────────────────────────────────────────
  const onPlay = () => {
    studentStorage.setVideoWatched(true)
    if (cfg) {
      setEnded(false)
      setShowPauseIcon(false)
      setOverlayOpen(true)
    } else {
      goTo('s-did-try')
    }
  }

  // Load + play when the overlay opens; drive the scrubber via a rAF loop.
  useEffect(() => {
    if (!overlayOpen || !cfg) return
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})

    let raf = 0
    const tick = () => {
      const bar = progressRef.current
      if (video && bar && video.duration && !seekingRef.current) {
        const pct = (video.currentTime / video.duration) * 100
        bar.value = String(pct)
        bar.style.setProperty('--pct', `${pct}%`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [overlayOpen, cfg])

  const onVideoEnded = () => {
    setShowPauseIcon(false)
    setEnded(true)
  }

  const playAgain = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    video.play().catch(() => {})
    setShowPauseIcon(false)
    setEnded(false)
  }

  const skipVideo = () => {
    videoRef.current?.pause()
    setOverlayOpen(false)
    goTo('s-did-try')
  }

  const togglePause = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setShowPauseIcon(false)
    } else {
      video.pause()
      setShowPauseIcon(true)
    }
  }

  const seekVideo = (val: number) => {
    const video = videoRef.current
    if (video && video.duration && isFinite(video.duration)) {
      video.currentTime = (val / 100) * video.duration
    }
  }

  // ── Finish → exit matrix (toolkit-video.html:423-428, 611-615) ──────────────
  const finish = () => {
    studentStorage.setVideoWatched(true)
    if (fromWrite) {
      studentStorage.setEnterAnim(true)
      navigate(base, { state: { enterAnim: true } })
    } else if (fromGrades || fromAttend) {
      navigate(`${base}/school${fromAttend ? '?tab=attend' : ''}`)
    } else {
      navigate(`${base}/toolkit`)
    }
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const screenVisible = (id: Screen) => id === cur || (slide !== null && (id === slide.from || id === slide.to))

  const fbContentStyle = (id: Screen): CSSProperties => {
    if (!slide) return FB_CONTENT_BASE
    const running = slide.phase === 'run'
    if (id === slide.from) {
      return { ...FB_CONTENT_BASE, transform: running ? 'translateX(-1194px)' : 'translateX(0)', transition: running ? `transform ${SLIDE_DUR}ms ${SLIDE_BEZIER}` : 'none', pointerEvents: 'none' }
    }
    if (id === slide.to) {
      return { ...FB_CONTENT_BASE, transform: running ? 'translateX(0)' : 'translateX(1194px)', transition: running ? `transform ${SLIDE_DUR}ms ${SLIDE_BEZIER}` : 'none' }
    }
    return FB_CONTENT_BASE
  }

  // Entry transforms (toolkit-video.html:203-242).
  const enterGroupStyle = (phase: Phase, extraTop: number): CSSProperties => {
    const shown = phase !== 'initial'
    return {
      transform: `translateX(-50%) translateY(${shown ? 0 : extraTop}px)`,
      opacity: shown ? 1 : 0,
      transition: shown ? FB_T : 'none',
    }
  }
  const phase2StyleY = (phase: Phase, y: number): CSSProperties => {
    const on = phase === 'phase2'
    return {
      transform: `translateX(-50%) translateY(${on ? 0 : y}px)`,
      opacity: on ? 1 : 0,
      transition: on ? FB_T : 'none',
    }
  }

  const screenBase: CSSProperties = { position: 'absolute', inset: 0 }

  return (
    <>
      <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="toolkit-video">
        <style>{VIDEO_CSS}</style>

        {/* ── S-VIDEO ── */}
        {screenVisible('s-video') && (
          <div style={{ ...screenBase, display: cur === 's-video' ? 'block' : 'none', background: '#000' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <img src={studentAsset(cfg?.thumb ?? VIDEO_DEFAULT_THUMB)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(183deg, rgba(0,0,0,0) 44%, rgba(0,0,0,0.5) 84%)' }} />
            <button
              type="button"
              className="vf-play"
              aria-label="Play"
              onClick={onPlay}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginLeft: 5 }}>
                <path d="M10 6L26 16L10 26V6Z" fill="#f2f3e5" />
              </svg>
            </button>
          </div>
        )}

        {/* ── S-DID-TRY ── */}
        {screenVisible('s-did-try') && (
          <div style={{ ...screenBase, display: 'block', background: '#1179ad' }}>
            <div style={DOME_STYLE} />
            <div style={fbContentStyle('s-did-try')}>
              {/* notif */}
              <div
                style={{
                  position: 'absolute',
                  top: 180,
                  right: 100,
                  width: 350,
                  height: 68,
                  background: '#58b880',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  boxSizing: 'border-box',
                  ...(() => {
                    const on = didTryPhase === 'phase2'
                    return { transform: `translateX(${on ? 0 : 500}px)`, opacity: on ? 1 : 0, transition: on ? FB_T : 'none' }
                  })(),
                }}
              >
                <NotifMonster />
                <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#2f2f37', lineHeight: 1.1, letterSpacing: '-0.4px' }}>
                  New technique
                  <br />
                  learned!
                </span>
              </div>

              <h1 style={{ ...FB_TITLE_BASE, top: 310, ...enterGroupStyle(didTryPhase, 400) }}>Did you try it?</h1>

              <div style={{ position: 'absolute', left: '50%', top: 459, display: 'flex', gap: 16, ...enterGroupStyle(didTryPhase, 400) }}>
                <FeedbackBlocks
                  blocks={[
                    { icon: '🙋', label: 'Yes, I did it' },
                    { icon: '🙅', label: 'Not this time' },
                    { icon: '🤷', label: "I'm not sure" },
                  ]}
                  selected={didTrySel}
                  onSelect={(i) => {
                    setDidTrySel(i)
                    didTryNext.current = i === 0 ? 's-helpful' : 's-thanks'
                  }}
                  top={0}
                />
              </div>

              <button
                type="button"
                className="fb-btn"
                onClick={() => slideTo(didTryNext.current)}
                style={{ ...FB_BTN_BASE, top: 710, ...phase2StyleY(didTryPhase, 200) }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* ── S-HELPFUL ── */}
        {screenVisible('s-helpful') && (
          <div style={{ ...screenBase, display: 'block', background: '#1179ad' }}>
            <div style={DOME_STYLE} />
            <div style={fbContentStyle('s-helpful')}>
              <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 253, fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: 'rgba(242,243,229,0.6)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                In your opinion
              </p>
              <h1 style={{ ...FB_TITLE_BASE, top: 297, fontSize: 72, transform: 'translateX(-50%)' }}>Was the exercise helpful?</h1>
              <FeedbackBlocks
                blocks={[
                  { icon: '😄', label: 'Very much' },
                  { icon: '😐', label: 'A little' },
                  { icon: '😕', label: 'Not really' },
                ]}
                selected={helpfulSel}
                onSelect={(i) => {
                  setHelpfulSel(i)
                  window.setTimeout(() => slideTo('s-why'), 500)
                }}
                top={514}
              />
            </div>
          </div>
        )}

        {/* ── S-WHY ── */}
        {screenVisible('s-why') && (
          <div style={{ ...screenBase, display: 'block', background: '#1179ad' }}>
            <div style={DOME_STYLE} />
            <div style={fbContentStyle('s-why')}>
              <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 253, fontFamily: 'var(--font-student-body)', fontSize: 14, fontWeight: 500, color: 'rgba(242,243,229,0.6)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                This is optional
              </p>
              <h1 style={{ ...FB_TITLE_BASE, top: 277, fontSize: 72, transform: 'translateX(-50%)' }}>Do you want to tell why?</h1>
              <textarea
                className="why-textarea"
                placeholder="Write your thoughts…"
                value={whyText}
                onChange={(e) => setWhyText(e.target.value)}
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: 466,
                  width: 439,
                  height: 160,
                  background: '#2b2b32',
                  border: '1px solid #444450',
                  borderRadius: 12,
                  padding: 16,
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-student-body)',
                  fontSize: 15,
                  color: '#f2f3e5',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className="why-skip"
                aria-label="Skip"
                onClick={() => goTo('s-thanks')}
                style={{ position: 'absolute', left: 467, top: 709, width: 48, height: 48, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 15.8334L6.66667 10L12.5 4.16669" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="why-continue"
                onClick={() => goTo('s-thanks')}
                style={{ position: 'absolute', left: 527, top: 709, width: 200, height: 48, background: '#f2f3e5', color: '#1f1f25', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, borderRadius: 8, border: 'none', letterSpacing: '-0.1px' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── S-THANKS ── */}
        {screenVisible('s-thanks') && (
          <div style={{ ...screenBase, display: 'block', background: '#1179ad' }}>
            <div style={DOME_STYLE} />

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 253,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-student-display)',
                fontWeight: 400,
                fontSize: 40,
                color: '#f2f3e5',
                whiteSpace: 'nowrap',
                ...enterGroupStyle(thanksPhase, 400),
              }}
            >
              +1 <img src={studentAsset('spark-4.svg')} alt="spark" style={{ width: 32, height: 32, display: 'block' }} />
            </div>

            <h1 style={{ ...FB_TITLE_BASE, top: 317, ...enterGroupStyle(thanksPhase, 400) }}>Thanks for sharing</h1>

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 426,
                width: 390,
                height: 68,
                background: '#58b880',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 10,
                boxSizing: 'border-box',
                ...(() => {
                  const on = thanksPhase === 'phase2'
                  return { transform: on ? 'translateX(-50%)' : 'translateX(700px)', opacity: on ? 1 : 0, transition: on ? FB_T : 'none' }
                })(),
              }}
            >
              <NotifMonster />
              <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#2f2f37', lineHeight: 1.1, letterSpacing: '-0.4px' }}>
                Your feedback helps us make
                <br />
                things better for you.
              </span>
            </div>

            <button type="button" className="fb-btn" onClick={finish} style={{ ...FB_BTN_BASE, top: 721, ...phase2StyleY(thanksPhase, 200) }}>
              Done
            </button>
          </div>
        )}
      </StudentStage>

      {/* Fullscreen video overlay — OUTSIDE the scaled stage (toolkit-video.html:262-283). */}
      {overlayOpen && cfg && typeof document !== 'undefined'
        ? createPortal(
            <div className="vf-overlay" onClick={togglePause} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 999 }}>
              <video
                ref={videoRef}
                src={cfg.src}
                playsInline
                preload="metadata"
                onEnded={onVideoEnded}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
              <div
                className="vf-progress-wrap"
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 32px 20px', boxSizing: 'border-box' }}
              >
                <input
                  ref={progressRef}
                  className="vf-progress"
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  defaultValue={0}
                  onPointerDown={() => {
                    seekingRef.current = true
                    const v = videoRef.current
                    wasPlayingRef.current = v ? !v.paused : false
                    v?.pause()
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.setProperty('--pct', `${el.value}%`)
                  }}
                  onPointerUp={(e) => {
                    seekingRef.current = false
                    seekVideo(Number(e.currentTarget.value))
                    if (wasPlayingRef.current) videoRef.current?.play().catch(() => {})
                  }}
                  onPointerCancel={() => {
                    seekingRef.current = false
                  }}
                  onChange={(e) => seekVideo(Number(e.currentTarget.value))}
                  style={{ width: '100%', height: 14 }}
                />
              </div>
              {showPauseIcon ? (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="5" y="4" width="7" height="20" rx="2" fill="#fff" />
                    <rect x="16" y="4" width="7" height="20" rx="2" fill="#fff" />
                  </svg>
                </div>
              ) : null}
              {!ended ? (
                <button
                  type="button"
                  aria-label="Back"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(-1)
                  }}
                  style={{ position: 'absolute', top: 24, left: 32, width: 48, height: 48, background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15.8334L6.66667 10L12.5 4.16669" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
              {ended ? (
                <div style={{ position: 'absolute', bottom: 100, right: 32, display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playAgain()
                    }}
                    style={{ background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 8, padding: '12px 24px', color: '#fff', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, letterSpacing: '-0.1px', cursor: 'pointer' }}
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      skipVideo()
                    }}
                    style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, padding: '12px 24px', color: '#fff', fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, letterSpacing: '-0.1px', cursor: 'pointer' }}
                  >
                    Complete
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
