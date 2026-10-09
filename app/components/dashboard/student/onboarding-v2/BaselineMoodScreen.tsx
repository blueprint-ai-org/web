import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { CatalogueQuestion } from '~/lib/bp-ai/questions.server'
import { BASELINE_MOOD_QUESTION } from '~/lib/student/onboarding-questions'

import { ArcSlider, type ArcStop } from '../arc-slider/ArcSlider'

import { NavRow, OnboardingStage, TitleLG } from './OnboardingChrome'
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
 * The heading and the stops come from the BP AI question catalogue when the
 * route's loader could read it, and from {@link BASELINE_MOOD_QUESTION} — the
 * same text the catalogue was seeded with — when it could not.
 */

/** The baked stops: the fallback, and what the catalogue row was seeded from. */
const MOOD_STOPS: readonly ArcStop[] = BASELINE_MOOD_QUESTION.options.map((o) => ({
  // Every stop on this scale has one; `emoji` is optional on the spec because
  // the feel-good cards carry illustrations instead.
  emoji: o.emoji ?? '',
  label: o.label,
}))

/**
 * The arc is a five-point scale drawn to fixed geometry — `UNION_SCALES` has
 * five entries and the background stretch interpolates between them — so a
 * catalogue row with a different number of options cannot be rendered by this
 * screen. Rather than drawing a broken arc, it keeps the baked five. Editing
 * the *wording* is supported; changing the shape of the scale is a code change.
 */
function stopsFrom(question: CatalogueQuestion | null): readonly ArcStop[] {
  if (!question || question.options.length !== MOOD_STOPS.length) return MOOD_STOPS
  return question.options.map((o, i) => ({
    emoji: o.emoji ?? MOOD_STOPS[i].emoji,
    label: o.label,
  }))
}

export interface BaselineMoodScreenProps {
  /** The catalogue row, or `null` to render the baked copy. */
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

  const heading = question?.label ?? BASELINE_MOOD_QUESTION.label
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
      fetcher.submit(
        {
          questionId: question.id,
          question: question.label,
          optionId: option.id,
          answer: option.label,
          // 1-based, matching the option's own `order`: a 5-point scale is
          // worth storing as a number as well as a label.
          score: String(choice + 1),
        },
        { method: 'post' },
      )
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
