import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { Sidebar } from '../chrome/Sidebar'
import { SupportPanel } from '../chrome/SupportPanel'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import {
  ACTIVITY_CARDS,
  CARD_STEP,
  JOURNEY_COPY,
  MAX_OFFSET,
  STAT_CARDS,
  type StatKey,
} from './journey-data'
import { JOURNEY_CSS } from './journey-styles'
import { StatDetailOverlay } from './StatDetailOverlay'
import { useSparkSwarm } from './useSparkSwarm'

/**
 * `/student/journey` — the journey dashboard (ports `journey.html`).
 *
 * Two period tabs: **This month** (a 2×2 stat grid + "Open monthly recap"), and
 * **Over time** (a drag carousel of milestone cards with rubber-band overscroll
 * and 460px snap). Tapping a stat card opens the {@link StatDetailOverlay} with a
 * clip-path bottom-up reveal; the Sparkz stat hosts the spring-physics spark
 * swarm ({@link useSparkSwarm}). Arriving with `?from=recap` plays the
 * slide-up entry animation (`.jy-inner.from-recap`).
 *
 * Sidebar-bearing stage page; client-only (see the route's `HydrateFallback`).
 * Mounted at both `/student/journey` and `/preview/student/journey`.
 *
 * Deviation: the prototype's "Open monthly recap" button calls `openWrap()`,
 * which navigates straight to `recap.html` (`journey.html:998-1000`). The inline
 * `#wrap-overlay` 6-slide preview machine (`animateWrap`/`nextSlide`/`prevSlide`,
 * `:1002-1077`) is never shown by any live code path — nothing sets the overlay
 * to `display:block`. This port reproduces the live behaviour (navigate to
 * `/student/recap`) and omits the unreachable wrap overlay, the same call made
 * for the toolkit's dead `#yt-overlay` in Phase 9.
 */

const SDO_BEZ = 'cubic-bezier(0.81, 0, 0.26, 0.98)'

const CARD_TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 20,
  fontWeight: 500,
  color: '#f2f3e5',
  margin: 0,
  lineHeight: 1.1,
  letterSpacing: '-0.4px',
  width: 187,
  position: 'relative',
  zIndex: 1,
}

const CARD_DATE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#737472',
  margin: 0,
  letterSpacing: '-0.1px',
  position: 'relative',
  zIndex: 1,
}

