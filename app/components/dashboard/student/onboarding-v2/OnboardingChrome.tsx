import type { CSSProperties, ReactNode } from 'react'

import { SupportPanel } from '../chrome/SupportPanel'
import { useEnterAnimation } from '../hooks/useEnterAnimation'
import { StudentStage } from '../stage/StudentStage'

import { ONBOARDING_PROGRESS, type OnboardingSlug } from './steps'
import {
  OB_EASE_REVEAL,
  onboardingContentStyle,
  type OnboardingMotion,
} from './transitions'

/**
 * Shared chrome for the prototype onboarding screens: the 1194×834
 * {@link StudentStage} with a per-screen background colour, the fake status
 * bar, the shared progress bar, an in-page {@link SupportPanel}, and the
 * cross-screen enter/exit cinematics.
 *
 * Motion is supplied by {@link useOnboardingTransition} via the `motion` prop:
 * the content wrapper animates per {@link onboardingContentStyle} (slide /
 * curtain / clip-reveal / circle-rise), the stage background morphs on a
 * colour-morph exit, and the progress bar slides out on the `ellipse-morph`
 * exit (prototype `:1740-1742`). Screens with their own scenery (the
 * trusted-person ellipse, the complete circle) pass it via `backgroundLayer`
 * and drive it from the same `motion`. When `motion` is omitted the stage falls
 * back to a plain fade/rise enter.
 */

const CTA_BG = '#f2f3e5'
const CTA_FG = '#1f1f25'

export const onboardingTextStyles = {
  /** `.t-xl` — Title/Large (80px). */
  titleXL: {
    fontFamily: 'var(--font-student-display)',
    fontWeight: 400,
    fontSize: 80,
    lineHeight: '106%',
    letterSpacing: 0,
    color: '#f2f3e5',
    textAlign: 'center',
    margin: 0,
  } satisfies CSSProperties,
  /** `.t-lg` — Title/Medium (64px). */
  titleLG: {
    fontFamily: 'var(--font-student-display)',
    fontWeight: 400,
    fontSize: 64,
    lineHeight: '106%',
    letterSpacing: 0,
    color: '#f2f3e5',
    textAlign: 'center',
    margin: 0,
  } satisfies CSSProperties,
  /** `.t-body` — Subtitle/Small (20px). */
  body: {
    fontFamily: 'var(--font-student-body)',
    fontSize: 20,
    fontWeight: 500,
    lineHeight: '125%',
    letterSpacing: '-0.4px',
    color: '#f2f3e5',
    textAlign: 'center',
    margin: 0,
  } satisfies CSSProperties,
} as const

export function TitleXL({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ ...onboardingTextStyles.titleXL, ...style }}>{children}</p>
}

export function TitleLG({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ ...onboardingTextStyles.titleLG, ...style }}>{children}</p>
}

export function BodyText({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ ...onboardingTextStyles.body, ...style }}>{children}</p>
}

function OnboardingProgress({ width, slideOut }: { width: number; slideOut?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 219,
        width: 756,
        height: 4,
        background: '#444450',
        borderRadius: 99,
        overflow: 'hidden',
        zIndex: 20,
        pointerEvents: 'none',
        // On the trusted-person → complete exit the bar slides off the top
        // (prototype `prog.style.transform = translateY(-120px)`, `:1740-1742`).
        transform: slideOut ? 'translateY(-120px)' : 'none',
        transition: `transform 560ms ${OB_EASE_REVEAL}`,
      }}
    >
      <div
        style={{
          height: '100%',
          width,
          background: '#f2f3e5',
          borderRadius: 99,
          transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  )
}

export interface OnboardingStageProps {
  slug: OnboardingSlug
  /** Screen background colour (prototype's per-screen `#…` fill). */
  background: string
  /** Extra styles on the scaled inner frame (e.g. `overflow: visible`). */
  frameStyle?: CSSProperties
  /**
   * Enter/exit motion from {@link useOnboardingTransition}. Omit for a plain
   * fade/rise (the fallback used before the flow is wired to the hook).
   */
  motion?: OnboardingMotion
  /**
   * Scenery rendered BEHIND the content wrapper so it is not swept by the
   * content's slide/collapse transform — the trusted-person ellipse and the
   * complete circle, which the screen animates independently from `motion`.
   */
  backgroundLayer?: ReactNode
  children: ReactNode
}

export function OnboardingStage({
  slug,
  background,
  frameStyle,
  motion,
  backgroundLayer,
  children,
}: OnboardingStageProps) {
  // Fallback enter (plain fade/rise) when the screen supplies no `motion`.
  const fallback = useEnterAnimation({ enabled: true })
  const effectiveMotion: OnboardingMotion = motion ?? {
    enterKind: 'fade',
    entered: fallback.entered,
    phase2: fallback.phase2,
    exit: null,
  }

  const progress = ONBOARDING_PROGRESS[slug]
  // Colour-morph exit: the leaving stage bleeds to the next screen's background
  // so the incoming stage needs no hard cut (prototype `s2/s3/s5/s6` bg writes).
  const morphing = effectiveMotion.exit !== null && effectiveMotion.exitBg !== undefined
  const stageBg = morphing ? effectiveMotion.exitBg : background

  return (
    <StudentStage
      style={{
        backgroundColor: stageBg,
        transition: `background-color 560ms ${OB_EASE_REVEAL}`,
        ...frameStyle,
      }}
      data-testid={`onboarding-${slug}`}
    >
      {progress !== undefined && (
        <OnboardingProgress width={progress} slideOut={effectiveMotion.exit === 'ellipse-morph'} />
      )}
      {backgroundLayer}
      <div style={{ position: 'absolute', inset: 0, ...onboardingContentStyle(effectiveMotion) }}>
        {children}
      </div>
      <SupportPanel />
    </StudentStage>
  )
}

/** 20×20 chevron-back glyph (prototype `.btn-back` SVG). */
export function BackArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M13 4L7 10L13 16"
        stroke="#f2f3e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Single centred CTA button (`.btn-cta`), used by name / this-space / complete. */
export function CtaButton({
  label,
  onClick,
  width = 270,
  bottom = 64,
}: {
  label: string
  onClick: () => void
  width?: number
  bottom?: number
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width,
          height: 48,
          background: CTA_BG,
          color: CTA_FG,
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: '-0.1px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 1px 1px rgba(20,21,26,0.03)',
        }}
      >
        {label}
      </button>
    </div>
  )
}

/** Back (48×48 ghost) + Next (200×48 cream) row (`.nav`), used by the middle screens. */
export function NavRow({
  onBack,
  onNext,
  nextLabel = 'Next',
  backBackground = 'rgba(255,255,255,0.16)',
}: {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  backBackground?: string
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 64,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 20,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: backBackground,
          border: 'none',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <BackArrow />
      </button>
      <button
        type="button"
        onClick={onNext}
        style={{
          width: 200,
          height: 48,
          background: CTA_BG,
          color: CTA_FG,
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: '-0.1px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 1px 1px rgba(20,21,26,0.03)',
        }}
      >
        {nextLabel}
      </button>
    </div>
  )
}
