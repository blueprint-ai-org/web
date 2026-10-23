/**
 * The counselor dashboard's reads (step-15).
 *
 * ```graphql
 * listSchoolsForUser: ListSchoolsPayload!                       # the caller's schools
 * cohortRisk(scopeType: SCHOOL, scopeId): CohortRisk!            # ADMIN|TEACHER|COUNSELOR|SCHOOL_ADMIN
 * cohortMetrics(scopeType: SCHOOL, scopeId, metrics): …          # same roles; k-anonymity applied upstream
 * metricDefinitions: [MetricDefinition!]!                        # label + description of each metric
 * acknowledgeRiskAlert(id): RiskAlert!                           # ADMIN|COUNSELOR|SCHOOL_ADMIN
 * ```
 *
 * The watchlist is sorted by the gateway (risk level, then newest alert) and
 * holds only members with an OPEN alert; the screen does not re-sort it.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { CohortRiskWatchlistQuery } from './gql/graphql'
import type { GqlResult } from './types'
import { directionOf, initialsOf, TONE_BY_TIER, UNKNOWN, type WatchlistRow } from '../watchlist'
import type { ClassClimate } from '../class-climate'

/**
 * ponytail: a counselor in more than this many schools sees the first five —
 * each school is one more `cohortRisk` against a 50/hour `/graphql`.
 */
const MAX_SCHOOLS = 5

const MY_SCHOOLS = gql(`query MySchools {
  listSchoolsForUser(pageSize: 5) { schools { id name } }
}`)

const COHORT_RISK = gql(`query CohortRiskWatchlist($school: ID!) {
  cohortRisk(scopeType: SCHOOL, scopeId: $school) {
    watchlist {
      user
      alertId
      alertStatus
      alertCreatedAt
      tier
      riskLevel
      riskScore
      confidence
      direction
      grade
      student { first_name last_name display_name }
    }
  }
}`)

const SCHOOL_CLIMATE = gql(`query SchoolClimate($school: ID!) {
  cohortMetrics(
    scopeType: SCHOOL
    scopeId: $school
    metrics: [MOOD_BASELINE, ENGAGEMENT_DELTA, SLEEP_TREND, SUPPORT_INDEX, ROUTINE_CONSISTENCY]
  ) {
    cohortSize
    metrics { metricName score }
  }
  metricDefinitions { name label description }
}`)

const ACKNOWLEDGE = gql(`mutation AcknowledgeRiskAlert($id: ID!) {
  acknowledgeRiskAlert(id: $id) { id }
}`)

type Entry = CohortRiskWatchlistQuery['cohortRisk']['watchlist'][number]

/** A row from one watchlist entry. A student we cannot name shows their id. */
export function watchlistRow(e: Entry): WatchlistRow {
  const s = e.student
  const name =
    [s?.first_name, s?.last_name].filter(Boolean).join(' ') || s?.display_name || e.user
  return {
    id: e.user,
    alertId: e.alertId,
    alertStatus: e.alertStatus,
    name,
    initials: initialsOf(name),
    grade: e.grade ?? null,
    tone: TONE_BY_TIER[e.tier],
    riskScore: e.riskScore ?? null,
    direction: directionOf(e.direction),
    confidence: e.confidence ?? null,
  }
}

/**
 * The watchlist of the caller's schools: one `cohortRisk` per school, merged.
 * A student in two schools appears once; the merge keeps the gateway's order
 * (risk level, then newest alert). Any school failing fails the read.
 */
export async function bpSchoolWatchlist(accessToken: string): Promise<GqlResult<WatchlistRow[]>> {
  const schools = await graphql(MY_SCHOOLS, {}, { accessToken })
  if (!schools.ok) return schools

  const ids = schools.data.listSchoolsForUser.schools.slice(0, MAX_SCHOOLS).map((s) => s.id)
  const results = await Promise.all(ids.map((school) => graphql(COHORT_RISK, { school }, { accessToken })))

  const entries: Entry[] = []
  for (const r of results) {
    if (!r.ok) return r
    entries.push(...r.data.cohortRisk.watchlist)
  }

  entries.sort((a, b) => b.riskLevel - a.riskLevel || b.alertCreatedAt.localeCompare(a.alertCreatedAt))
  const seen = new Set<string>()
  const unique = entries.filter((e) => !seen.has(e.user) && seen.add(e.user))
  return { ok: true, data: unique.map(watchlistRow) }
}

/**
 * The class-climate cards: the caller's school's five cohort metrics on the
 * gateway's 0-100 `score`, labelled by `metricDefinitions`. A metric with no
 * score — too little data, or withheld by the k-anonymity floor — is a null
 * value, never a zero. No school ⇒ `null` (nothing to describe).
 *
 * ponytail: the FIRST school only. Cohort metrics cannot be merged across
 * schools here without double-counting shared students; a school picker is
 * the upgrade.
 */
export async function bpSchoolClimate(accessToken: string): Promise<GqlResult<ClassClimate | null>> {
  const schools = await graphql(MY_SCHOOLS, {}, { accessToken })
  if (!schools.ok) return schools

  const school = schools.data.listSchoolsForUser.schools[0]
  if (!school) return { ok: true, data: null }

  const result = await graphql(SCHOOL_CLIMATE, { school: school.id }, { accessToken })
  if (!result.ok) return result

  const { cohortMetrics, metricDefinitions } = result.data
  const scores = new Map(cohortMetrics.metrics.map((m) => [m.metricName, m.score ?? null]))
  return {
    ok: true,
    data: {
      subtitle: `${school.name} • ${cohortMetrics.cohortSize ?? UNKNOWN} Students`,
      dimensions: metricDefinitions.map((d) => ({
        name: d.label,
        description: d.description,
        value: scores.get(d.name) ?? null,
      })),
    },
  }
}

/** Close an alert. The row leaves the watchlist on the next read. */
export async function bpAcknowledgeRiskAlert(accessToken: string, id: string): Promise<GqlResult<true>> {
  const result = await graphql(ACKNOWLEDGE, { id }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: true }
}
