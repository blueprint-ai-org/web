import { useState } from 'react'
import type { CSSProperties } from 'react'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { NavRow, OnboardingStage } from './OnboardingChrome'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `privacy` (prototype `#s2`, `onboarding.html:1046-1101`).
 * Privacy toggle cards (Mood, Class stats) + a locked "always private" Journal
 * card. On Next, the toggle states persist to `bp_privacy_1` / `bp_privacy_2`
 * (prototype only toggled the UI; the write is the storage-adapter seam).
 * Back → `sharing`, Next → `avatar`.
 */

const pcardStyle: CSSProperties = {
  background: '#1f1f25',
  border: '1px solid #444450',
  borderRadius: 20,
  padding: '20px 24px',
}
const pcardHdr: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: 12,
  marginBottom: 12,
  borderBottom: '1px solid #444450',
}
const pcardLbl: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#a4a59f',
  lineHeight: '20px',
  letterSpacing: '-0.1px',
}
const pcardBody: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#f2f3e5',
  lineHeight: 1.35,
  letterSpacing: '-0.1px',
  margin: 0,
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
    >
      <span
        style={{
          fontFamily: 'var(--font-student-body)',
          fontSize: 10,
          fontWeight: 500,
          color: '#a4a59f',
          letterSpacing: '0.1px',
        }}
      >
        {on ? 'ON' : 'OFF'}
      </span>
      <div className={`ob-toggle${on ? '' : ' off'}`} />
    </div>
  )
}

export function PrivacyScreen() {
  const t = useOnboardingTransition('privacy')
  const [mood, setMood] = useState(true)
  const [classStats, setClassStats] = useState(true)

  const submit = () => {
    if (t.isLeaving) return
    studentStorage.setPrivacy(1, mood)
    studentStorage.setPrivacy(2, classStats)
    t.next()
  }

  return (
    <OnboardingStage slug="privacy" background="#58b880" motion={t.motion}>
      <style>{TOGGLE_CSS}</style>

      <img
        src={studentAsset('shield.svg')}
        alt=""
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) scale(1.2)',
          width: 900,
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 0 112px',
        }}
      >
        <div style={{ width: 660 }}>
          <p
            style={{
              fontFamily: 'var(--font-student-body)',
              fontSize: 20,
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: '-0.4px',
              color: '#f2f3e5',
              textAlign: 'center',
              width: 244,
              margin: '0 auto 24px',
            }}
          >
            Select privacy settings
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 500, margin: '0 auto' }}>
            <div style={pcardStyle}>
              <div style={pcardHdr}>
                <span style={pcardLbl}>Mood</span>
                <Toggle on={mood} onToggle={() => setMood((v) => !v)} />
              </div>
              <p style={pcardBody}>
                {mood ? 'Sharing weekly patterns, not daily moods.' : 'Keep them private'}
              </p>
            </div>

            <div style={pcardStyle}>
              <div style={pcardHdr}>
                <span style={pcardLbl}>Class stats</span>
                <Toggle on={classStats} onToggle={() => setClassStats((v) => !v)} />
              </div>
              <p style={pcardBody}>
                {classStats ? 'Helping your teacher understand the class.' : 'Keep your answers private'}
              </p>
            </div>

            <div style={pcardStyle}>
              <div style={pcardHdr}>
                <span style={pcardLbl}>Journal</span>
                <div style={{ width: 32, height: 32, background: '#444450', borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="8" rx="2" fill="#a4a59f" />
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="#a4a59f" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              </div>
              <p style={pcardBody}>Always private</p>
            </div>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-student-body)',
              fontSize: 12,
              color: '#a4a59f',
              textAlign: 'center',
              marginTop: 16,
              lineHeight: '16px',
            }}
          >
            Change your choices anytime.
          </p>
        </div>
      </div>

      <NavRow onBack={t.back} onNext={submit} />
    </OnboardingStage>
  )
}

const TOGGLE_CSS = `
.ob-toggle {
  width: 32px; height: 20px; background: #58b880;
  border-radius: 99px; position: relative; flex-shrink: 0; cursor: pointer;
  transition: background 220ms cubic-bezier(0.4, 0, 0.2, 1);
}
.ob-toggle::after {
  content: ''; position: absolute; right: 2px; top: 2px;
  width: 16px; height: 16px; background: #fff; border-radius: 50%;
  transition: right 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ob-toggle.off { background: #444450; }
.ob-toggle.off::after { right: calc(100% - 18px); }
`
