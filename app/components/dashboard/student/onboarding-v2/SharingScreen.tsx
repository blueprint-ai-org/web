import { studentAsset } from '~/assets/student-app'

import { BodyText, NavRow, OnboardingStage, TitleXL } from './OnboardingChrome'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `sharing` (prototype `#s1`, `onboarding.html:1023-1040`).
 * "You choose what to share" intro over the shield field. No storage writes.
 * Back → `this-space`, Next → `privacy`.
 */
export function SharingScreen() {
  const t = useOnboardingTransition('sharing')

  return (
    <OnboardingStage slug="sharing" background="#58b880" motion={t.motion}>
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

      <div style={{ position: 'absolute', left: 316, top: 295, width: 560, zIndex: 5, textAlign: 'center' }}>
        <TitleXL style={{ margin: '0 0 24px' }}>
          You choose
          <br />
          what to share
        </TitleXL>
        <BodyText style={{ maxWidth: 360, margin: '0 auto' }}>
          If someone may be unsafe, we may contact a trusted adult.
        </BodyText>
      </div>

      <NavRow onBack={t.back} onNext={t.next} />
    </OnboardingStage>
  )
}
