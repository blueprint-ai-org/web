import { studentAsset } from '~/assets/student-app'
import type { CheckinQuestionRow } from '~/lib/student/checkin-catalogue'

import { ArcSlider, type ArcStop } from '../arc-slider/ArcSlider'

import { MoodNav } from './MoodChrome'
import { SLEEP_BG, SLEEP_DEFAULT_INDEX, SLEEP_GRADIENT, SLEEP_LEVELS } from './mood-data'

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
 * The stops come from that question when the loader found it, sorted by `order`
 * — which is why `order` is load-bearing on this row: it is a scale, not a menu,
 * so a client sorting by it gets the arc back pointing the right way. Failing
 * that, `SLEEP_LEVELS` renders and nothing records.
 *
 * Note this is **not** the platform's seeded sleep question, which asks how many
 * *hours* and carries no emoji. Ours asks how the night felt and has a face per
 * stop; both live in the `sleep` category, ours at order 2.
 */

const BAKED_STOPS: ArcStop[] = SLEEP_LEVELS.map((l) => ({ emoji: l.emoji, label: l.label }))

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
  const options = question?.options ?? []
  // A catalogue row with the wrong number of stops would silently reshape the
  // arc, so the baked seven stand in unless the row matches them one for one.
  const useCatalogue = options.length === BAKED_STOPS.length
  const stops: ArcStop[] = useCatalogue
    ? options.map((o, i) => ({ emoji: o.emoji ?? BAKED_STOPS[i].emoji, label: o.label }))
    : BAKED_STOPS

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
        <ArcSlider
          stops={stops}
          gradient={SLEEP_GRADIENT}
          defaultValue={SLEEP_DEFAULT_INDEX}
          onChange={onStopChange}
          thumbColor={SLEEP_BG}
          dotRadius={6}
          ariaLabel="How was your sleep?"
        />
      </div>

      <MoodNav onBack={onBack} onNext={onNext} />
    </>
  )
}
