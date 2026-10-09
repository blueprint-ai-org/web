import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { COMPLETED_CARDS, COMPLETED_TIMELINE, DRAWER } from './today-data'

/**
 * `/student/completed` — the ~3.9 s card-collection transition (ports
 * `completed.html`, timeline `completed:248-288`). A full card fades in, a
 * "+1 spark" badge and "Completed!" appear, the drawer (szuflada) slides up
 * pre-filled with already-collected mini cards, the card flies + shrinks into
 * its slot, everything slides out, and at 3900 ms it redirects to the hub
 * (setting `bp_enter_anim`) — or the journal when `?from=journal`.
 *
 * The card's own section is NOT committed here; the flow page set `bp_<slug>_done`
 * and the hub's {@link useTodayState} commits it on arrival. This route only
 * READS `bp_today_sections` to pre-fill the drawer. Client-only render.
 */

export function CompletedSequence() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const base = useStudentNavBase()

  const slug = params.get('card') ?? 'wins'
  const fromJournal = params.get('from') === 'journal'
  const cfg = COMPLETED_CARDS[slug] ?? COMPLETED_CARDS.wins

  // Slot delta (flying card centre → drawer slot 0). `completed:204-219`.
  const slotLeft = DRAWER.left + DRAWER.colX[cfg.col]
  const slotTop = DRAWER.topIn + DRAWER.rowY[0]
  const dxx = slotLeft - DRAWER.cardLeft
  const dyy = slotTop - DRAWER.cardTop

  // Drawer pre-fill: other already-collected sections (not the flying one).
  const [preFill] = useState(() => {
    const sections = studentStorage.getTodaySections()
    return Object.entries(COMPLETED_CARDS)
      .filter(([s, c]) => s !== slug && sections.includes(c.section))
      .map(([, c]) => c)
  })

  const cardRef = useRef<HTMLDivElement | null>(null)
  const sparkRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const drawerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const T = COMPLETED_TIMELINE
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

    at(T.cardIn, () => {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateY(0)'
        cardRef.current.style.opacity = '1'
      }
    })
    at(T.sparkIn, () => {
      if (sparkRef.current) {
        sparkRef.current.style.transform = 'translateX(-50%) translateY(0)'
        sparkRef.current.style.opacity = '1'
      }
    })
    at(T.textIn, () => {
      if (textRef.current) {
        textRef.current.style.transform = 'translateX(-50%) translateY(0)'
        textRef.current.style.opacity = '1'
      }
    })
    at(T.drawerUp, () => {
      if (drawerRef.current) drawerRef.current.style.top = `${DRAWER.topIn}px`
      if (textRef.current) {
        textRef.current.style.transition = 'transform 600ms cubic-bezier(0.4,0,1,1), opacity 500ms ease'
        textRef.current.style.transform = 'translateX(-50%) translateY(260px)'
        textRef.current.style.opacity = '0'
      }
      if (sparkRef.current) {
        sparkRef.current.style.transition = 'transform 600ms cubic-bezier(0.4,0,1,1), opacity 500ms ease'
        sparkRef.current.style.transform = 'translateX(-50%) translateY(-180px)'
        sparkRef.current.style.opacity = '0'
      }
    })
    at(T.flyToSlot, () => {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 620ms cubic-bezier(0.4,0,0.15,1), opacity 200ms ease'
        cardRef.current.style.transform = `translate(${dxx}px, ${dyy}px) scale(${DRAWER.miniScale})`
      }
    })
    at(T.slideOut, () => {
      if (drawerRef.current) {
        drawerRef.current.style.transition = 'top 800ms cubic-bezier(0.4,0,1,1)'
        drawerRef.current.style.top = `${DRAWER.topOut}px`
      }
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 800ms cubic-bezier(0.4,0,1,1)'
        cardRef.current.style.transform = `translate(${dxx}px, ${dyy + 804}px) scale(${DRAWER.miniScale})`
      }
    })
    at(T.redirect, () => {
      if (fromJournal) {
        navigate(`${base}/journal`, { state: { enterAnim: true } })
      } else {
        studentStorage.setEnterAnim(true)
        navigate(base, { state: { enterAnim: true } })
      }
    })

    return () => timers.forEach((t) => window.clearTimeout(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="completed">
      {/* +1 spark badge */}
      <div
        ref={sparkRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: 148,
          transform: 'translateX(-50%) translateY(12px)',
          opacity: 0,
          transition: 'transform 350ms cubic-bezier(0.34,1.2,0.64,1), opacity 350ms ease',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 6,
        }}
      >
        <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, letterSpacing: '-0.8px', color: '#f2f3e5' }}>+1</span>
        <img src={studentAsset('spark-4.svg')} alt="spark" style={{ width: 32, height: 32, display: 'block' }} />
      </div>

      {/* Completed! text */}
      <p
        ref={textRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: 614,
          transform: 'translateX(-50%) translateY(16px)',
          opacity: 0,
          transition: 'transform 600ms cubic-bezier(0.4,0,1,1), opacity 400ms ease',
          margin: 0,
          fontFamily: 'var(--font-student-display)',
          fontWeight: 400,
          fontSize: 80,
          lineHeight: '106%',
          color: '#f2f3e5',
          zIndex: 6,
        }}
      >
        Completed!
      </p>

      {/* Drawer (szuflada) with pre-filled mini cards */}
      <div
        ref={drawerRef}
        style={{ position: 'absolute', left: DRAWER.left, top: DRAWER.topOut, width: 635, height: 817, zIndex: 5, transition: 'top 800ms cubic-bezier(0.4,0,0.2,1)' }}
      >
        <img src={studentAsset('szuflada.svg')} alt="" style={{ width: 635, height: 817, display: 'block' }} />
        {preFill.map((c) => (
          <div
            key={c.section}
            style={{ position: 'absolute', left: DRAWER.colX[c.col], top: DRAWER.rowY[0], width: DRAWER.miniW, height: DRAWER.miniH, borderRadius: 9.26, overflow: 'hidden' }}
          >
            <img src={studentAsset(c.svg)} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />
          </div>
        ))}
      </div>

      {/* Flying card */}
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left: DRAWER.cardLeft,
          top: DRAWER.cardTop,
          width: DRAWER.cardW,
          height: DRAWER.cardH,
          borderRadius: 19,
          overflow: 'hidden',
          transformOrigin: 'top left',
          transform: 'translateY(16px)',
          opacity: 0,
          transition: 'transform 480ms cubic-bezier(0.34,1.2,0.64,1), opacity 300ms ease',
          zIndex: 10,
        }}
      >
        <img src={studentAsset(cfg.svg)} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />
      </div>
    </StudentStage>
  )
}
