import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { studentStorage } from '~/lib/student/storage'

/**
 * First-launch spotlight tour (`today.html:1263-1359`). A dimmer with a
 * box-shadow "cutout" hole highlights three targets in turn — the hero card, the
 * sidebar, and the support handle — with a tooltip; clicking anywhere advances.
 * Gated by `bp_tour_done` (written on finish). Starts 1600 ms after load.
 *
 * Runs inside the scaled {@link StudentStage}, so target screen rects are
 * converted to the stage's local 1194×834 space by dividing by the stage scale
 * (the prototype's `dc()` helper, `today:1274-1277`).
 */

const PAD = 14
const START_DELAY = 1600

interface TourStep {
  /** Selector queried within the stage; ignored when `coords` is given. */
  selector?: string
  /** Hardcoded stage-local rect (support handle sits behind a transform). */
  coords?: { x: number; y: number; w: number; h: number }
  text: string
  tip: 'below' | 'right' | 'left'
}

const STEPS: readonly TourStep[] = [
  { selector: '.th-card.hero', text: 'These are your daily activities — a different check-in each day.', tip: 'below' },
  { selector: 'nav', text: 'Navigate between Today, your Journal, and more.', tip: 'right' },
  { coords: { x: 1130, y: 715, w: 64, h: 72 }, text: 'Need support? This button is always here for you.', tip: 'left' },
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function SpotlightTour({ enabled }: { enabled: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => setActive(true), START_DELAY)
    return () => window.clearTimeout(timer)
  }, [enabled])

  // Measure the current step's target in stage-local coordinates.
  useLayoutEffect(() => {
    if (!active) return
    const cfg = STEPS[step]
    if (!cfg) return
    if (cfg.coords) {
      setRect(cfg.coords)
      return
    }
    const stage = rootRef.current?.closest('[data-student-stage]') as HTMLElement | null
    const target = stage?.querySelector(cfg.selector!) as HTMLElement | null
    if (!stage || !target) {
      setRect(null)
      return
    }
    const sRect = stage.getBoundingClientRect()
    const scale = sRect.width / 1194 || 1
    const tRect = target.getBoundingClientRect()
    setRect({
      x: (tRect.left - sRect.left) / scale,
      y: (tRect.top - sRect.top) / scale,
      w: tRect.width / scale,
      h: tRect.height / scale,
    })
  }, [active, step])

  if (!enabled || !active) return null

  const finish = () => {
    studentStorage.setTourDone(true)
    setActive(false)
  }
  const advance = () => {
    if (step >= STEPS.length - 1) finish()
    else setStep((s) => s + 1)
  }

  const cfg = STEPS[step]
  // Tooltip placement (`today:1328-1341`).
  let tipLeft = 8
  let tipTop = 8
  if (rect) {
    if (cfg.tip === 'left') {
      tipLeft = Math.max(8, rect.x - 264 - 24)
      tipTop = Math.max(8, rect.y + rect.h / 2 - 60)
    } else if (cfg.tip === 'right') {
      tipLeft = rect.x + rect.w + 20
      tipTop = Math.max(8, rect.y + rect.h / 2 - 60)
    } else {
      tipLeft = Math.max(8, rect.x)
      tipTop = rect.y + rect.h + 16
    }
  }

  return (
    <div
      ref={rootRef}
      onClick={advance}
      style={{ position: 'absolute', inset: 0, zIndex: 200, cursor: 'pointer' }}
    >
      {rect && (
        <div
          style={{
            position: 'absolute',
            left: rect.x - PAD,
            top: rect.y - PAD,
            width: rect.w + PAD * 2,
            height: rect.h + PAD * 2,
            borderRadius: 16,
            boxShadow: '0 0 0 2000px rgba(12,12,18,0.82)',
            transition: 'left .3s, top .3s, width .3s, height .3s',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: tipLeft,
          top: tipTop,
          width: 264,
          background: '#2b2b32',
          border: '1px solid #444450',
          borderRadius: 16,
          padding: '20px 24px',
          boxSizing: 'border-box',
        }}
      >
        <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#f2f3e5', margin: '0 0 12px', lineHeight: 1.4 }}>
          {cfg.text}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 13, color: '#737472' }}>Tap anywhere to continue</span>
          <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 13, color: '#737472' }}>
            {step + 1}/{STEPS.length}
          </span>
        </div>
      </div>
    </div>
  )
}
