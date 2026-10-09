import { emotionShape, type Emotion } from '~/lib/student/emotions'

import { ArcSlider, type ArcStop } from '../arc-slider/ArcSlider'

import { MoodNav } from './MoodChrome'

/**
 * The stop the arc opens on — the middle of three, matching the prototype's
 * `defaultValue={1}`. The orchestrator seeds its own state with the same value
 * so an untouched slider and a slider dragged back to the middle record alike.
 */
export const DEFAULT_LEVEL = 1

/**
 * A per-emotion detail screen (`buildDetailScreen`, `mood-checkin.html:1063-1119`).
 * Full-bleed emotion blob behind the emotion name and the 3-stop intensity arc
 * slider (levels + per-level emoji). The "More specifically" chips exist in the
 * prototype DOM but are `display:none` (`:213-218`) — kept here, hidden, for
 * structural parity.
 *
 * **The slider value is now recorded.** The prototype computed the arc stop and
 * threw it away; it is reported up through `onLevelChange` as the 0-based stop
 * index and mapped to `INTENSITY_BY_LEVEL` before the write. The orchestrator
 * seeds every picked emotion at the default stop, so an emotion whose slider is
 * never touched still records the middle value rather than nothing.
 *
 * `shapeClassName` lets the orchestrator tag the first screen's blob so it can
 * drive the scale-6 → scale-1 entrance (`startDetailFlow`, :1046-1059).
 */

export function DetailScreen({
  emotion,
  onLevelChange,
  onBack,
  onNext,
}: {
  emotion: Emotion
  /** 0-based arc stop, low → high. Indexes `emotion.levels` and `INTENSITY_BY_LEVEL`. */
  onLevelChange?: (level: number) => void
  onBack: () => void
  onNext: () => void
}) {
  const shapeUrl = emotionShape(emotion.key)
  const { size, left, top } = emotion.shape

  const stops: ArcStop[] = emotion.emojis.map((emoji, i) => ({
    emoji,
    label: emotion.levels[i],
  }))

  return (
    <>
      <div className="mc-ed-shape" style={{ width: size, height: size, left, top }}>
        {shapeUrl && <img src={shapeUrl} alt="" />}
      </div>

      <h2 className="mc-ed-title">{emotion.name}</h2>

      <div className="mc-ed-slider-wrap">
        <ArcSlider
          stops={stops}
          gradient={[
            { offset: 0, color: emotion.gradDark },
            { offset: 100, color: emotion.color },
          ]}
          defaultValue={DEFAULT_LEVEL}
          onChange={onLevelChange}
          thumbColor={emotion.color}
          ariaLabel={`How ${emotion.name.toLowerCase()} do you feel?`}
        />
      </div>

      {/* Hidden in the prototype (`.ed-chips-section { display:none }`); kept for parity. */}
      <div className="mc-ed-chips-section" aria-hidden="true">
        <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 13, fontWeight: 600, color: '#c9c9c9', margin: '0 0 12px' }}>
          More specifically <span style={{ color: '#a4a59f' }}>(optional)</span>
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {emotion.chips.map((chip) => (
            <button
              key={chip}
              type="button"
              tabIndex={-1}
              style={{
                height: 36,
                padding: '0 16px',
                border: '1px solid #444450',
                borderRadius: 99,
                background: '#2f2f37',
                color: '#f2f3e5',
                fontFamily: 'var(--font-student-body)',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <MoodNav onBack={onBack} onNext={onNext} />
    </>
  )
}
