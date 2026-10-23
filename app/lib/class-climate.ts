/**
 * The class-climate cards of `/counselor/class-health` (step-15).
 *
 * The five dimensions are the five metrics of `cohortMetrics`, labelled and
 * described by `metricDefinitions`; `value` is the gateway's 0-100 `score`
 * (PROVISIONAL mapping, `cohortScoreFromMean` in the api). Imports nothing
 * server-only: the component reads it too.
 */

export interface ClimateDimension {
  name: string
  /** Under the bar, where the prototype had its action hint. */
  description: string
  /** 0-100, higher = better. Null: not enough data, or withheld by k-anonymity. */
  value: number | null
}

export interface ClassClimate {
  /** The card's subtitle, e.g. "Lincoln Middle • 120 Students". */
  subtitle: string
  dimensions: ClimateDimension[]
}

/**
 * The two strongest and the (up to) two weakest dimensions with a value. A
 * dimension without one is in neither list — an unknown is not a concern — and
 * none is in both, so three known values make two strengths and one concern.
 */
export function strengthsAndConcerns(dimensions: ClimateDimension[]): {
  strengths: (ClimateDimension & { value: number })[]
  concerns: (ClimateDimension & { value: number })[]
} {
  const known = dimensions
    .filter((d): d is ClimateDimension & { value: number } => d.value !== null)
    .sort((a, b) => b.value - a.value)
  return { strengths: known.slice(0, 2), concerns: known.slice(2).slice(-2).reverse() }
}

/** The `/preview` climate: the prototype's five dimensions, which the backend does not have. */
export const PREVIEW_CLASS_CLIMATE: ClassClimate = {
  subtitle: 'Period 3 • AP English • 28 Students',
  dimensions: [
    { name: 'Emotional Safety', value: 72, description: 'Students feel safe expressing themselves. Reinforce trust-building rituals.' },
    { name: 'Engagement', value: 65, description: 'Participation is declining — consider varying activity formats or adding choice.' },
    { name: 'Stress Level', value: 45, description: 'Stress is elevated. Consider pacing adjustments or a class-wide decompression activity.' },
    { name: 'Resilience', value: 58, description: 'Bounce-back is fragile. Normalize setbacks and celebrate recovery in class.' },
    { name: 'Connection', value: 70, description: 'Peer bonds are strong. Leverage group work and collaborative projects.' },
  ],
}
