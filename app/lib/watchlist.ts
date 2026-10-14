/**
 * The risk watchlist as the dashboard draws it (step-15).
 *
 * Shared by the server module that reads `cohortRisk` and by the components,
 * so it imports nothing server-only.
 *
 * ## One vocabulary
 *
 * The gateway speaks `RiskTier` (LOW → CRITICAL). The design keeps its four
 * visual tones (`monitor` → `urgent`), which `RiskBadge`, the CTA and the
 * avatar gradient are keyed on. {@link TONE_BY_TIER} is the only place the two
 * meet: a `Record` over `RiskTier`, so a fifth tier is a type error here
 * instead of a silent default somewhere in a component.
 */

import type { RiskTier, Trend } from './bp-ai/gql/schema'

export type RiskTone = 'urgent' | 'elevated' | 'moderate' | 'monitor'

export const TONE_BY_TIER: Record<RiskTier, RiskTone> = {
  CRITICAL: 'urgent',
  HIGH: 'elevated',
  MODERATE: 'moderate',
  LOW: 'monitor',
}

/** `TrendArrow`'s three directions. The other two `Trend`s carry none. */
export type Direction = 'declining' | 'stable' | 'improving'

const DIRECTION_BY_TREND: Partial<Record<Trend, Direction>> = {
  DECLINING: 'declining',
  STABLE: 'stable',
  IMPROVING: 'improving',
}

export function directionOf(trend: Trend | null | undefined): Direction | null {
  return trend ? (DIRECTION_BY_TREND[trend] ?? null) : null
}

/**
 * One row. Every number the backend may not know is `null` and is drawn as a
 * placeholder, never as a zero the student did not earn.
 */
export interface WatchlistRow {
  /** The student's user id. */
  id: string
  alertId: string
  /** `pending` | `escalated` — the watchlist only holds open alerts. */
  alertStatus: string
  name: string
  initials: string
  grade: string | null
  tone: RiskTone
  /** 0-100 (`riskLevel` rescaled by the gateway). */
  riskScore: number | null
  direction: Direction | null
  /** 0-100. */
  confidence: number | null
  /**
   * The detail panel's mock-only fields. The backend has none of them —
   * factors are a separate privacy decision (step-15 "Fuera de este step") —
   * so only the `/preview` fixtures fill them.
   */
  factors?: string[]
  protective?: string[]
  mood?: number
  engagement?: number
}

/** Shown where a value is unknown. */
export const UNKNOWN = '—'

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}
