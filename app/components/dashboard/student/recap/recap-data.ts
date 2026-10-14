/**
 * Recap story copy and layout — ported from `recap.html`'s markup + inline JS.
 *
 * The recap is a fixed 6-slide "wrapped"-style story (`TOTAL = 6`,
 * `recap.html:412`). Its figures are the server's since step-24 (`RecapData`:
 * the month, feelings named, journal notes, lessons viewed and completed).
 * What the backend has no analysis for is not shown rather than invented: the
 * quoted sentence, the sleep↔mood correlation and its two stat pins.
 */

export const RECAP_TOTAL = 6

export const RECAP_COPY = {
  /** Two lines, rendered with a `<br>`. */
  introTitle: ['Your Monthly', 'Recap'] as const,
  btnStart: 'Start',

  cloudLabel: 'You put that into words.',

  emotionsHeading: (times: number) => ['You named emotions', `${times} ${times === 1 ? 'time' : 'times'}`] as const,
  emotionsSub: 'That takes courage.',

  sleepSub: "Your body is talking — you're listening.",

  careSub: 'You did a lot of good things for yourself',
  careHeading: 'You kept taking care',

  finalLabel: 'You showed up for yourself.',
  finalHeading: 'Every step counts.',

  navNext: 'Next',
  navBackToJourney: 'Back to Journey',
} as const

/** Slide-5 "you kept taking care" cards (`recap.html:357-377`): label, art, and the figure it shows. */
export const CARE_LAYOUT: readonly { label: string; shape: string; figure: 'journals' | 'lessonsViewed' | 'lessonsCompleted' }[] = [
  { label: 'Journal notes written', shape: 'wzor-03.svg', figure: 'journals' },
  { label: 'Videos watched', shape: 'wzor-05.svg', figure: 'lessonsViewed' },
  { label: 'Activities tried', shape: 'wzor-06.svg', figure: 'lessonsCompleted' },
]
