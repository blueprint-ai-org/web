import type { CSSProperties } from 'react'

import { studentAsset } from '~/assets/student-app'

import { GOOGLY_WANDER_CARD, GooglyEyes, type GooglyEye } from './GooglyEyes'
import { BodyText, CtaButton, OnboardingStage, TitleXL } from './OnboardingChrome'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `this-space` (prototype `#s0`, `onboarding.html:963-1017`).
 * The welcome screen — rotated, CSS-rocking challenge cards with live googly
 * eyes (`obRaf` pupil wander) over a polygon field. "Get started" → `sharing`
 * plays the clip-reveal exit into the sharing screen.
 */

// s0 card eye geometry (`onboarding.html:969-1005`), viewBox 0 0 237 353.
const CARD_EYES_MID: readonly GooglyEye[] = [
  { wcx: 102.92, wcy: 116.016, wrx: 13.4, wry: 17.866, pcx: 102.92, pcy: 124.77, pr: 9.38 },
  { wcx: 135.079, wcy: 116.016, wrx: 13.4, wry: 17.866, pcx: 135.079, pcy: 124.77, pr: 9.38 },
]
const CARD_EYES_BLUE: readonly GooglyEye[] = [
  { wcx: 102.92, wcy: 110.866, wrx: 13.4, wry: 17.866, pcx: 102.92, pcy: 119.62, pr: 9.38 },
  { wcx: 135.079, wcy: 110.866, wrx: 13.4, wry: 17.866, pcx: 135.079, pcy: 119.621, pr: 9.38 },
]

interface CardSpec {
  asset: string
  eyes: readonly GooglyEye[]
  pupilFill: string
  delay: number
  wrap: CSSProperties
}

const CARDS: readonly CardSpec[] = [
  {
    asset: 'karta-02.svg',
    eyes: CARD_EYES_MID,
    pupilFill: '#7040C8',
    delay: 0,
    wrap: { left: 400, top: 30, transform: 'translate(-50%, -50%) rotate(165deg)' },
  },
  {
    asset: 'karta-03.svg',
    eyes: CARD_EYES_MID,
    pupilFill: '#1A5E36',
    delay: 400,
    wrap: { left: 1160, top: 567, transform: 'translate(-50%, -50%) rotate(-60deg)' },
  },
  {
    asset: 'karta-01.svg',
    eyes: CARD_EYES_BLUE,
    pupilFill: '#3F50B8',
    delay: 900,
    wrap: { left: 60, top: 530, transform: 'translate(-50%, -50%) rotate(68.64deg)' },
  },
]

export function ThisSpaceScreen() {
  const t = useOnboardingTransition('this-space')

  // No `frameStyle` override: the stage keeps its own `overflow: hidden`. The
  // three cards are positioned to hang off the frame edges (`left: 400, top: 30`
  // puts the purple one half above the top) and the polygon is 1474×1474 at
  // `left: -140, top: -420` — all of it is meant to be cropped by the frame,
  // exactly as the prototype's `.screen { overflow: hidden }` (`onboarding.html:28-33`)
  // crops `.cc-purple` / `.cc-green` / `.cc-blue` at the same coordinates. An
  // earlier port set `overflow: visible` here, which let the cards — and the
  // SupportPanel — render outside the stage.
  return (
    <OnboardingStage slug="this-space" background="#3f50b8" motion={t.motion}>
      <style>{CARD_ROCK_CSS}</style>

      <img
        src={studentAsset('backgrounds/polygon.svg')}
        alt=""
        style={{
          position: 'absolute',
          width: 1474,
          height: 1474,
          left: -140,
          top: -420,
          transform: 'rotate(-70.64deg) scale(0.91)',
          transformOrigin: '737px 737px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {CARDS.map((card) => (
        <div
          key={card.asset}
          style={{
            position: 'absolute',
            width: 237,
            height: 353,
            zIndex: 3,
            pointerEvents: 'none',
            ...card.wrap,
          }}
        >
          <img
            src={studentAsset(card.asset)}
            alt=""
            className="ob-card-rock"
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', animationDelay: `${card.delay}ms` }}
          />
          <GooglyEyes
            className="ob-card-rock"
            viewBox="0 0 237 353"
            eyes={card.eyes}
            pupilFill={card.pupilFill}
            wander={GOOGLY_WANDER_CARD}
            style={{ animationDelay: `${card.delay}ms`, transformOrigin: 'center center' }}
          />
        </div>
      ))}

      <div style={{ position: 'absolute', left: 247, top: 316, width: 700, zIndex: 5 }}>
        <TitleXL style={{ width: 620, margin: '0 auto 24px' }}>
          This space
          <br />
          is for you
        </TitleXL>
        <BodyText style={{ width: 370, margin: '0 auto' }}>
          For good days. For weird days.
          <br />
          Feel. Reflect. Get support.
        </BodyText>
      </div>

      <CtaButton label="Get started" onClick={t.next} />
    </OnboardingStage>
  )
}

const CARD_ROCK_CSS = `
.ob-card-rock {
  animation: ob-card-rock 2.6s cubic-bezier(0.56, -0.01, 0.38, 1.01) infinite;
  transform-origin: center center;
}
@keyframes ob-card-rock {
  0%   { transform: rotate(0deg); }
  30%  { transform: rotate(0deg); animation-timing-function: cubic-bezier(0.56, -0.01, 0.38, 1.01); }
  61%  { transform: rotate(15deg); animation-timing-function: cubic-bezier(0.56, -0.01, 0.38, 1.01); }
  100% { transform: rotate(0deg); }
}
`
