/**
 * Small shared chrome for the mood check-in screens: the chevron-back glyph
 * (`:784`) and the back-plus-Next navigation row shared by the detail, why, and
 * sleep screens (`.ed-nav`, `:238-256`). Kept local to the mood-checkin feature
 * rather than reaching into the onboarding chrome, which is onboarding-specific.
 */

/** 20×20 chevron-back glyph (`mood-checkin.html:784`). */
export function BackArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M13 4L7 10L13 16"
        stroke="#f2f3e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Back (48×48 ghost) + Next (200×48 cream) row (`.ed-nav`, `:238-256`). */
export function MoodNav({
  onBack,
  onNext,
  nextLabel = 'Next',
}: {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
}) {
  return (
    <div className="mc-ed-nav">
      <button type="button" className="mc-btn-back" aria-label="Back" onClick={onBack}>
        <BackArrow />
      </button>
      <button type="button" className="mc-btn-next" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  )
}
