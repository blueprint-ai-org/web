import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { relativeSlug, type OnboardingSlug } from './steps'
import type { OnboardingTransition } from './transitions'

/**
 * Mount-agnostic navigation for the prototype onboarding flow (v2).
 *
 * The flow is mounted twice — under LTI at `/student/onboarding/*` and in the
 * dev-only preview at `/preview/student/onboarding/*`. Screens navigate with
 * this hook so a single component resolves to the LTI tree under LTI and stays
 * inside preview under preview, deriving the base from the current pathname
 * (mirrors the legacy `onboarding/useOnboardingNav.ts` + `nav/useStudentNavBase.ts`).
 *
 * The final screen exits into the student hub's mood check-in
 * (`/student/mood-checkin`, preview `/preview/student/mood-checkin`).
 */

const LTI_BASE = '/student/onboarding'
const PREVIEW_BASE = '/preview/student/onboarding'
const LTI_HOME = '/student'
const PREVIEW_HOME = '/preview/student'

/**
 * Router `location.state` carried across an onboarding client navigation so the
 * incoming screen can pick the matching enter cinematic (`obEnter`). Absent on a
 * fresh SSR load / direct URL — the screen then falls back to a plain fade.
 */
export interface OnboardingNavState {
  obEnter: OnboardingTransition
}

export interface OnboardingNav {
  /** Onboarding mount base (`/student/onboarding` or the preview mirror). */
  base: string
  /** Navigate to a specific step within the current mount. */
  goToStep: (slug: OnboardingSlug, state?: OnboardingNavState) => void
  /** Advance one step from `slug`. */
  goNext: (slug: OnboardingSlug, state?: OnboardingNavState) => void
  /** Go back one step from `slug`. */
  goBack: (slug: OnboardingSlug, state?: OnboardingNavState) => void
  /** Exit onboarding into the student hub's mood check-in. */
  goToMoodCheckin: (state?: OnboardingNavState) => void
}

export function useOnboardingNav(): OnboardingNav {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isPreview = pathname.startsWith(PREVIEW_BASE)
  const base = isPreview ? PREVIEW_BASE : LTI_BASE
  const home = isPreview ? PREVIEW_HOME : LTI_HOME

  const goToStep = useCallback(
    (slug: OnboardingSlug, state?: OnboardingNavState) =>
      navigate(`${base}/${slug}`, state ? { state } : undefined),
    [base, navigate],
  )
  const goNext = useCallback(
    (slug: OnboardingSlug, state?: OnboardingNavState) =>
      navigate(`${base}/${relativeSlug(slug, 1)}`, state ? { state } : undefined),
    [base, navigate],
  )
  const goBack = useCallback(
    (slug: OnboardingSlug, state?: OnboardingNavState) =>
      navigate(`${base}/${relativeSlug(slug, -1)}`, state ? { state } : undefined),
    [base, navigate],
  )
  const goToMoodCheckin = useCallback(
    (state?: OnboardingNavState) =>
      navigate(`${home}/mood-checkin`, state ? { state } : undefined),
    [home, navigate],
  )

  return { base, goToStep, goNext, goBack, goToMoodCheckin }
}
