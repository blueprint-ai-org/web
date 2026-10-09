/**
 * Prototype onboarding step model (`onboarding.html` s-name, s0–s7).
 *
 * The prototype is a single page whose screens advance via an in-page `goTo`
 * switcher; here each screen is its own React Router route. This module is the
 * single source of truth for the slug order + the shared progress-bar geometry.
 *
 * Progress widths mirror the prototype's `PROG_W` map (`onboarding.html:1529`,
 * keyed by the prototype's `cur` index) expressed per slug: the bar is 756px
 * wide (`.prog`), hidden on `this-space`/`complete` (no entry).
 */

export const ONBOARDING_SLUGS = [
  'this-space',
  'sharing',
  'privacy',
  'avatar',
  'baseline-mood',
  'helpers',
  'trusted-person',
  'complete',
] as const

export type OnboardingSlug = (typeof ONBOARDING_SLUGS)[number]

/**
 * First step — the index redirect, the `/app` dispatcher, `/login`, `/signup`
 * and `/invite` all land here.
 *
 * It was `name` until 2026-09-23. That screen asked for something the platform
 * already knows: every user is provisioned with a name, and `_persona.tsx`'s
 * loader now resolves it from the BP AI profile or the LTI claims. A question
 * whose answer we already hold is not onboarding, it is a form.
 */
export const ONBOARDING_FIRST: OnboardingSlug = 'this-space'

/** {@link ONBOARDING_FIRST} as a path — the one string every redirect site uses. */
export const ONBOARDING_FIRST_PATH = `/student/onboarding/${ONBOARDING_FIRST}`

/**
 * Progress-bar fill width (px, of the 756px track) per slug. Slugs absent from
 * the map render no bar (prototype hides it on s-name / s0 / s7).
 * Mirrors `PROG_W = { 1:100, 2:100, 3:200, 4:400, 5:550, 6:700 }`.
 */
export const ONBOARDING_PROGRESS: Partial<Record<OnboardingSlug, number>> = {
  sharing: 100,
  privacy: 100,
  avatar: 200,
  'baseline-mood': 400,
  helpers: 550,
  'trusted-person': 700,
}

/** Slug at `delta` offset from `slug`, clamped to the flow bounds. */
export function relativeSlug(slug: OnboardingSlug, delta: number): OnboardingSlug {
  const i = ONBOARDING_SLUGS.indexOf(slug)
  const next = Math.max(0, Math.min(ONBOARDING_SLUGS.length - 1, i + delta))
  return ONBOARDING_SLUGS[next]
}
