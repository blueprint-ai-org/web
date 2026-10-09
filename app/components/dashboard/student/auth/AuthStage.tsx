import { useCallback, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Link } from 'react-router'

import { studentAsset } from '~/assets/student-app'

import { useEnterAnimation } from '../hooks/useEnterAnimation'
import {
  GOOGLY_WANDER_MONSTER_M01,
  GooglyEyes,
  type GooglyEye,
} from '../onboarding-v2/GooglyEyes'
import {
  onboardingContentStyle,
  type OnboardingMotion,
} from '../onboarding-v2/transitions'
import { StudentStage } from '../stage/StudentStage'

/**
 * The stage the two auth screens render in — {@link OnboardingStage}
 * (`onboarding-v2/OnboardingChrome.tsx:134-176`) with two deliberate omissions.
 *
 * What it keeps, because that is what makes the screens read as native: the
 * fixed 1194×834 {@link StudentStage} artboard on a solid per-screen
 * background, one absolutely-positioned centred content layer, and the
 * double-`requestAnimationFrame` enter animation.
 *
 * **What it omits, and why:**
 *
 * - **`OnboardingProgress`** — there is no progress through auth. A progress
 *   bar on a login screen would be measuring a journey of one step, and the
 *   onboarding bar's percentages come from `ONBOARDING_PROGRESS`, a map keyed
 *   by onboarding slug that has no honest entry for `login`.
 * - **`SupportPanel`** — the support drawer talks to a session. A logged-out
 *   visitor has none, so every affordance behind it would either 401 or lie.
 *
 * **Motion is a prop, not internal state**, exactly as `OnboardingStage` takes
 * it. The screens need the same `{ entered, phase2 }` pair for their own
 * staggered elements (the mascot, the CTA), so owning a second
 * `useEnterAnimation` in here would mean two independent double-rAF clocks
 * drifting against each other. One hook in the screen, threaded down, cannot
 * drift. Omit `motion` and the stage falls back to a plain fade/rise — the same
 * fallback `OnboardingStage` uses, computed by the same
 * {@link onboardingContentStyle}, so the two cannot diverge.
 */

/**
 * Every auth screen's background — `NameScreen`'s exact `#131318`
 * (`NameScreen.tsx:24`).
 *
 * A raw literal, unlike everything in `AuthPrimitives.tsx`, and deliberately
 * so: **stage backgrounds are literals by convention in this flow** — all nine
 * onboarding screens pass one (`#3f50b8`, `#58b880`, `#b38aff`, `#1f1f25`,
 * `#131318`) and not one of those five values has a token. `#131318` in
 * particular has no equivalent in `app.css`; the nearest is
 * `--color-student-bg-darkest` (`#14141a`), which is a *different* colour.
 * Matching the screen the user was on a moment ago beats token purity for the
 * one value that decides whether these screens look like they belong.
 */
const AUTH_BG = '#131318'

export interface AuthStageProps {
  /** Identifies the screen for QA: renders as `data-testid="auth-<slug>"`. */
  slug: 'login' | 'signup' | 'invite'
  /**
   * Enter motion from the screen's own `useEnterAnimation`. Omit for the plain
   * fade/rise fallback.
   */
  motion?: OnboardingMotion
  /** Stage background. Defaults to {@link AUTH_BG}. */
  background?: string
  children: ReactNode
}

export function AuthStage({ slug, motion, background = AUTH_BG, children }: AuthStageProps) {
  // Fallback for a screen that supplies no `motion` — mirrors
  // `OnboardingStage`'s own fallback rather than inventing a second idiom.
  const fallback = useEnterAnimation({ enabled: true })
  const effectiveMotion: OnboardingMotion =
    motion ?? { enterKind: 'fade', entered: fallback.entered, phase2: fallback.phase2, exit: null }

  return (
    <StudentStage
      style={{ backgroundColor: background }}
      data-testid={`auth-${slug}`}
      // Scopes the screens' hover/shake CSS (see `authScreenCss`) so neither
      // rule can reach a button or column outside an auth stage.
      className="auth-screen"
    >
      <div style={{ position: 'absolute', inset: 0, ...onboardingContentStyle(effectiveMotion) }}>
        {children}
      </div>
    </StudentStage>
  )
}

