import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { SupportPanel } from '../chrome/SupportPanel'
import { Sidebar } from '../chrome/Sidebar'
import { useEnterAnimation } from '../hooks/useEnterAnimation'
import { useStudentProfile } from '../hooks/useStudentProfile'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { MoodOverlay, WinsOverlay } from './Overlays'
import { SpotlightTour } from './SpotlightTour'
import { SuccessTakeover } from './SuccessTakeover'
import { TodayCard } from './TodayCard'
import { ENTRY } from './today-data'
import { TODAY_CSS } from './today-styles'
import { useTodayState, type HubCard } from './useTodayState'

/**
 * `/student` Today hub (ports `today.html`). The card-queue home: sidebar, a
 * greeting + Sparkz header, the four monster cards (sleepy/hero/done with
 * googly eyes), a "View summary" footer, the support drawer, the mood/wins
 * done-card overlays, the all-done success takeover, and the first-launch
 * spotlight tour. Storage-driven state is hydrated once by {@link useTodayState}.
 * Client-only (see the route's `HydrateFallback`). Mounted at both `/student`
 * and `/preview/student` (separate index modules that both render this).
 */

export function TodayHub() {
  const init = useTodayState()
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const profile = useStudentProfile()

  const [overlay, setOverlay] = useState<'mood' | 'wins' | null>(null)
  const [showSuccess, setShowSuccess] = useState(init.showSuccess)

  // Entry choreography — off-screen until `entered` flips (double-rAF), then the
  // 300ms-delayed 800ms slide (`today:711-728`). No-op when not arriving via a
  // completed-card redirect / `bp_enter_anim`.
  const { entered } = useEnterAnimation({ enabled: init.entryAnim })
  const entryTransition = `transform ${ENTRY.durationMs}ms ${ENTRY.easing} ${ENTRY.delayMs}ms, opacity ${ENTRY.durationMs}ms ${ENTRY.easing} ${ENTRY.delayMs}ms`
  const entryStyle = (hidden: string): CSSProperties =>
    init.entryAnim
      ? { transform: entered ? 'none' : hidden, opacity: entered ? 1 : 0, transition: entryTransition }
      : {}

  const greetingTitle = init.allDone ? 'Today crushed!' : profile.greeting
  const greetingSub = init.allDone
    ? 'You woke them all up. Anything else on your mind today?'
    : 'Complete your cards — and find out something new about you.'

  function activate(card: HubCard) {
    if (card.state === 'done') {
      switch (card.def.doneAction) {
        case 'mood-overlay':
          setOverlay('mood')
          break
        case 'wins-overlay':
          setOverlay('wins')
          break
        case 'journal':
          studentStorage.promoteWriteTextToSession() // goJournal local→session hand-off
          navigate(`${base}/journal`)
          break
        case 'flow':
          if (card.def.flow) navigate(`${base}/${card.def.flow}`)
          break
      }
    } else if (card.def.flow) {
      navigate(`${base}/${card.def.flow}`) // sleepy / hero → open the flow
    }
  }

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="today-hub">
      <style>{TODAY_CSS}</style>

      <Sidebar />

      <main style={{ position: 'absolute', left: 152, top: 72, bottom: 0, width: 998, display: 'flex', flexDirection: 'column', gap: 48 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', ...entryStyle('translateY(-80px)') }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 64, lineHeight: 1.06, color: '#f2f3e5', margin: '0 0 16px' }}>
              {greetingTitle}
            </h1>
            <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, letterSpacing: '-0.1px', lineHeight: '20px', color: '#737472', margin: 0 }}>
              {greetingSub}
            </p>
          </div>
          <div
            style={{
              width: 237,
              background: '#1f1f25',
              border: '1px solid #444450',
              borderRadius: 20,
              padding: 36,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 12, fontWeight: 500, color: '#737472', lineHeight: '16px' }}>Total</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, lineHeight: '40px', letterSpacing: '-0.8px', color: '#f2f3e5' }}>
              {init.sparks}
              <img src={studentAsset('spark-4.svg')} alt="spark" style={{ width: 32, height: 32, flexShrink: 0, display: 'block' }} />
            </div>
          </div>
        </div>

        {/* Card row */}
        <div style={{ display: 'flex', gap: 16, ...entryStyle('translateY(120px)') }}>
          {init.cards.map((card) => (
            <TodayCard key={card.def.id} card={card.def} state={card.state} onActivate={() => activate(card)} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 63, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...entryStyle('translateY(120px)') }}>
          <button
            type="button"
            className="th-summary-btn"
            onClick={() => navigate(`${base}/summary`)}
            style={{
              height: 48,
              width: 200,
              padding: '0 24px',
              background: 'transparent',
              color: '#f5f5f5',
              fontFamily: 'var(--font-student-body)',
              fontSize: 16,
              fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            View summary
          </button>
        </div>
      </main>

      <SupportPanel />

      {overlay === 'mood' && <MoodOverlay onClose={() => setOverlay(null)} />}
      {overlay === 'wins' && <WinsOverlay onClose={() => setOverlay(null)} />}

      {showSuccess && <SuccessTakeover onDone={() => setShowSuccess(false)} />}

      <SpotlightTour enabled={!init.tourDone && !showSuccess} />
    </StudentStage>
  )
}
