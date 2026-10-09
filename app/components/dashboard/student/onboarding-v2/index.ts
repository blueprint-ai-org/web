/**
 * Prototype onboarding flow (v2) — the 9-screen port of `onboarding.html`.
 * Screens + shared chrome, the cross-screen transition cinematics (Phase 4B),
 * nav, step config, and the rAF googly-eye overlay. Route modules live at
 * `app/routes/student.onboarding.*`.
 */
export { ThisSpaceScreen } from './ThisSpaceScreen'
export { SharingScreen } from './SharingScreen'
export { PrivacyScreen } from './PrivacyScreen'
export { AvatarScreen } from './AvatarScreen'
export { BaselineMoodScreen } from './BaselineMoodScreen'
export { HelpersScreen } from './HelpersScreen'
export { TrustedPersonScreen } from './TrustedPersonScreen'
export { CompleteScreen } from './CompleteScreen'

export { OnboardingStage } from './OnboardingChrome'
export { useOnboardingNav } from './useOnboardingNav'
export { useOnboardingTransition } from './useOnboardingTransition'
export { type OnboardingTransition } from './transitions'
export {
  ONBOARDING_SLUGS,
  ONBOARDING_FIRST,
  ONBOARDING_FIRST_PATH,
  ONBOARDING_PROGRESS,
  type OnboardingSlug,
} from './steps'
