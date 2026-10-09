import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'

import { useEnterAnimation } from '../hooks/useEnterAnimation'

import type { OnboardingSlug } from './steps'
import {
  OB_EXIT_MS,
  OB_FORWARD,
  isOnboardingTransition,
  type OnboardingMotion,
  type OnboardingTransition,
} from './transitions'
import { useOnboardingNav } from './useOnboardingNav'

/**
 * Drives the per-screen onboarding cinematics (Phase 4B). Wraps
 * {@link useOnboardingNav} and reproduces the prototype's dual-screen
 * choreography as an exit-then-navigate + enter-on-arrival split:
 *
 *  - `next()` plays the forward exit cinematic ({@link OB_FORWARD}) on the
 *    current screen, then — after {@link OB_EXIT_MS} — navigates to the next
 *    step (or `/student/mood-checkin` from `complete`), tagging the destination
 *    with `location.state.obEnter` so it plays the matching enter cinematic.
 *  - `back()` is a quick fade (the prototype's plain 280ms `goTo` crossfade).
 *  - `motion` carries the enter kind (read from `location.state`), the
 *    double-rAF `entered`/`phase2` flags, and the active `exit` — threaded into
 *    {@link OnboardingStage} and each screen's own scenery (ellipse / circle).
 *
 * The timer is cleared on unmount; a transition in flight ignores re-triggers.
 */
export interface OnboardingTransitionApi {
  motion: OnboardingMotion
  /** Advance with the forward cinematic for this screen. */
  next: () => void
  /** Step back one screen with a quick fade. */
  back: () => void
  /** `true` while an exit cinematic is playing (buttons should stay inert). */
  isLeaving: boolean
}

export function useOnboardingTransition(slug: OnboardingSlug): OnboardingTransitionApi {
  const nav = useOnboardingNav()
  const location = useLocation()

  const rawEnter = (location.state as { obEnter?: unknown } | null)?.obEnter
  const enterKind: OnboardingTransition = isOnboardingTransition(rawEnter) ? rawEnter : 'fade'

  const [exit, setExit] = useState<OnboardingTransition | null>(null)
  const [exitBg, setExitBg] = useState<string | undefined>(undefined)
  const { entered, phase2 } = useEnterAnimation({ enabled: true })

  const timerRef = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const next = useCallback(() => {
    if (exit) return
    const edge = OB_FORWARD[slug]
    setExit(edge.kind)
    setExitBg(edge.exitBg)
    timerRef.current = window.setTimeout(() => {
      if (edge.to === 'mood') nav.goToMoodCheckin({ obEnter: edge.kind })
      else nav.goToStep(edge.to, { obEnter: edge.kind })
    }, OB_EXIT_MS[edge.kind])
  }, [exit, slug, nav])

  const back = useCallback(() => {
    if (exit) return
    setExit('fade')
    setExitBg(undefined)
    timerRef.current = window.setTimeout(() => {
      nav.goBack(slug, { obEnter: 'fade' })
    }, OB_EXIT_MS.fade)
  }, [exit, slug, nav])

  const motion: OnboardingMotion = { enterKind, entered, phase2, exit, exitBg }
  return { motion, next, back, isLeaving: exit !== null }
}
