import type { CSSProperties } from 'react'

import type { OnboardingSlug } from './steps'

/**
 * Cross-screen onboarding cinematics (Phase 4B).
 *
 * The prototype (`onboarding.html`) is a single page where the outgoing and
 * incoming screens animate simultaneously in one DOM (`slideS1toS2` …
 * `curtainS4toS5` `:1541-1692`, `slideS5toS6`/`slideS6toS7` ellipse morphs
 * `:1694-1829`, `startMoodCheckin` circle-rise `:1966-1982`). Here each screen
 * is its own React Router route, so a single dual-screen animation is
 * re-expressed as an **exit phase** on the leaving screen followed by an
 * **enter phase** on the arriving one, coordinated through `location.state`
 * (`obEnter`, see {@link useOnboardingNav}) — no full-page `window.location`.
 *
 * `useOnboardingTransition` owns the timing; this module owns the pure geometry:
 * the per-edge kind + duration, and the content-wrapper style for each phase.
 */

export type OnboardingTransition =
  | 'fade'
  | 'slide'
  | 'curtain-reveal'
  | 'curtain-collapse'
  | 'ellipse-scale'
  | 'ellipse-morph'
  | 'circle-rise'

// Prototype easing tokens (`onboarding.html`): reveal `:1547`, exit `:1880`,
// soft `:2053` (also the `--ease-student-soft` token in `app.css`).
export const OB_EASE_REVEAL = 'cubic-bezier(0.81, 0, 0.26, 0.98)'
export const OB_EASE_EXIT = 'cubic-bezier(0.75, 0, 0.3, 0.99)'
export const OB_EASE_SOFT = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Exit-phase duration (ms) — how long the leaving screen animates before the client navigation fires. */
export const OB_EXIT_MS: Record<OnboardingTransition, number> = {
  fade: 200,
  slide: 440,
  'curtain-reveal': 460,
  'curtain-collapse': 460,
  'ellipse-scale': 440,
  'ellipse-morph': 560,
  'circle-rise': 800,
}

/** Enter-phase duration (ms) for the content wrapper of the arriving screen. */
const OB_ENTER_MS: Record<OnboardingTransition, number> = {
  fade: 500,
  slide: 560,
  'curtain-reveal': 760,
  'curtain-collapse': 560,
  'ellipse-scale': 560,
  'ellipse-morph': 620,
  'circle-rise': 500,
}

export interface OnboardingForwardEdge {
  /** Next slug, or `'mood'` for the final exit into `/student/mood-checkin`. */
  to: OnboardingSlug | 'mood'
  /** Cinematic played on both the exit (leaving) and enter (arriving) sides. */
  kind: OnboardingTransition
  /**
   * Colour the LEAVING stage morphs to during a colour-morph slide (prototype
   * `s2/s3/s5/s6 backgroundColor` writes). Equals the arriving screen's own
   * background, so the incoming stage needs no cut.
   */
  exitBg?: string
}

/**
 * Forward edge per screen — which cinematic the "Next"/CTA plays. Mirrors the
 * prototype button wiring (`onboarding.html:1015-1453`):
 *  - this-space→sharing clip-reveal from bottom (`goTo(1)` `:1844-1871`)
 *  - sharing→privacy    horizontal slide (`slideS1toS2`)
 *  - privacy→avatar     slide + bg-morph to #3f50b8 (`slideS2toS3`)
 *  - avatar→baseline    slide + bg-morph to #1f1f25 (`slideS3toS4`)
 *  - baseline→helpers   scaleX curtain collapse (`curtainS4toS5`)
 *  - helpers→trusted    slide + bg-morph to #b38aff + ellipse scale (`slideS5toS6`)
 *  - trusted→complete   slide-up + bg-morph to #3f50b8 + ellipse morph (`slideS6toS7`)
 *  - complete→mood      circle-rise exit (`startMoodCheckin`)
 */
export const OB_FORWARD: Record<OnboardingSlug, OnboardingForwardEdge> = {
  'this-space': { to: 'sharing', kind: 'curtain-reveal' },
  sharing: { to: 'privacy', kind: 'slide' },
  privacy: { to: 'avatar', kind: 'slide', exitBg: '#3f50b8' },
  avatar: { to: 'baseline-mood', kind: 'slide', exitBg: '#1f1f25' },
  'baseline-mood': { to: 'helpers', kind: 'curtain-collapse' },
  helpers: { to: 'trusted-person', kind: 'ellipse-scale', exitBg: '#b38aff' },
  'trusted-person': { to: 'complete', kind: 'ellipse-morph', exitBg: '#3f50b8' },
  complete: { to: 'mood', kind: 'circle-rise' },
}

