import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { useRafLoop } from '../hooks/useRafLoop'

import { SHAPE_FUNS, SWARM, type Formation } from './journey-data'

/**
 * The spring-physics spark swarm (`journey.html:1234-1337`). When the Sparkz
 * stat detail opens, 36 `<img class="jy-spark">` elements inside `fieldRef`
 * spring toward one of six randomly-picked formations (flower / star / heart /
 * bolt / smiley / strawberry), with light perturbation, velocity clamping, and
 * O(n²) pairwise collision resolution so they never overlap.
 *
 * Reuses the shared {@link useRafLoop} (the same driver as the googly-eye pupils
 * and the video scrubber) rather than a bespoke rAF loop — the frame closure
 * reads mutable refs so the physics runs at full rate without restarting the
 * loop. The swarm only runs while `active`; positions are (re)seeded and a fresh
 * formation is chosen each time `active` flips true.
 *
 * The prototype seeds from `document.getElementById('skc'+i)`; here the sparks
 * are queried out of `fieldRef` (`img.jy-spark`) so the component owns the
 * markup and the hook owns the motion.
 */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  el: HTMLElement
}

export function useSparkSwarm(
  fieldRef: RefObject<HTMLDivElement | null>,
  active: boolean,
): void {
  const particles = useRef<Particle[]>([])
  const targets = useRef<Formation>([])

  const { start, stop } = useRafLoop(() => {
    const pts = particles.current
    const tg = targets.current
    const n = pts.length
    if (n === 0 || tg.length < n) return

    const { SPRING, DAMP, PERTURB, MAXV, R, COLLIDE_D2, COLLIDE_MIN } = SWARM

    // Spring toward the target + damping + velocity clamp.
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      p.vx += (tg[i][0] - p.x) * SPRING + (Math.random() - 0.5) * PERTURB
      p.vy += (tg[i][1] - p.y) * SPRING + (Math.random() - 0.5) * PERTURB
      p.vx *= DAMP
      p.vy *= DAMP
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
      if (spd > MAXV) {
        p.vx *= MAXV / spd
        p.vy *= MAXV / spd
      }
      p.x += p.vx
      p.y += p.vy
    }

    // Pairwise collision resolution.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pts[i]
        const b = pts[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d2 = dx * dx + dy * dy
        if (d2 < COLLIDE_D2 && d2 > 0.001) {
          const dist = Math.sqrt(d2)
          const nx = dx / dist
          const ny = dy / dist
          const push = (COLLIDE_MIN - dist) * 0.5
          a.x -= nx * push
          a.y -= ny * push
          b.x += nx * push
          b.y += ny * push
          const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
          if (rv > 0) {
            a.vx -= rv * nx
            a.vy -= rv * ny
            b.vx += rv * nx
            b.vy += rv * ny
          }
        }
      }
    }

    // Commit to the DOM (top-left = centre − radius).
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      p.el.style.left = `${p.x - R}px`
      p.el.style.top = `${p.y - R}px`
    }
  })

  useEffect(() => {
    if (!active) {
      stop()
      return
    }
    const field = fieldRef.current
    if (!field) return

    const imgs = Array.from(field.querySelectorAll<HTMLElement>('img.jy-spark')).slice(0, SWARM.COUNT)
    if (imgs.length === 0) return

    const fw = field.offsetWidth || 1194
    const fh = field.offsetHeight || 834
    const { R } = SWARM

    const shape = SHAPE_FUNS[Math.floor(Math.random() * SHAPE_FUNS.length)]
    targets.current = shape(SWARM.CX, SWARM.CY)

    particles.current = imgs.map((el) => ({
      x: R + Math.random() * (fw - 2 * R),
      y: 60 + Math.random() * (fh - 250),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      el,
    }))

    start()
    return () => {
      stop()
      particles.current = []
    }
  }, [active, fieldRef, start, stop])
}
