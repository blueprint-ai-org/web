import { studentAsset } from '~/assets/student-app'
import type { CheckinQuestionRow } from '~/lib/student/checkin-catalogue'

import { ArcSlider, type ArcStop } from '../arc-slider/ArcSlider'

import { MoodNav } from './MoodChrome'
import { SLEEP_BG, SLEEP_DEFAULT_INDEX, SLEEP_GRADIENT } from './mood-data'

/**
 * S-SLEEP — the 7-stop sleep-quality slider (`mood-checkin.html:752-788`,
 * `initSleepSlider` :1500-1549). Blue screen over the `survey-shape` blob (which
 * the orchestrator morphs in from scale-2 on entry and slides content off on the
 * way to the done screen). The blob carries `mc-sleep-blob` so the orchestrator
 * can drive its scale morph.
 *
 * **Now persisted.** The prototype threw the value away; the chosen stop is
 * reported through `onStopChange` and written as the answer to the `sleep`
 * catalogue question.
 *
 * **The stops ARE the question's options**, in `order` — which is why `order` is
 * load-bearing on this row: it is a scale, not a menu, so a client sorting by it
 * gets the arc back pointing the right way. The seven baked stops are gone
 * (step-9): they rendered an arc that recorded nothing, and `checkin.sleep` is
 * seeded with exactly them. No row ⇒ no slider, and the student moves on.
 *
 * This is the quality scale, not the platform's `sleep.hours` question — that
 * one is archived in the seed and its view is still to be designed (step-29).
 * The answer here is not stored as a mini-survey either: `submitCheckIn` turns
 * it into `sleep_profile.quality`.
 */

export function SleepScreen({
  question,
  onStopChange,
  onBack,
  onNext,
}: {
  question?: CheckinQuestionRow | null
  /** 0-based arc stop, worst → best. Indexes the rendered stops. */
  onStopChange?: (index: number) => void
  onBack: () => void
  onNext: () => void
}) {
  // Whatever the row carries: seven today, and an arc of six or eight is a
  // scale an admin reshaped, not a bug to paper over.
  const stops: ArcStop[] = (question?.options ?? []).map((o) => ({ emoji: o.emoji ?? '🌙', label: o.label }))

  return (
    <>
      <img
        className="mc-sleep-blob"
        src={studentAsset('survey-shape.svg')}
        alt=""
        style={{ position: 'absolute', left: -33, top: -390, width: 1188, height: 1599, pointerEvents: 'none', zIndex: 0 }}
      />

      <p className="mc-sleep-sub">Almost done! Last question for today.</p>
      <h2 className="mc-sleep-title">
        How was
        <br />
        your sleep?
      </h2>

      <div className="mc-sleep-slider-wrap">
        {stops.length === 0 ? null : (
        <ArcSlider
          stops={stops}
          gradient={SLEEP_GRADIENT}
          defaultValue={Math.min(SLEEP_DEFAULT_INDEX, stops.length - 1)}
          onChange={onStopChange}
          thumbColor={SLEEP_BG}
          dotRadius={6}
          ariaLabel="How was your sleep?"
        />
        )}
      </div>

      <MoodNav onBack={onBack} onNext={onNext} />
    </>
  )
}
