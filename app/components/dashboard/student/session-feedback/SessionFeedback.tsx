import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'

import { useEnterAnimation } from '../hooks/useEnterAnimation'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { SF_ANSWERS, SF_COPY, SF_RESPONSES, type ResponseKey } from './session-feedback-data'
import { SESSION_FEEDBACK_CSS } from './session-feedback-styles'

/**
 * `/student/session-feedback` — the "Did it help?" session-feedback flow (ports
 * `session-feedback.html`). Four screens over a single stage:
 *  - the **question** screen (dark `#1f1f25`, yellow shell decoration): a video
 *    thumbnail + subtitle, the "Did it help?" title, three answer blocks, and a
 *    Save button that advances to the picked response;
 *  - three terminal **response** screens (yellow `#fdda3c`, shell decoration):
 *    a "+1 spark" reward, the response line, and a "Start with how you feel"
 *    button that exits to the mood check-in (`window.location='mood-checkin.html'`
 *    in the prototype → `navigate(\`${base}/mood-checkin\`)` here).
 *
 * Each screen's entrance reproduces the prototype's S7-style two-phase rise
 * (`q-entered`/`r-entered` → 300ms → `q-phase2`/`r-phase2`,
 * `session-feedback.html:190-227,341-352`) via the shared {@link useEnterAnimation}
 * hook (the same double-rAF idiom); only the active screen is mounted, and the
 * response screen is keyed so its entry re-fires on Save. Nothing persists — the
 * "+1" reward is decorative (no storage write). No inbound link in the prototype:
 * a direct-URL scenario.
 */

const BEZ = 'cubic-bezier(0.75,0,0.3,0.99)'
const REVEAL = `transform 800ms ${BEZ}, opacity 400ms ease`
/** `.q-bottom` lags `.q-top` by 100ms (`session-feedback.html:200`). */
const REVEAL_DELAYED = `transform 800ms ${BEZ} 100ms, opacity 400ms ease 100ms`

const QUESTION_BG = '#1f1f25'
const RESPONSE_BG = '#fdda3c'

const BTN_BASE: CSSProperties = {
  width: 270,
  height: 48,
  background: '#f2f3e5',
  border: 'none',
  borderRadius: 8,
  fontFamily: 'var(--font-student-body)',
  fontWeight: 500,
  fontSize: 16,
  letterSpacing: '-0.1px',
  color: '#1f1f25',
  boxShadow: '0 1px 1px rgba(20,21,26,0.03)',
  zIndex: 2,
}

type Screen = 'question' | ResponseKey

export function SessionFeedback() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [screen, setScreen] = useState<Screen>('question')

  const backgroundColor = screen === 'question' ? QUESTION_BG : RESPONSE_BG

  return (
    <StudentStage style={{ backgroundColor }} data-testid="session-feedback">
      <style>{SESSION_FEEDBACK_CSS}</style>

      {screen === 'question' ? (
        <QuestionScreen onSave={(key) => setScreen(key)} />
      ) : (
        <ResponseScreen
          key={screen}
          responseKey={screen}
          onStart={() => navigate(`${base}/mood-checkin`)}
        />
      )}
    </StudentStage>
  )
}