/* ── Shared screen chrome ─────────────────────────────────────────────────────
 * The auth analogue of `OnboardingChrome.tsx`: the stage above, plus the type
 * presets, the mascot and the two motion details both screens share. Keeping
 * them here is what lets `LoginScreen` / `SignupScreen` stay what the plan asks
 * for — structural copies of `NameScreen`, not two copies of each other.
 */

/**
 * The two motion details the screens add on top of the stage's enter animation.
 * Hand-rolled CSS keyframes in a scoped `<style>`, the idiom used by
 * `CompleteScreen.tsx:145-158`, `mood-styles.ts` and friends — no animation
 * library is installed and this phase does not add one.
 *
 * **The hover spring** is `AvatarScreen`'s exact easing and duration
 * (`AvatarScreen.tsx:136,143` — `transform 120ms cubic-bezier(0.34,1.56,0.64,1)`),
 * scaled 1.04 rather than that screen's 1.06: the same overshoot on a 270×48
 * pill travels ~11px of width, which reads as a lurch where it reads as a bounce
 * on a 140px circle.
 *
 * `!important` is load-bearing on exactly one property and nowhere else.
 * `AuthCta` sets `transition: 'opacity 140ms ease'` **inline** (`AuthPrimitives.tsx`),
 * and an inline declaration outranks any stylesheet selector — so without it
 * the `:hover` transform still applies but snaps instead of springing, which is
 * the entire point of the detail. The alternative was widening `AuthCta`'s
 * public API to take a `className`, i.e. editing a reviewed Phase 5 primitive
 * for a caller-specific hover. One scoped `!important` is the smaller change.
 *
 * **The shake** is `mood-styles.ts:44-45`'s `mc-em-shake` verbatim — same
 * 480ms, same `cubic-bezier(0.36,0.07,0.19,0.97)`, same
 * 15/30/45/60/75% keyframe stops and decaying 8→6→5→4→2px amplitude, same
 * `both` fill. The one change is the axis: that keyframe nudges an emotion grid
 * on Y, and a rejected form column shakes its head on X. `prefers-reduced-motion`
 * drops it entirely rather than softening it — a shake carries no information
 * the inline error messages do not already carry in text.
 */
export const AUTH_SCREEN_CSS = `
.auth-screen button[data-testid="auth-cta"] {
  transition: transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 140ms ease !important;
}
.auth-screen button[data-testid="auth-cta"]:hover:not(:disabled) { transform: scale(1.04); }
@keyframes auth-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-8px); }
  30% { transform: translateX(6px); }
  45% { transform: translateX(-5px); }
  60% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
}
.auth-shake { animation: auth-shake 480ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
@media (prefers-reduced-motion: reduce) {
  .auth-screen button[data-testid="auth-cta"]:hover:not(:disabled) { transform: none; }
  .auth-shake { animation: none; }
}
`

/**
 * Replay the shake on the element the ref is attached to.
 *
 * The class is removed, a layout read forces a reflow, then it is re-added —
 * without that read the browser coalesces remove+add into no change at all and
 * a second failed submit sits perfectly still. This is the same
 * remove → reflow → add → `animationend` cleanup dance as
 * `EmotionPicker.tsx:44-47`, which is where the idiom in this codebase comes
 * from; only the reflow is spelled out differently (a `void offsetWidth` read
 * rather than that file's double `requestAnimationFrame`, because a shake must
 * land on the same frame as the error message it accompanies).
 */
export function useAuthShake(): {
  ref: RefObject<HTMLDivElement | null>
  shake: () => void
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const shake = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('auth-shake')
    void el.offsetWidth
    el.classList.add('auth-shake')
    el.addEventListener('animationend', () => el.classList.remove('auth-shake'), { once: true })
  }, [])
  return { ref, shake }
}

/**
 * The "SPARKZ EQ" eyebrow — `NameScreen.tsx:38-52` verbatim: Barlow 13/600,
 * `#58b880` (via `--color-student-green-300`, the token for that literal),
 * 2px tracking, uppercase, 28px below.
 */
export function AuthEyebrow() {
  return (
    <p
      style={{
        fontFamily: 'var(--font-student-body)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-student-green-300)',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        margin: '0 0 28px',
      }}
    >
      Sparkz EQ
    </p>
  )
}

/**
 * The Anton 80px title — `NameScreen.tsx:53-64` / `onboardingTextStyles.titleXL`.
 * Rendered as an `<h1>` rather than onboarding's `<p>`: these two screens are
 * standalone documents a screen reader arrives at cold, not steps inside a
 * flow, so they need a real heading. Nothing else on the page competes for it.
 */