export function isOnboardingTransition(v: unknown): v is OnboardingTransition {
  return (
    v === 'fade' ||
    v === 'slide' ||
    v === 'curtain-reveal' ||
    v === 'curtain-collapse' ||
    v === 'ellipse-scale' ||
    v === 'ellipse-morph' ||
    v === 'circle-rise'
  )
}

/** Motion state a screen threads into {@link OnboardingStage} + its own scenery. */
export interface OnboardingMotion {
  /** Cinematic that brought the screen in (`location.state.obEnter`, else `'fade'`). */
  enterKind: OnboardingTransition
  /** `true` once the double-rAF enter has fired (drives enter → rest). */
  entered: boolean
  /** `true` a beat after `entered` — staggers late scenery (complete's bubble/CTA). */
  phase2: boolean
  /** Active exit cinematic while leaving, else `null`. */
  exit: OnboardingTransition | null
  /** Colour the stage morphs to during a colour-morph exit. */
  exitBg?: string
}

/** Full-frame screen width in stage-local px (the 1194×834 canvas). */
const STAGE_W = 1194
const STAGE_H = 834

/**
 * Style for the OnboardingStage content wrapper (the `absolute inset-0` layer
 * that holds the screen body). Exit takes precedence over enter.
 */
export function onboardingContentStyle(m: OnboardingMotion): CSSProperties {
  if (m.exit) return exitStyle(m.exit)
  return enterStyle(m.enterKind, m.entered)
}

function exitStyle(kind: OnboardingTransition): CSSProperties {
  const ms = OB_EXIT_MS[kind]
  switch (kind) {
    case 'slide':
    case 'ellipse-scale':
      // Content slides off to the left (`s?-slide → translateX(-1194px)`).
      return {
        transform: `translateX(-${STAGE_W}px)`,
        transition: `transform ${ms}ms ${OB_EASE_REVEAL}`,
      }
    case 'curtain-collapse':
      // Content collapses to the centre line (`s4-slide → scaleX(0)`).
      return {
        transform: 'scaleX(0)',
        transformOrigin: '50% 50%',
        transition: `transform ${ms}ms ${OB_EASE_REVEAL}`,
      }
    case 'ellipse-morph':
      // Text + nav slide up (`s6-slide → translateY(834px)` up in our split).
      return {
        transform: `translateY(-${STAGE_H}px)`,
        transition: `transform ${ms}ms ${OB_EASE_REVEAL}`,
      }
    case 'circle-rise':
      // All content flies up as the circle rises (`s7-exiting`, `:1970-1971`).
      return {
        transform: 'translateY(-180px)',
        opacity: 0,
        transition: `transform ${ms}ms ${OB_EASE_EXIT}, opacity 480ms ease`,
      }
    case 'curtain-reveal':
      // S0 elements exit upward before S1 reveals (`s0.exiting`, `:1850`).
      return {
        transform: 'translateY(-36px)',
        opacity: 0,
        transition: `transform ${ms}ms ${OB_EASE_EXIT}, opacity ${ms}ms ease`,
      }
    case 'fade':
    default:
      return { opacity: 0, transition: `opacity ${ms}ms ease` }
  }
}

function enterStyle(kind: OnboardingTransition, entered: boolean): CSSProperties {
  const ms = OB_ENTER_MS[kind]
  switch (kind) {
    case 'slide':
    case 'curtain-collapse':
    case 'ellipse-scale':
      // Content slides in from the right (`s?-slide: translateX(1194px) → 0`).
      return {
        transform: entered ? 'translateX(0)' : `translateX(${STAGE_W}px)`,
        transition: `transform ${ms}ms ${OB_EASE_REVEAL}`,
      }
    case 'ellipse-morph':
      // Content rises from the bottom (`s7-slide: translateY(834px) → 0`).
      return {
        transform: entered ? 'translateY(0)' : `translateY(${STAGE_H}px)`,
        transition: `transform ${ms}ms ${OB_EASE_REVEAL}`,
      }
    case 'curtain-reveal':
      // Screen wipes up from the bottom (`clip-path inset(834px…) → inset(0…)`).
      return {
        clipPath: entered ? 'inset(0 0 0 0)' : `inset(${STAGE_H}px 0 0 0)`,
        transition: `clip-path ${ms}ms ${OB_EASE_REVEAL}`,
      }
    case 'circle-rise':
    case 'fade':
    default:
      return {
        opacity: entered ? 1 : 0,
        transform: entered ? 'none' : 'translateY(12px)',
        transition: `opacity 400ms ease, transform ${ms}ms ${OB_EASE_SOFT}`,
      }
  }
}
