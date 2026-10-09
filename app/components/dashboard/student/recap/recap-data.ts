/**
 * Recap story data — ported from `recap.html`'s markup + inline JS.
 *
 * The recap is a fixed 6-slide "wrapped"-style story (`TOTAL = 6`,
 * `recap.html:412`); every value is baked (no `bp_*` reads). This module carries
 * the per-slide copy + the two positioned stat pins + the three care cards so
 * {@link RecapStory} stays declarative. All copy is authored in English — the
 * prototype's `recap.html` carries no Polish (the residual Polish is journey-only).
 */

export const RECAP_TOTAL = 6

export const RECAP_COPY = {
  introMonth: 'May 2026',
  /** Two lines, rendered with a `<br>`. */
  introTitle: ['Your Monthly', 'Recap'] as const,
  btnStart: 'Start',

  cloudLabel: 'You put that into words.',
  /** Hardcoded over the markup default (`recap.html:416`), curly quotes verbatim. */
  cloudQuote: '”Today I actually felt proud of myself”',

  emotionsHeading: ['You named emotions', '27 times'] as const,
  emotionsSub: 'That takes courage.',

  sleepHeading: 'On the days you slept well, you felt happier.',
  sleepSub: "Your body is talking — you're listening.",

  careSub: 'You did a lot of good things for yourself',
  careHeading: 'You kept taking care',

  finalLabel: 'You showed up for yourself.',
  finalHeading: 'Every step counts.',

  navNext: 'Next',
  navBackToJourney: 'Back to Journey',
} as const

/** Slide-4 sleep/mood stat pins (`recap.html:340-347`). */
export interface StatPin {
  readonly num: string
  readonly desc: string
  readonly left: number
  readonly top: number
}

export const SLEEP_PINS: readonly StatPin[] = [
  { num: '13', desc: 'Good sleep nights', left: 263, top: 662 },
  { num: '18', desc: 'Positive emotions', left: 801, top: 590 },
]

/** Slide-5 "you kept taking care" cards (`recap.html:357-377`). */
export interface CareCard {
  readonly label: string
  readonly shape: string
  readonly num: string
}

export const CARE_CARDS: readonly CareCard[] = [
  { label: 'Journal notes written', shape: 'wzor-03.svg', num: '5' },
  { label: 'Videos watched', shape: 'wzor-05.svg', num: '10' },
  { label: 'Activities tried', shape: 'wzor-06.svg', num: '12' },
]