export function JourneyHome() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()

  const fromRecap = searchParams.get('from') === 'recap'

  const [sparks] = useState(() => studentStorage.getSparks())
  const [period, setPeriod] = useState<0 | 1>(0)
  const [statKey, setStatKey] = useState<StatKey | null>(null)

  // ── Stat detail overlay clip-path cinematics (journey.html:1364-1384) ────────
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  useSparkSwarm(fieldRef, statKey === 'sparks')

  // Runs synchronously after mount, before the browser paints: hide the overlay
  // (clip below the fold), then reveal it over two frames. clip-path is driven
  // imperatively (never declaratively) so a re-render can't clobber it.
  useLayoutEffect(() => {
    if (!statKey) return
    const ov = overlayRef.current
    if (!ov) return
    ov.style.transition = 'none'
    ov.style.clipPath = 'inset(834px 0 0 0)'
    let raf2 = 0
    let timer = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        ov.style.transition = `clip-path 800ms ${SDO_BEZ}`
        ov.style.clipPath = 'inset(0px 0 0 0)'
        timer = window.setTimeout(() => {
          if (overlayRef.current) {
            overlayRef.current.style.clipPath = 'none'
            overlayRef.current.style.transition = ''
          }
        }, 810)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(timer)
    }
  }, [statKey])

  function closeStat() {
    const ov = overlayRef.current
    if (!ov) {
      setStatKey(null)
      return
    }
    ov.style.transition = `clip-path 600ms ${SDO_BEZ}`
    ov.style.clipPath = 'inset(834px 0 0 0)'
    window.setTimeout(() => setStatKey(null), 620)
  }

  // ── Drag carousel (journey.html:929-989) ─────────────────────────────────────
  const clipRef = useRef<HTMLDivElement | null>(null)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (period !== 1) return
    const clip = clipRef.current
    const row = rowRef.current
    if (!clip || !row) return

    let startX = 0
    let startOffset = 0
    let dragging = false

    const onStart = (x: number) => {
      dragging = true
      startX = x
      startOffset = offsetRef.current
      row.style.transition = 'none'
      clip.classList.add('dragging')
    }
    const onMove = (x: number) => {
      if (!dragging) return
      let delta = startOffset + (startX - x)
      if (delta < 0) delta = delta * 0.3
      if (delta > MAX_OFFSET) delta = MAX_OFFSET + (delta - MAX_OFFSET) * 0.3
      row.style.transform = `translateX(-${delta}px)`
    }
    const onEnd = (x: number) => {
      if (!dragging) return
      dragging = false
      clip.classList.remove('dragging')
      const delta = startOffset + (startX - x)
      const snapped = Math.max(0, Math.min(Math.round(delta / CARD_STEP) * CARD_STEP, MAX_OFFSET))
      offsetRef.current = snapped
      setOffset(snapped)
      row.style.transition = 'transform 600ms cubic-bezier(0.73,-0.01,0.2,0.98)'
      row.style.transform = `translateX(-${snapped}px)`
    }

    const onMouseDown = (e: MouseEvent) => {
      onStart(e.clientX)
      e.preventDefault()
    }
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX)
    const onMouseUp = (e: MouseEvent) => onEnd(e.clientX)
    const onTouchStart = (e: TouchEvent) => onStart(e.touches[0].clientX)
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX)
    const onTouchEnd = (e: TouchEvent) => onEnd(e.changedTouches[0].clientX)

    clip.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    clip.addEventListener('touchstart', onTouchStart, { passive: true })
    clip.addEventListener('touchmove', onTouchMove, { passive: true })
    clip.addEventListener('touchend', onTouchEnd)

    return () => {
      clip.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      clip.removeEventListener('touchstart', onTouchStart)
      clip.removeEventListener('touchmove', onTouchMove)
      clip.removeEventListener('touchend', onTouchEnd)
    }
  }, [period])

  function navCards(dir: 1 | -1) {
    const next = Math.max(0, Math.min(offsetRef.current + dir * CARD_STEP, MAX_OFFSET))
    offsetRef.current = next
    setOffset(next)
    const row = rowRef.current
    if (row) {
      row.style.transition = 'transform 800ms cubic-bezier(0.73,-0.01,0.2,0.98)'
      row.style.transform = `translateX(-${next}px)`
    }
  }

  const openStat = (key: StatKey) => setStatKey(key)

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="journey">
      <style>{JOURNEY_CSS}</style>

      <div className={`jy-inner${fromRecap ? ' from-recap' : ''}`} style={{ position: 'absolute', inset: 0 }}>
        <Sidebar />

        {/* Main content */}
        <div style={{ position: 'absolute', left: 152, top: 72, right: 24, bottom: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 36 }}>
            <h1
              style={{
                fontFamily: 'var(--font-student-display)',
                fontWeight: 400,
                fontSize: 64,
                lineHeight: 1.06,
                color: '#f2f3e5',
                margin: '0 0 16px',
              }}
            >
              {JOURNEY_COPY.title}
            </h1>
            <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#737472', letterSpacing: '-0.1px', margin: 0 }}>
              {JOURNEY_COPY.sub}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {([[0, JOURNEY_COPY.tabThisMonth], [1, JOURNEY_COPY.tabOverTime]] as const).map(([idx, label]) => {
              const active = period === idx
              return (
                <button
                  key={idx}
                  type="button"
                  className="jy-tab-pill"
                  onClick={() => setPeriod(idx)}
                  style={{
                    height: 40,
                    padding: '0 20px',
                    borderRadius: 12,
                    border: 'none',
                    fontFamily: 'var(--font-student-body)',
                    fontSize: 16,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    background: active ? '#f2f3e5' : '#2b2b35',
                    color: active ? '#1f1f25' : 'rgba(242,243,229,0.5)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* This month panel */}
          {period === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {STAT_CARDS.map((card) => (
                  <div
                    key={card.key}
                    className="jy-stat-card"
                    onClick={() => openStat(card.key)}
                    style={{
                      height: 200,
                      borderRadius: 16,
                      border: '1px solid #36363f',
                      background: '#1f1f25',
                      padding: 24,
                      boxSizing: 'border-box',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-student-body)',
                        fontSize: 18,
                        fontWeight: 500,
                        color: '#a4a59f',
                        margin: 0,
                        letterSpacing: '-0.1px',
                        lineHeight: '20px',
                        width: 168,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {card.label}
                    </p>
                    <span
                      style={{
                        fontFamily: 'var(--font-student-display)',
                        fontWeight: 400,
                        fontSize: 48,
                        lineHeight: '48px',
                        color: '#f2f3e5',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {card.key === 'sparks' ? sparks : card.value}
                    </span>
                    <div style={{ position: 'absolute', left: 279, top: 0, width: 300, height: 300, overflow: 'hidden', pointerEvents: 'none' }}>
                      <img src={studentAsset(card.shape)} alt="" style={{ width: 300, height: 300, display: 'block' }} />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="jy-open-recap"
                onClick={() => navigate(`${base}/recap`)}
                style={{
                  position: 'absolute',
                  bottom: 63,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: 48,
                  width: 200,
                  padding: 0,
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.16)',
                  fontFamily: 'var(--font-student-body)',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#f5f5f5',
                  letterSpacing: '-0.1px',
                }}
              >
                {JOURNEY_COPY.openRecap}
              </button>
            </div>
          ) : null}
        </div>

        {/* Over time carousel — positioned relative to the stage (journey.html:316-355) */}
        {period === 1 ? (
          <>
            <div
              ref={clipRef}
              className="jy-alltime-clip"
              style={{ position: 'absolute', left: 152, top: 320, right: 24, height: 400, overflow: 'hidden' }}
            >
              <div
                ref={rowRef}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: `translateX(-${offset}px)`,
                  transition: 'transform 800ms cubic-bezier(0.73,-0.01,0.2,0.98)',
                }}
              >
                {ACTIVITY_CARDS.map((card, i) => (
                  <div key={card.title} style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 318,
                        height: 376,
                        borderRadius: 16,
                        border: '1px solid #36363f',
                        background: '#1f1f25',
                        padding: 24,
                        boxSizing: 'border-box',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                      }}
                    >
                      <p style={CARD_TITLE_STYLE}>{card.title}</p>
                      <p style={CARD_DATE_STYLE}>{card.date}</p>
                      <div style={{ position: 'absolute', left: 118, top: 150, width: 300, height: 300, pointerEvents: 'none' }}>
                        <img src={studentAsset(card.wzor)} alt="" style={{ width: 300, height: 300, display: 'block' }} />
                      </div>
                    </div>
                    {i < ACTIVITY_CARDS.length - 1 ? (
                      <div style={{ width: 120, height: 376, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={studentAsset('laczniik.svg')} alt="" style={{ width: 120, height: 24, display: 'block' }} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'absolute', right: 182, bottom: 70, display: 'flex', gap: 13, alignItems: 'center', zIndex: 5 }}>
              <button
                type="button"
                className="jy-nav-arrow"
                aria-label="Previous"
                onClick={() => navCards(-1)}
                style={{ width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: offset > 0 ? 1 : 0.3 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8L10 4" stroke="#f2f3e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="jy-nav-arrow"
                aria-label="Next"
                onClick={() => navCards(1)}
                style={{ width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: offset < MAX_OFFSET ? 1 : 0.3 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="#f2f3e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </>
        ) : null}

        <SupportPanel />
      </div>

      {/* Stat detail overlay — sibling of `.jy-inner` (no entry animation) */}
      {statKey ? (
        <StatDetailOverlay statKey={statKey} sparks={sparks} fieldRef={fieldRef} overlayRef={overlayRef} onClose={closeStat} />
      ) : null}
    </StudentStage>
  )
}
