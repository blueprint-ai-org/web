import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { CatalogueQuestion } from '~/lib/bp-ai/questions.server'

import { ArcSlider, type ArcStop } from '../arc-slider/ArcSlider'

import { NavRow, OnboardingStage, TitleLG } from './OnboardingChrome'
import { QuestionUnavailable } from './QuestionUnavailable'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `baseline-mood` (prototype `#s4`, `onboarding.html:1196-1231`).
 * The 5-stop baseline-mood arc slider over the stretching "union" background
 * (`updateUnion`, `:2044-2069`). No storage write (prototype never persisted
 * the baseline). Back → `avatar`, Next → `helpers` plays the curtain collapse.
 *
 * The union tracks the slider live during a drag (transition-duration 0) and
 * eases 300ms to the snapped stop on release — the duration always stays on
 * `transform` (0 → 300ms) rather than toggling `none`, so the snap transition
 * fires reliably regardless of the same-commit style flush.
 *
 * The heading and the stops come from the BP AI question catalogue. When the
 * route's loader could not read it there is nothing to draw: see
 * {@link QuestionUnavailable}.
 */

/**
 * The stops ARE the catalogue's options — `MOOD_STOPS`, the baked five, is gone
 * with the rest of the fallback (see `QuestionUnavailable`).
 *
 * The arc is still drawn to fixed geometry: `UNION_SCALES` has five entries and
 * the background stretch interpolates between them, so this screen renders a
 * five-point scale. A row with a different number of options is a catalogue a
 * different screen would have to draw; the stops are clamped to five rather
 * than drawing a broken arc.
 */
const SCALE_POINTS = 5

function stopsFrom(question: CatalogueQuestion): readonly ArcStop[] {
  return question.options.slice(0, SCALE_POINTS).map((o) => ({
    emoji: o.emoji ?? '',
    label: o.label,
  }))
}

export interface BaselineMoodScreenProps {
  /** The catalogue row, or `null` — which renders {@link QuestionUnavailable}. */
  question?: CatalogueQuestion | null
}

// scaleX values derived from Figma widths relative to neutral 1030px (`:2044`).
const UNION_SCALES = [730 / 1030, 870 / 1030, 1, 1230 / 1030, 1430 / 1030]

function unionScaleFromNormalized(normalized: number): number {
  const t = Math.max(0, Math.min(4, normalized * 4))
  const i = Math.min(Math.floor(t), 3)
  return UNION_SCALES[i] + (t - i) * (UNION_SCALES[i + 1] - UNION_SCALES[i])
}

export function BaselineMoodScreen({ question = null }: BaselineMoodScreenProps = {}) {
  const t = useOnboardingTransition('baseline-mood')
  const fetcher = useFetcher<{ saved: boolean }>()
  const [union, setUnion] = useState({ scale: 1, animate: false })
  // The arc's own default stop (`defaultValue={2}`). Tracked here because the
  // answer is recorded on Next, not on every drag.
  const [choice, setChoice] = useState(2)

  // **No catalogue, no question.** The screen used to render a baked copy of
  // the five stops, so a student answered something that recorded nothing.
  if (!question) return <QuestionUnavailable slug="baseline-mood" transition={t} />

  const heading = question.label
  const stops = stopsFrom(question)

  /**
   * Record on Next, then play the transition.
   *
   * **Not on every `onChange`.** The arc snaps on each release, and a student
   * exploring the scale would otherwise write a row per wiggle — five writes
   * to say one thing. Next is the moment the answer is theirs.
   *
   * Fire-and-forget: the curtain transition starts immediately, and the action
   * logs its own failures. Nothing here waits on the network, because the one
   * thing worse than losing a mood datum is freezing a child mid-onboarding.
   *
   * With no question behind the screen there is nothing to record against —
   * an LTI launch, an unseeded tenant, an unreachable gateway — and Next is
   * just Next, exactly as it was before any of this existed.
   */
  const next = () => {
    const option = question?.options[choice]
    if (question && option) {
      // The chosen option, and nothing else. The label, the answer text and
      // the score went too until step-10 — and the score was `choice + 1`,
      // this screen's own guess at the option's `order`. The server reads it
      // off the option now, so a reordered scale cannot disagree with it.
      fetcher.submit({ questionId: question.id, optionId: option.id }, { method: 'post' })
    }
    t.next()
  }

  return (
    <OnboardingStage slug="baseline-mood" background="#1f1f25" motion={t.motion}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img
          src={studentAsset('backgrounds/union.svg')}
          alt=""
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: 1030,
            height: 834,
            transform: `translateX(-50%) scaleX(${union.scale})`,
            transformOrigin: '50% 0%',
            pointerEvents: 'none',
            transition: `transform ${union.animate ? 300 : 0}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        />
      </div>

      <div style={{ position: 'absolute', left: '50%', top: 112, transform: 'translateX(-50%)', width: 660, zIndex: 5, textAlign: 'center' }}>
        {/*
          The baked copy carried a hand-placed `<br />` between "feel" and
          "most days?". A label the catalogue supplies cannot carry one, and a
          question an admin rewords would break wherever the 660px box happened
          to run out. `text-wrap: balance` keeps the two-line shape the design
          has, evens the lines for any wording, and leaves the 64px Anton and
          the box untouched.
        */}
        <TitleLG style={{ fontSize: 64, textWrap: 'balance' }}>{heading}</TitleLG>

        <div style={{ margin: '80px auto 0', width: 532 }}>
          <ArcSlider
            stops={stops}
            gradient={[
              { offset: 0, color: '#945218' },
              { offset: 100, color: '#F08B31' },
            ]}
            defaultValue={2}
            thumbColor="#f08b31"
            trackStrokeWidth={80}
            fillStrokeWidth={56}
            thumbSize={116}
            thumbBorderWidth={11}
            thumbFontSize={60}
            dotHideMode="fill-aware"
            endCaps={{ trackRadius: 40, fillRadius: 28 }}
            height={310}
            pillBottom={40}
            pillMinWidth={174}
            pillHeight={58}
            snapDurationMs={420}
            ariaLabel={heading}
            onInput={(_i, _a, normalized) => setUnion({ scale: unionScaleFromNormalized(normalized), animate: false })}
            onChange={(i) => {
              setChoice(i)
              setUnion({ scale: UNION_SCALES[Math.min(i, 4)], animate: true })
            }}
          />
        </div>
      </div>

      <NavRow onBack={t.back} onNext={next} backBackground="#36363f" />
    </OnboardingStage>
  )
}
