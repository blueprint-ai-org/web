import { useEffect, useId, useRef } from 'react'
import type { CSSProperties } from 'react'

import { useRafLoop } from '../hooks/useRafLoop'

/**
 * Googly-eye overlay — the SVG face/eye layer the prototype composites over the
 * challenge cards, avatar buttons, feel-good cards, and monster bubble
 * (`onboarding.html` `.ccard-eye` / `.fc-eye-svg`).
 *
 * The pupils wander with the prototype's shared rAF loops (`obRaf` `:2177-2191`
 * for the s0 cards, `fcRaf` `:2227-2236` for the feel-good cards / avatars /
 * monster bubbles): a per-instance offset eases toward a randomly re-picked
 * target, and every pupil in the overlay rides that one offset (an eye pair
 * always looks the same way). Pass the matching {@link GooglyWander} preset;
 * omit `wander` to keep the pupils at rest. The loop mutates the pupil `cx`/`cy`
 * attributes directly (no per-frame React render) and is client-only (started
 * in an effect), so SSR/hydration render the static rest positions.
 *
 * Every `clipPath` id is namespaced with a per-instance {@link useId} value so
 * multiple overlays (e.g. four avatar buttons) can mount in the same document
 * without their ids colliding (a duplicate id would make one clip win for all).
 */

export interface GooglyEye {
  /** Eye-white centre + radii (a circle uses `rx === ry`). */
  wcx: number
  wcy: number
  wrx: number
  wry: number
  /** Pupil centre + radius (rest position). */
  pcx: number
  pcy: number
  pr: number
}

/** Optional rounded-rect face mask that clips the eyes (avatars / feel-good cards). */
export interface GooglyFaceClip {
  x: number
  y: number
  w: number
  h: number
  rx: number
}

/**
 * Pupil-wander parameters. Unifies the two prototype loops into one model:
 * a target offset `(ampX·cos θ·m, ampY·sin θ·m)` where `m = magBase + rand·magSpan`,
 * eased toward at `approach` per frame, re-picked every `repickMin…repickMax` ms.
 */
export interface GooglyWander {
  /** Per-frame ease factor toward the target (`obRaf` 0.09 · `fcRaf` 0.07). */
  approach: number
  /** X / Y offset amplitude in viewBox units (isotropic, or per-axis for elliptical eyes). */
  amplitudeX: number
  amplitudeY: number
  /** Target magnitude: `magBase + Math.random() * magSpan`. */
  magBase: number
  magSpan: number
  /** Re-pick interval bounds (ms). */
  repickMinMs: number
  repickMaxMs: number
}

/** s0 challenge cards (`obRaf`, `onboarding.html:2159-2191`): fixed 2–4.5px radial wander. */
export const GOOGLY_WANDER_CARD: GooglyWander = {
  approach: 0.09,
  amplitudeX: 1,
  amplitudeY: 1,
  magBase: 2,
  magSpan: 2.5,
  repickMinMs: 600,
  repickMaxMs: 2000,
}

/** Feel-good cards + avatars (`fcRaf`, `:2212-2236`): 4.5px cap × 0.3–0.95 factor. */
export const GOOGLY_WANDER_FACE: GooglyWander = {
  approach: 0.07,
  amplitudeX: 4.5,
  amplitudeY: 4.5,
  magBase: 0.3,
  magSpan: 0.65,
  repickMinMs: 700,
  repickMaxMs: 2300,
}

/** Monster message bubble m01 (`fcRaf` elliptical eye, `:2209`): per-axis caps 0.7 × 1.5. */
export const GOOGLY_WANDER_MONSTER_M01: GooglyWander = {
  approach: 0.07,
  amplitudeX: 0.7,
  amplitudeY: 1.5,
  magBase: 0.3,
  magSpan: 0.65,
  repickMinMs: 700,
  repickMaxMs: 2300,
}

export interface GooglyEyesProps {
  viewBox: string
  eyes: readonly GooglyEye[]
  pupilFill: string
  faceClip?: GooglyFaceClip
  whiteFill?: string
  /** Pupil-wander preset (see `GOOGLY_WANDER_*`). Omit for static pupils. */
  wander?: GooglyWander
  className?: string
  style?: CSSProperties
}

export function GooglyEyes({
  viewBox,
  eyes,
  pupilFill,
  faceClip,
  whiteFill = '#F2F3E5',
  wander,
  className,
  style,
}: GooglyEyesProps) {
  const raw = useId()
  const uid = raw.replace(/[^a-zA-Z0-9-]/g, '')
  const faceId = `${uid}-face`

  const pupilRefs = useRef<Array<SVGCircleElement | null>>([])
  const offset = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  const { start, stop } = useRafLoop(() => {
    const w = wander
    if (!w) return
    const o = offset.current
    const t = target.current
    o.x += (t.x - o.x) * w.approach
    o.y += (t.y - o.y) * w.approach
    for (let i = 0; i < eyes.length; i++) {
      const el = pupilRefs.current[i]
      if (!el) continue
      el.setAttribute('cx', String(eyes[i].pcx + o.x))
      el.setAttribute('cy', String(eyes[i].pcy + o.y))
    }
  })

  useEffect(() => {
    if (!wander) return
    let timer = 0
    const pick = () => {
      const angle = Math.random() * Math.PI * 2
      const mag = wander.magBase + Math.random() * wander.magSpan
      target.current.x = wander.amplitudeX * Math.cos(angle) * mag
      target.current.y = wander.amplitudeY * Math.sin(angle) * mag
      timer = window.setTimeout(
        pick,
        wander.repickMinMs + Math.random() * (wander.repickMaxMs - wander.repickMinMs),
      )
    }
    pick()
    start()
    return () => {
      window.clearTimeout(timer)
      stop()
    }
  }, [wander, start, stop])

  return (
    <svg
      className={className}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <defs>
        {faceClip && (
          <clipPath id={faceId}>
            <rect
              x={faceClip.x}
              y={faceClip.y}
              width={faceClip.w}
              height={faceClip.h}
              rx={faceClip.rx}
            />
          </clipPath>
        )}
        {eyes.map((e, i) => (
          <clipPath id={`${uid}-c${i}`} key={`cp-${i}`}>
            <ellipse cx={e.wcx} cy={e.wcy} rx={e.wrx} ry={e.wry} />
          </clipPath>
        ))}
      </defs>
      <g clipPath={faceClip ? `url(#${faceId})` : undefined}>
        {eyes.map((e, i) => (
          <ellipse
            key={`w-${i}`}
            cx={e.wcx}
            cy={e.wcy}
            rx={e.wrx}
            ry={e.wry}
            fill={whiteFill}
          />
        ))}
        {eyes.map((e, i) => (
          <circle
            key={`p-${i}`}
            ref={(el) => {
              pupilRefs.current[i] = el
            }}
            cx={e.pcx}
            cy={e.pcy}
            r={e.pr}
            fill={pupilFill}
            clipPath={`url(#${uid}-c${i})`}
          />
        ))}
      </g>
    </svg>
  )
}