/** Screen 1 — "Did it help?" (session-feedback.html:236-273). */
function QuestionScreen({ onSave }: { onSave: (key: ResponseKey) => void }) {
  const { entered, phase2 } = useEnterAnimation({ enabled: true, phase2Delay: 300 })
  const [selected, setSelected] = useState<ResponseKey | null>(null)

  const riseStyle = (on: boolean, delayed = false): CSSProperties => ({
    transform: on ? 'translateY(0)' : 'translateY(400px)',
    opacity: on ? 1 : 0,
    transition: delayed ? REVEAL_DELAYED : REVEAL,
  })

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Yellow shell decoration (session-feedback.html:240-244) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 2892,
          height: 2544,
          left: 755,
          top: -20,
          transform: 'rotate(-120deg)',
          transformOrigin: 'center center',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <svg viewBox="0 0 1243 1087" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
          <path
            d="M621.5 0C964.745 0 1243 277.401 1243 619.59C1057.07 619.59 936.196 769.852 936.196 955.205C936.196 1022.9 936.196 1087 936.196 1087H306.804C306.804 1087 306.804 1022.9 306.804 955.205C306.804 769.852 185.924 619.59 0 619.59C0 277.401 278.254 0 621.5 0Z"
            fill="#fdda3c"
          />
        </svg>
      </div>

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          left: 213,
          top: 104,
          width: 769,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 64,
          zIndex: 2,
        }}
      >
        {/* Top group: thumbnail + subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, ...riseStyle(entered) }}>
          <div style={{ width: 160, height: 166, background: '#fef5cc', borderRadius: 13, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <img
              src={studentAsset('calming-breath-cover.png')}
              alt="Calming Breath"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <p
            style={{
              width: 278,
              margin: 0,
              fontFamily: 'var(--font-student-body)',
              fontWeight: 500,
              fontSize: 20,
              lineHeight: 1.1,
              letterSpacing: '-0.4px',
              color: '#f2f3e5',
              textAlign: 'center',
            }}
          >
            {SF_COPY.subtitle[0]}
            <br />
            {SF_COPY.subtitle[1]}
          </p>
        </div>

        {/* Bottom group: title + answer blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%', ...riseStyle(entered, true) }}>
          <h1
            style={{
              width: 613,
              margin: 0,
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 64,
              lineHeight: 1.06,
              letterSpacing: '1.5px',
              color: '#f2f3e5',
              textAlign: 'center',
            }}
          >
            {SF_COPY.title}
          </h1>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {SF_ANSWERS.map((answer) => (
              <button
                key={answer.key}
                type="button"
                className={`sf-block${selected === answer.key ? ' sf-selected' : ''}`}
                onClick={() => setSelected(answer.key)}
                style={{
                  width: 179,
                  height: 94,
                  background: '#2f2f37',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 10,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#1f1f25',
                    border: '1px solid rgba(92,92,101,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  {answer.icon}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-student-body)',
                    fontWeight: 700,
                    fontSize: 16,
                    lineHeight: '24px',
                    color: '#f2f3e5',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {answer.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        type="button"
        className="sf-btn"
        onClick={() => {
          if (selected) onSave(selected)
        }}
        style={{ position: 'absolute', top: 722, left: 462, ...BTN_BASE, ...riseStyle2(phase2) }}
      >
        {SF_COPY.save}
      </button>
    </div>
  )
}

/** The Save button's independent rise (translateY only, on `phase2`). */
function riseStyle2(on: boolean): CSSProperties {
  return {
    transform: on ? 'translateY(0)' : 'translateY(200px)',
    opacity: on ? 1 : 0,
    transition: REVEAL,
  }
}

/** Screens 2a/2b/2c — the terminal response screens (session-feedback.html:275-315). */
function ResponseScreen({ responseKey, onStart }: { responseKey: ResponseKey; onStart: () => void }) {
  const { entered, phase2 } = useEnterAnimation({ enabled: true, phase2Delay: 300 })
  const response = SF_RESPONSES[responseKey]

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Shell decoration (session-feedback.html:278) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 1400,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <img src={studentAsset('shell-new.svg')} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          left: 291,
          top: response.contentTop,
          width: 613,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
          zIndex: 2,
          transform: entered ? 'translateY(0)' : 'translateY(400px)',
          opacity: entered ? 1 : 0,
          transition: REVEAL,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 32,
              lineHeight: '40px',
              letterSpacing: '-0.8px',
              color: '#f2f3e5',
              whiteSpace: 'nowrap',
            }}
          >
            {response.reward}
          </span>
          <img src={studentAsset('spark.svg')} alt="" style={{ width: 32, height: 32, display: 'block' }} />
        </div>

        <h1
          style={{
            margin: 0,
            width: 613,
            fontFamily: 'var(--font-student-display)',
            fontWeight: 400,
            fontSize: 64,
            lineHeight: 1.06,
            letterSpacing: '1.5px',
            color: '#f2f3e5',
            textAlign: 'center',
          }}
        >
          {response.text}
        </h1>
      </div>

      {/* "Start with how you feel" button */}
      <button
        type="button"
        className="sf-btn"
        onClick={onStart}
        style={{
          position: 'absolute',
          top: 722,
          left: '50%',
          ...BTN_BASE,
          transform: phase2 ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(200px)',
          opacity: phase2 ? 1 : 0,
          transition: REVEAL,
        }}
      >
        {SF_COPY.startButton}
      </button>
    </div>
  )
}
