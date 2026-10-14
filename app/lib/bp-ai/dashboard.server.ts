/**
 * The counselor dashboard's reads (step-15).
 *
 * ```graphql
 * listSchoolsForUser: ListSchoolsPayload!                       # the caller's schools
 * cohortRisk(scopeType: SCHOOL, scopeId): CohortRisk!            # ADMIN|TEACHER|COUNSELOR|SCHOOL_ADMIN
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
import { directionOf, initialsOf, TONE_BY_TIER, type WatchlistRow } from '../watchlist'

const MY_SCHOOLS = gql(`query MySchools {
  listSchoolsForUser(pageSize: 1) { schools { id } }
}`)

const COHORT_RISK = gql(`query CohortRiskWatchlist($school: ID!) {
  cohortRisk(scopeType: SCHOOL, scopeId: $school) {
    watchlist {
      user
      alertId
      alertStatus
      tier
      riskScore
      confidence
      direction
      grade
      student { first_name last_name display_name }
    }
  }
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
 * The watchlist of the caller's school.
 *
 * ponytail: the FIRST school only — a counselor of two schools sees one. Merge
 * per-school `cohortRisk` calls when that case is real; each is one more
 * request against a 50/hour `/graphql`.
 */
export async function bpSchoolWatchlist(accessToken: string): Promise<GqlResult<WatchlistRow[]>> {
  const schools = await graphql(MY_SCHOOLS, {}, { accessToken })
  if (!schools.ok) return schools

  const school = schools.data.listSchoolsForUser.schools[0]?.id
  if (!school) return { ok: true, data: [] }

  const risk = await graphql(COHORT_RISK, { school }, { accessToken })
  if (!risk.ok) return risk
  return { ok: true, data: risk.data.cohortRisk.watchlist.map(watchlistRow) }
}

/** Close an alert. The row leaves the watchlist on the next read. */
export async function bpAcknowledgeRiskAlert(accessToken: string, id: string): Promise<GqlResult<true>> {
  const result = await graphql(ACKNOWLEDGE, { id }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: true }
}
