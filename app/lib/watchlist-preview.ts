/**
 * The `/preview` watchlist: the prototype's five students, as rows. Preview
 * routes have no session, so they keep fixtures; the live route reads
 * `cohortRisk` (`app/lib/bp-ai/dashboard.server.ts`). Already sorted most
 * severe first, as the gateway sorts.
 */

import type { WatchlistRow } from './watchlist'

export const PREVIEW_WATCHLIST: WatchlistRow[] = [
  { id: "1", alertId: "a1", alertStatus: "pending", name: "Emily Martinez", initials: "EM", grade: "10th", tone: "elevated", riskScore: 78, direction: "declining", confidence: 87, mood: 42, engagement: 38, factors: ["Sleep disruption", "Social withdrawal", "Grade decline"], protective: ["Strong family support", "Art club engagement"] },
  { id: "4", alertId: "a4", alertStatus: "pending", name: "Dani Garcia", initials: "DG", grade: "12th", tone: "elevated", riskScore: 71, direction: "declining", confidence: 82, mood: 48, engagement: 45, factors: ["Burnout indicators", "Perfectionism spiral", "Sleep decline"], protective: ["College acceptance", "Counselor relationship"] },
  { id: "2", alertId: "a2", alertStatus: "pending", name: "Josten Thompson", initials: "JT", grade: "11th", tone: "moderate", riskScore: 62, direction: "declining", confidence: 74, mood: 55, engagement: 52, factors: ["Attendance variability", "Mood volatility"], protective: ["Peer connections", "Athletic participation"] },
  { id: "3", alertId: "a3", alertStatus: "pending", name: "Wi Evans", initials: "WE", grade: "9th", tone: "moderate", riskScore: 56, direction: "stable", confidence: 69, mood: 61, engagement: 58, factors: ["New student transition", "Low help-seeking"], protective: ["Academic strength", "Teacher rapport"] },
  { id: "5", alertId: "a5", alertStatus: "pending", name: "Marcus Chen", initials: "MC", grade: "10th", tone: "monitor", riskScore: 28, direction: "improving", confidence: 91, mood: 75, engagement: 82, factors: ["Minor routine inconsistency"], protective: ["Strong peer group", "High self-regulation", "Family stability"] },
]
