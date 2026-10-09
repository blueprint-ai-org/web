import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { GOOGLY_WANDER_MONSTER_M01, GooglyEyes, type GooglyEye } from './GooglyEyes'
import { CtaButton, OnboardingStage, TitleXL } from './OnboardingChrome'
import { OB_EASE_EXIT, OB_EASE_REVEAL, OB_EASE_SOFT } from './transitions'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `complete` (prototype `#s7`, `onboarding.html:1416-1456`).
 * "+10 Sparkz · Set-up Complete" with the crossfading spark badge and the
 * green monster message bubble (live googly eyes). "Start with Your Mood"
 * exits into the hub's mood check-in (`startMoodCheckin`, `:1966-1982`).
 *
 * Arriving from `trusted-person`, the big circle grows from the outgoing
 * ellipse's position/size (`slideS6toS7`, `:1714-1737`) and the bubble + CTA
 * stage in a beat later (`s7-phase2`, `:1772`). "Start with Your Mood" flies the
 * content up while the circle rises to fill the frame, then navigates
 * (`startMoodCheckin`). The circle rides {@link OnboardingStage}'s
 * `backgroundLayer` so it morphs/rises independently of the content wrapper.
 */

// monster-01 bubble eyes (`onboarding.html:1440-1446`), viewBox 0 0 40 40.
const M01_EYES: readonly GooglyEye[] = [
  { wcx: 16.299, wcy: 19.753, wrx: 3, wry: 4, pcx: 17.391, pcy: 19.762, pr: 2.1 },
  { wcx: 23.701, wcy: 19.753, wrx: 3, wry: 4, pcx: 24.769, pcy: 19.762, pr: 2.1 },
]

export function CompleteScreen() {
  const t = useOnboardingTransition('complete')

  /**
   * Mark onboarding done (D6), then play the exit.
   *
   * **This screen, not the mood check-in after it.** `complete` is the last
   * screen the onboarding owns; everything past it is the hub. Setting the flag
   * here means a user who closes the tab on the mood check-in comes back to the
   * hub rather than repeating nine screens — the flag records "you have been
   * introduced", not "you finished today's session".
   *
   * The write is fire-and-forget by design: `setOnboardingDone` swallows a
   * blocked/partitioned `localStorage` the way every accessor in that adapter
   * does, so a device that cannot store it simply sees onboarding again. That
   * is the correct failure for a device-scoped flag — never a blocked exit.
   */
  function finish() {
    studentStorage.setOnboardingDone(true)
    t.next()
  }

  // Circle: grows from the outgoing ellipse on enter (ellipse-morph), rises to
  // fill on the circle-rise exit into mood-checkin.
  let circleTransform = 'none'
  let circleTransition = 'none'
  if (t.motion.exit === 'circle-rise') {
    circleTransform = 'translateY(-688px)'
    circleTransition = `transform 800ms ${OB_EASE_EXIT}`
  } else if (t.motion.enterKind === 'ellipse-morph') {
    circleTransform = t.motion.entered
      ? 'translate(0px, 0px) scale(1)'
      : 'translate(-7px, -621px) scale(0.583)'
    circleTransition = `transform 800ms ${OB_EASE_REVEAL}`
  }

  const circle = (
    <div
      style={{
        position: 'absolute',
        left: -351,
        top: 150,
        width: 1910,
        height: 1910,
        borderRadius: '50%',
        background: '#1f1f25',
        pointerEvents: 'none',
        zIndex: 0,
        transformOrigin: 'center center',
        transform: circleTransform,
        transition: circleTransition,
      }}
    />
  )

  // Bubble + CTA arrive a beat after the title on the ellipse-morph enter
  // (prototype `s7-phase2`); on a direct load they are simply present.
  const staged = t.motion.enterKind === 'ellipse-morph'
  const lateStyle = staged
    ? {
        opacity: t.motion.phase2 ? 1 : 0,
        transform: t.motion.phase2 ? 'none' : 'translateY(16px)',
        transition: `opacity 400ms ease, transform 500ms ${OB_EASE_SOFT}`,
      }
    : undefined

  return (
    <OnboardingStage slug="complete" background="#3f50b8" motion={t.motion} backgroundLayer={circle}>
      <style>{SPARK_CSS}</style>

      <div style={{ position: 'absolute', left: 291, top: 253, width: 613, zIndex: 5, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 32,
              lineHeight: '40px',
              letterSpacing: '-0.8px',
              color: '#f2f3e5',
            }}
          >
            +10
          </span>
          <div className="ob-spark-badge">
            <img src={studentAsset('spark-4.svg')} alt="spark" />
            <img src={studentAsset('spark-01.svg')} alt="spark" />
            <img src={studentAsset('spark-02.svg')} alt="spark" />
            <img src={studentAsset('spark-03.svg')} alt="spark" />
          </div>
        </div>
        <TitleXL style={{ marginTop: 0 }}>
          Set-up
          <br />
          Complete
        </TitleXL>
      </div>

      {/* Green monster bubble */}
      <div
        style={{
          position: 'absolute',
          zIndex: 6,
          width: 395,
          padding: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: '#58b880',
          left: 400,
          top: 511,
          ...lateStyle,
        }}
      >
        <div style={{ width: 48, height: 48, overflow: 'hidden', flexShrink: 0, background: '#f2f3e5', position: 'relative' }}>
          <img src={studentAsset('monster-01.svg')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <GooglyEyes viewBox="0 0 40 40" eyes={M01_EYES} pupilFill="#36363F" wander={GOOGLY_WANDER_MONSTER_M01} />
        </div>
        <p
          style={{
            fontFamily: 'var(--font-student-body)',
            fontSize: 20,
            fontWeight: 500,
            color: '#2f2f37',
            lineHeight: '110%',
            paddingTop: 4,
            margin: 0,
          }}
        >
          You earned 10 Sparkz! Every time you check in and do an activity, you earn more.
        </p>
      </div>

      <CtaButton label="Start with Your Mood" onClick={finish} />
    </OnboardingStage>
  )
}

const SPARK_CSS = `
.ob-spark-badge { position: relative; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; }
.ob-spark-badge img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.ob-spark-badge img:nth-child(1) { animation: ob-spark-c1 6400ms linear 1600ms infinite; }
.ob-spark-badge img:nth-child(2) { opacity: 0; animation: ob-spark-c2 6400ms linear 1600ms infinite; }
.ob-spark-badge img:nth-child(3) { opacity: 0; animation: ob-spark-c3 6400ms linear 1600ms infinite; }
.ob-spark-badge img:nth-child(4) { opacity: 0; animation: ob-spark-c4 6400ms linear 1600ms infinite; }
@keyframes ob-spark-c1 { 0% { opacity: 1; } 25% { opacity: 0; } 75% { opacity: 0; } 100% { opacity: 1; } }
@keyframes ob-spark-c2 { 0% { opacity: 0; } 25% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 0; } }
@keyframes ob-spark-c3 { 0% { opacity: 0; } 50% { opacity: 1; } 75% { opacity: 0; } 100% { opacity: 0; } }
@keyframes ob-spark-c4 { 0% { opacity: 0; } 75% { opacity: 1; } 100% { opacity: 0; } }
`