export function AuthTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: 'var(--font-student-display)',
        fontWeight: 400,
        fontSize: 80,
        lineHeight: '106%',
        color: 'var(--color-student-surface-cream)',
        margin: '0 0 32px',
      }}
    >
      {children}
    </h1>
  )
}

/**
 * `monster-01` eye geometry, viewBox `0 0 40 40` — the prototype's bubble eyes
 * (`onboarding.html:1440-1446`), transcribed from `CompleteScreen.tsx:23-26`.
 *
 * Duplicated rather than imported: those four numbers live as a module-private
 * constant inside an *onboarding screen*, and reaching into a sibling screen
 * for them would make the auth surface depend on a route component. Two lines
 * of geometry with a provenance comment is the cheaper coupling.
 */
const M01_EYES: readonly GooglyEye[] = [
  { wcx: 16.299, wcy: 19.753, wrx: 3, wry: 4, pcx: 17.391, pcy: 19.762, pr: 2.1 },
  { wcx: 23.701, wcy: 19.753, wrx: 3, wry: 4, pcx: 24.769, pcy: 19.762, pr: 2.1 },
]

export interface AuthMascotProps {
  /** Stage-local position (the 1194×834 canvas). */
  left: number
  top: number
  size: number
  /** `false` holds it in its pre-entrance state — see the `phase2` stagger. */
  entered?: boolean
}

/**
 * The mascot that watches the form: `monster-01.svg` on the cream disc it wears
 * in `CompleteScreen.tsx:121-126` and `SuccessTakeover.tsx:97`, with live
 * {@link GooglyEyes} on the `GOOGLY_WANDER_MONSTER_M01` preset — the same
 * per-axis 0.7 × 1.5 wander the prototype gives this exact face.
 *
 * **Absolutely positioned, not in the form column**, for a layout reason and a
 * tonal one. Layout: the signup screen stacks three fields, a hint, a banner
 * and a switch link inside 834px, and 120px of mascot in that column is what
 * pushes the last field under the pinned CTA. Tonal: a face *beside* the form
 * is watching you fill it in; a face *above* it is a logo.
 *
 * `aria-hidden` on the image and no accessible name anywhere — the eyes are
 * decoration, and "monster" announced before "Email" would be noise.
 */
export function AuthMascot({ left, top, size, entered = true }: AuthMascotProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'var(--color-student-surface-cream)',
        zIndex: 4,
        pointerEvents: 'none',
        // The `phase2` stagger: the mascot pops in a beat after the copy, on
        // `AvatarScreen`'s spring so the overshoot reads as it landing.
        opacity: entered ? 1 : 0,
        transform: entered ? 'scale(1)' : 'scale(0.72)',
        transition:
          'opacity 320ms ease, transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <img
        src={studentAsset('monster-01.svg')}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <GooglyEyes
        viewBox="0 0 40 40"
        eyes={M01_EYES}
        pupilFill="var(--color-student-gray-400)"
        wander={GOOGLY_WANDER_MONSTER_M01}
      />
    </div>
  )
}

export interface AuthSwitchLinkProps {
  /** The lead-in, e.g. "Already have an account?". */
  prompt: string
  to: string
  linkLabel: string
}

/**
 * The cross-link between the two screens — 14px Barlow, the prompt in
 * `--color-student-gray-200` (the field-label grey) and the link itself in
 * cream so it is the only thing under the form with any contrast.
 *
 * A real `<Link>`, so it is a client navigation rather than a document load —
 * which matters here because the stage would otherwise re-mount and replay its
 * entrance for what is, to the user, a tab switch.
 *
 * **This component is rendered conditionally on the login screen and always on
 * signup**, which is not a symmetry bug: while `BP_SIGNUP_ENABLED` is off there
 * is no signup page to point at, and a link to a 404 is worse than no link.
 * Signup's link back to login is safe in either direction — `/login` is always
 * there.
 */
export function AuthSwitchLink({ prompt, to, linkLabel }: AuthSwitchLinkProps) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-student-body)',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '-0.1px',
        color: 'var(--color-student-gray-200)',
        margin: '24px 0 0',
      }}
    >
      {prompt}{' '}
      <Link
        to={to}
        style={{
          color: 'var(--color-student-surface-cream)',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        {linkLabel}
      </Link>
    </p>
  )
}
