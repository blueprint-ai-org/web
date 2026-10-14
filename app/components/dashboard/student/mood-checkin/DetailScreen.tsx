import type { CatalogueTile } from '~/lib/student/checkin-catalogue'
import { tileArt } from '~/lib/student/tile-art'

import { ArcSlider, type ArcStop } from '../arc-slider/ArcSlider'

import { MoodNav } from './MoodChrome'

/**
 * The stop the arc opens on — the middle of three, matching the prototype's
 * `defaultValue={1}`. The orchestrator seeds its own state with the same value
 * so an untouched slider and a slider dragged back to the middle record alike.
 */
export const DEFAULT_LEVEL = 1

/**
 * A per-tile detail screen (`buildDetailScreen`, `mood-checkin.html:1063-1119`).
 * Full-bleed blob behind the tile's name and the 3-stop arc slider.
 *
 * **Each stop IS a mood.** The arc used to pick an "intensity" the client then
 * mapped through a local `INTENSITY_BY_LEVEL = [2,5,8]`; the catalogue is now a
 * triad of real moods per tile (Good / Happy / Joyful), so the slider picks one
 * of them and the server derives the number from its `level`. That is why
 * `onPick` reports a mood id and not a stop index: the picked thing is the
 * thing recorded.
 *
 * The stops come from the catalogue's labels and emojis. The "More
 * specifically" chips are the catalogue's too — they exist in the prototype DOM
 * but are `display:none` (`:213-218`) and are kept here, hidden, for structural
 * parity.
 */

export function DetailScreen({
  tile,
  onPick,
  onBack,
  onNext,
}: {
  tile: CatalogueTile
  /** The mood the arc is sitting on. Called once on mount and on every change. */
  onPick?: (moodId: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const art = tileArt(tile.identifier)
  const { size, left, top } = art.shape

  const stops: ArcStop[] = tile.moods.map((m) => ({
    emoji: m.emoji ?? '',
    label: m.label,
  }))

  // The middle stop, or the only one a half-seeded tile has. `tile.moods` is
  // ordered by level, so index and level agree.
  const defaultIndex = Math.min(DEFAULT_LEVEL, Math.max(0, tile.moods.length - 1))
  const middle = tile.moods[defaultIndex]
  const palette = middle ?? tile.moods[0]

  return (
    <>
      <div className="mc-ed-shape" style={{ width: size, height: size, left, top }}>
        {art.shapeUrl && <img src={art.shapeUrl} alt="" />}
      </div>

      <h2 className="mc-ed-title">{tile.label}</h2>

      <div className="mc-ed-slider-wrap">
        <ArcSlider
          stops={stops}
          gradient={[
            { offset: 0, color: palette?.secondaryColor ?? '#2A315D' },
            { offset: 100, color: palette?.color ?? '#68DCC6' },
          ]}
          defaultValue={defaultIndex}
          onChange={(index) => {
            const picked = tile.moods[index]
            if (picked) onPick?.(picked.id)
          }}
          thumbColor={palette?.color ?? '#68DCC6'}
          ariaLabel={`How ${tile.label.toLowerCase()} do you feel?`}
        />
      </div>

      {/* Hidden in the prototype (`.ed-chips-section { display:none }`); kept for parity. */}
      <div className="mc-ed-chips-section" aria-hidden="true">
        <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 13, fontWeight: 600, color: '#c9c9c9', margin: '0 0 12px' }}>
          More specifically <span style={{ color: '#a4a59f' }}>(optional)</span>
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(palette?.chips ?? []).map((chip) => (
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
