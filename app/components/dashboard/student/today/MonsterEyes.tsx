import { useEffect, useId, useRef } from 'react'

import { useRafLoop } from '../hooks/useRafLoop'

import { EYE_GEOMETRY, EYE_TWEEN, WANDER_HERO, WANDER_HOVER } from './today-data'

/**
 * The sleepy-card googly-eye overlay (`today.html:555-595` markup, `openEyes`/
 * `closeEyes` :1191-1215, pupil-wander rAF :1115-1177). Unlike the shared
 * `GooglyEyes` (always-open + wander), these cards' eyelids open/close: the
 * `open` prop tweens the white-ellipse `ry` (480 ms ease-out open / 320 ms
 * ease-in close) and pops the pupil in past half-open; when open, the pupils
 * wander via one rAF loop (`hero` = livelier lerp 0.09, `hover` = calmer 0.04).
 * All DOM mutation is imperative (no per-frame React render), matching the
 * prototype. Geometry is identical for every card ({@link EYE_GEOMETRY}).
 */

const { left, right, rx, ryOpen, pupilR, whiteFill, pupilFill, viewBox } = EYE_GEOMETRY
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)
const easeIn = (p: number) => p * p * p

export type WanderMode = 'hero' | 'hover' | null

export function MonsterEyes({ open, wanderMode }: { open: boolean; wanderMode: WanderMode }) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const ewL = useRef<SVGEllipseElement | null>(null)
  const ewR = useRef<SVGEllipseElement | null>(null)
  const puL = useRef<SVGCircleElement | null>(null)
  const puR = useRef<SVGCircleElement | null>(null)
  const tweenRaf = useRef<number | null>(null)
  const offset = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  // Eyelid tween whenever `open` flips (`openEyes`/`closeEyes`).
  useEffect(() => {
    const dur = open ? EYE_TWEEN.openMs : EYE_TWEEN.closeMs
    const ease = open ? easeOut : easeIn
    const toRy = open ? ryOpen : 0
    const fromRy = parseFloat(ewL.current?.getAttribute('ry') ?? '0') || 0
    if (!open) {
      puL.current?.setAttribute('r', '0') // pupils hide immediately on close
      puR.current?.setAttribute('r', '0')
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const v = fromRy + (toRy - fromRy) * ease(p)
      ewL.current?.setAttribute('ry', String(v))
      ewR.current?.setAttribute('ry', String(v))
      if (open) {
        const r = v > ryOpen * 0.5 ? pupilR : 0 // pupil pops in past half-open
        puL.current?.setAttribute('r', String(r))
        puR.current?.setAttribute('r', String(r))
      }
      if (p < 1) tweenRaf.current = requestAnimationFrame(step)
    }
    tweenRaf.current = requestAnimationFrame(step)
    return () => {
      if (tweenRaf.current) cancelAnimationFrame(tweenRaf.current)
    }
  }, [open])

  // Pupil wander — one loop; only moves pupils that are currently visible (r > 5).
  const { start, stop } = useRafLoop(() => {
    const w = wanderMode === 'hero' ? WANDER_HERO : wanderMode === 'hover' ? WANDER_HOVER : null
    const o = offset.current
    const t = target.current
    if (w) {
      o.x += (t.x - o.x) * w.lerp
      o.y += (t.y - o.y) * w.lerp
    } else {
      o.x += (0 - o.x) * 0.1 // recenter at rest
      o.y += (0 - o.y) * 0.1
    }
    const pairs: Array<[SVGCircleElement | null, { pcx: number; pcy: number }]> = [
      [puL.current, left],
      [puR.current, right],
    ]
    for (const [el, rest] of pairs) {
      if (!el) continue
      if ((parseFloat(el.getAttribute('r') ?? '0') || 0) > 5) {
        el.setAttribute('cx', String(rest.pcx + o.x))
        el.setAttribute('cy', String(rest.pcy + o.y))
      }
    }
  })

  useEffect(() => {
    start()
    let timer = 0
    const pick = () => {
      const w = wanderMode === 'hero' ? WANDER_HERO : wanderMode === 'hover' ? WANDER_HOVER : null
      if (w) {
        const angle = Math.random() * Math.PI * 2
        const dist = w.radiusMin + Math.random() * (w.radiusMax - w.radiusMin)
        target.current.x = Math.cos(angle) * dist
        target.current.y = Math.sin(angle) * dist
        timer = window.setTimeout(pick, w.repickMin + Math.random() * (w.repickMax - w.repickMin))
      } else {
        target.current.x = 0
        target.current.y = 0
        timer = window.setTimeout(pick, 1000)
      }
    }
    pick()
    return () => {
      stop()
      window.clearTimeout(timer)
    }
  }, [wanderMode, start, stop])

  return (
    <svg className="th-eye-overlay" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`${uid}-L`}>
          <ellipse cx={left.wcx} cy={left.wcy} rx={rx} ry={ryOpen} />
        </clipPath>
        <clipPath id={`${uid}-R`}>
          <ellipse cx={right.wcx} cy={right.wcy} rx={rx} ry={ryOpen} />
        </clipPath>
      </defs>
      <ellipse ref={ewL} cx={left.wcx} cy={left.wcy} rx={rx} ry={open ? ryOpen : 0} fill={whiteFill} />
      <circle ref={puL} cx={left.pcx} cy={left.pcy} r={open ? pupilR : 0} fill={pupilFill} clipPath={`url(#${uid}-L)`} />
      <ellipse ref={ewR} cx={right.wcx} cy={right.wcy} rx={rx} ry={open ? ryOpen : 0} fill={whiteFill} />
      <circle ref={puR} cx={right.pcx} cy={right.pcy} r={open ? pupilR : 0} fill={pupilFill} clipPath={`url(#${uid}-R)`} />
    </svg>
  )
}
