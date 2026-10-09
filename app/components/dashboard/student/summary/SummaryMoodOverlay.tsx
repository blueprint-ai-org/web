import { studentAsset, studentAssets } from '~/assets/student-app'

import { REASON_EMOJI, moodChipsFor } from '../today/today-data'

import type { SummaryDay } from './summary-data'

/**
 * The mood-detail overlay (`summary.html:321-367`, `openMoodOverlay`). Opened by
 * clicking the summary's Mood card. Kept mounted; the `open` prop toggles the
 * `.sum-mood-ov.open` opacity/pointer-events transition (matching the prototype).
 * Shows the day's emotion tiles, deduped chips (max 6), the reason chips, and —
 * only for today — an "Edit mood check-in" button.
 */
export function SummaryMoodOverlay({
  day,
  isToday,
  open,
  onClose,
  onEdit,
}: {
  day: SummaryDay
  isToday: boolean
  open: boolean
  onClose: () => void
  onEdit: () => void
}) {
  const chips = moodChipsFor(day.mood.emotions.map((e) => e.name))
  const reasons = day.mood.reasons ?? []

  return (
    <div className={`sum-mood-ov${open ? ' open' : ''}`}>
      <button type="button" className="sum-mood-ov-back" aria-label="Back" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="sum-mood-ov-body">
        <div className="sum-mood-ov-hdr">
          <img className="sum-mood-ov-icon" src={studentAsset('section-icon-mood.svg')} alt="" />
          <span className="sum-mood-ov-title">Mood</span>
          <span className="sum-mood-ov-date">{day.label}</span>
        </div>

        <div className="sum-mood-ov-emotions">
          {day.mood.emotions.map((e, i) => {
            const src = studentAssets[e.img]
            return (
              <div key={`${e.name}-${i}`} className="sum-mood-ov-tile">
                {src ? <img src={src} alt="" /> : null}
                <span className="sum-mood-ov-label">{e.name}</span>
              </div>
            )
          })}
        </div>

        {chips.length > 0 && (
          <div className="sum-mood-ov-chips">
            {chips.map((c) => (
              <span key={c} className="sum-mood-ov-chip">
                {c}
              </span>
            ))}
          </div>
        )}

        {reasons.length > 0 && (
          <div className="sum-mood-ov-reasons">
            <span className="sum-mood-ov-reasons-label">What made you feel this way</span>
            <div className="sum-mood-ov-reasons-row">
              {reasons.map((r) => (
                <div key={r} className="sum-mood-ov-reason">
                  <span className="sum-mood-ov-reason-emoji">{REASON_EMOJI[r] ?? '•'}</span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {isToday && (
          <button type="button" className="sum-mood-ov-edit" onClick={onEdit}>
            Edit mood check-in
          </button>
        )}
      </div>
    </div>
  )
}
