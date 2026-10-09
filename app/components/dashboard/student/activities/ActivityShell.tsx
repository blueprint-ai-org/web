import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { ACTIVITY_CSS } from './activity-styles'

/**
 * Shared chrome for the three daily-card activity flows (`write-it-out.html`,
 * `notice-wins.html`, `all-about-you.html`). Each prototype page is a single
 * "write" screen — a spark pill, title, monster message bubble, an input area,
 * and a Save button — over a coloured field with a decorative background shape.
 *
 * The three diverge only in colours, the background shape, back-button geometry,
 * save-button size, the spark pill, the prompt text, and the input widget, so
 * this shell parameterises those and takes the input area as `children`.
 *
 * Save flow (identical across all three, `write-it-out.html:281-292`): the
 * caller's {@link onSave} writes storage, then after a 400 ms beat the screen
 * navigates to `/student/completed?card=<slug>` — the Phase 6 card-collection
 * route. Back is a plain `history.back()` (`navigate(-1)`).
 *
 * Client-only (the route's `HydrateFallback` renders during SSR).
 */

/** The monster message-bubble avatar (`write-it-out.html:208-216`): a butterfly
 *  over two eyes on a cream tile. Static — the eyes do not track here. */
export function MonsterPromptAvatar() {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        background: '#f2f3e5',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        <img
          src={studentAsset('monster-butterfly.svg')}
          alt=""
          style={{ position: 'absolute', width: 36, height: 36, top: 2, left: 2 }}
        />
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
          }}
        >
          <img src={studentAsset('monster-eye.svg')} alt="" style={{ width: 5.78, height: 7.58, display: 'block' }} />
          <img src={studentAsset('monster-eye.svg')} alt="" style={{ width: 5.78, height: 7.58, display: 'block' }} />
        </div>
      </div>
    </div>
  )
}

export interface ActivityShellProps {
  /** Completed-route card id (`completed?card=<slug>`): `write` | `wins` | `about`. */
  slug: string
  /** Screen background colour (`#s-write`/`#s-survey` bg). */
  screenBg: string
  /** Decorative background shape rendered behind the content (z-index 0). */
  bgShape?: ReactNode
  /** Back-button size in px (48 square vs 44 round). */
  backSize: number
  /** Back-button border-radius (8 vs `'50%'`). */
  backRadius: number | string
  /** Back-button base + hover backgrounds. */
  backBg: string
  backBgHover: string
  /** Chevron glyph size in px (20 vs 18). */
  backSvgSize: number
  /** The spark reward pill (differs per flow). */
  sparkPill: ReactNode
  /** Screen title (`write_out_title` etc.). */
  title: string
  /** Header vertical gap (write/wins 10, survey 16). */
  headerGap: number
  /** Monster message-bubble background colour. */
  msgBubbleBg: string
  /** Monster prompt text. */
  msgText: string
  /** Save-button width/height/radius. */
  saveWidth: number
  saveHeight: number
  saveRadius: number
  /** Whether Save is enabled (non-empty input). */
  canSave: boolean
  /** Persist to storage; the shell then delays 400 ms and navigates to completed. */
  onSave: () => void
  /** The input area (textarea / emoji grid). */
  children: ReactNode
}

export function ActivityShell({
  slug,
  screenBg,
  bgShape,
  backSize,
  backRadius,
  backBg,
  backBgHover,
  backSvgSize,
  sparkPill,
  title,
  headerGap,
  msgBubbleBg,
  msgText,
  saveWidth,
  saveHeight,
  saveRadius,
  canSave,
  onSave,
  children,
}: ActivityShellProps) {
  const navigate = useNavigate()
  const base = useStudentNavBase()

  const [shown, setShown] = useState(false)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => {
      cancelAnimationFrame(id)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const handleSave = () => {
    if (!canSave || saving) return
    onSave()
    setSaving(true)
    timerRef.current = window.setTimeout(() => {
      navigate(`${base}/completed?card=${slug}`)
    }, 400)
  }

  const backVars = { '--act-back-bg': backBg, '--act-back-bg-hover': backBgHover } as CSSProperties

  return (
    <StudentStage style={{ backgroundColor: screenBg }} data-testid={`activity-${slug}`}>
      <style>{ACTIVITY_CSS}</style>

      {bgShape}

      <button
        type="button"
        className="act-btn-back"
        aria-label="Back"
        onClick={() => navigate(-1)}
        style={{ ...backVars, width: backSize, height: backSize, borderRadius: backRadius }}
      >
        <svg width={backSvgSize} height={backSvgSize} viewBox="0 0 20 20" fill="none">
          <path d="M12 5L7 10L12 15" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        className={`act-body${shown ? ' act-in' : ''}`}
        style={{
          position: 'absolute',
          top: 115,
          left: '50%',
          transform: shown ? 'translateX(-50%)' : 'translateX(-50%) translateY(8px)',
          zIndex: 5,
          width: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: headerGap,
            marginBottom: 48,
            width: '100%',
          }}
        >
          {sparkPill}
          <h1
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 32,
              letterSpacing: '-0.8px',
              color: '#f2f3e5',
              margin: 0,
              lineHeight: '40px',
              textAlign: 'center',
            }}
          >
            {title}
          </h1>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: msgBubbleBg, padding: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <MonsterPromptAvatar />
            <p
              style={{
                fontFamily: 'var(--font-student-body)',
                fontSize: 20,
                fontWeight: 500,
                color: '#2f2f37',
                lineHeight: 1.1,
                letterSpacing: '-0.4px',
                margin: 0,
              }}
            >
              {msgText}
            </p>
          </div>

          {children}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <button
          type="button"
          className="act-btn-save"
          disabled={!canSave}
          onClick={handleSave}
          style={{ width: saveWidth, height: saveHeight, borderRadius: saveRadius }}
        >
          Save
        </button>
      </div>
    </StudentStage>
  )
}
