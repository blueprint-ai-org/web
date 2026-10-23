/**
 * The counselor dashboard's reads (step-15).
 *
 * ```graphql
 * listSchoolsForUser: ListSchoolsPayload!                       # the caller's schools
 * listGroups(school, status: ACTIVE): ListGroupsPayload!         # the class-health group filter
 * listUsers(filter: { ids }): ListUsersResponse!                 # the groups' owners, by name
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

const COHORT_CLIMATE = gql(`query CohortClimate($scopeType: CohortScopeType!, $scopeId: ID) {
  cohortMetrics(
    scopeType: $scopeType
    scopeId: $scopeId
    metrics: [MOOD_BASELINE, ENGAGEMENT_DELTA, SLEEP_TREND, SUPPORT_INDEX, ROUTINE_CONSISTENCY]
  ) {
    cohortSize
    metrics { metricName score }
  }
  metricDefinitions { name label description }
}`)

const CLASS_GROUPS = gql(`query ClassGroups($school: ID!) {
  listGroups(school: $school, status: ACTIVE, pageSize: 50) {
    groups { id name owner }
  }
}`)

const GROUP_OWNERS = gql(`query GroupOwners($ids: [ID!]!) {
  listUsers(filter: { ids: $ids }, pageSize: 50) {
    users { id display_name first_name last_name }
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
 * The class-climate cards: five cohort metrics on the gateway's 0-100 `score`,
 * labelled by `metricDefinitions`. A metric with no score — too little data,
 * or withheld by the k-anonymity floor — is a null value, never a zero. No
 * school ⇒ `null` (nothing to describe).
 *
 * `group` narrows the scope to one group of `bpClassFilters`; without it the
 * scope is the school, as before. An id the caller does not own answers
 * FORBIDDEN at the gateway, so the route drops ids outside the list first.
 *
 * ponytail: the FIRST school only. Cohort metrics cannot be merged across
 * schools here without double-counting shared students; a school picker is
 * the upgrade.
 */
export async function bpSchoolClimate(
  accessToken: string,
  group?: string,
): Promise<GqlResult<ClassClimate | null>> {
  const schools = await graphql(MY_SCHOOLS, {}, { accessToken })
  if (!schools.ok) return schools

  const school = schools.data.listSchoolsForUser.schools[0]
  if (!school) return { ok: true, data: null }

  const scope = group
    ? ({ scopeType: 'GROUP', scopeId: group } as const)
    : ({ scopeType: 'SCHOOL', scopeId: school.id } as const)
  const result = await graphql(COHORT_CLIMATE, scope, { accessToken })
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

/** One option of the class-health group filter. */
export interface ClassGroup {
  id: string
  /** "Owner name · Group", or just the group when the owner cannot be named. */
  label: string
}

function personName(u: { display_name?: string | null; first_name?: string | null; last_name?: string | null }): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.display_name || ''
}

/**
 * The groups of the caller's first school, labelled by their owning teacher.
 *
 * Two reads: `listGroups`, then ONE `listUsers(filter: { ids })` for every
 * owner at once — `getUser` per group would be one request per class against a
 * 50/hour `/graphql` (see `MAX_SCHOOLS`).
 *
 * A failure anywhere is an EMPTY list, never invented names: a filter that
 * silently narrows to a class that does not exist is worse than no filter.
 * `listUsers` is scope-filtered upstream, so an owner it does not return falls
 * back to the group's own name instead of dropping the group.
 */
export async function bpClassFilters(accessToken: string): Promise<ClassGroup[]> {
  const schools = await graphql(MY_SCHOOLS, {}, { accessToken })
  if (!schools.ok) {
    console.error(`[class-health] listSchoolsForUser failed (${schools.error.kind}): ${schools.error.message}`)
    return []
  }

  const school = schools.data.listSchoolsForUser.schools[0]
  if (!school) return []

  const groups = await graphql(CLASS_GROUPS, { school: school.id }, { accessToken })
  if (!groups.ok) {
    console.error(`[class-health] listGroups failed (${groups.error.kind}): ${groups.error.message}`)
    return []
  }

  const rows = groups.data.listGroups.groups
  if (rows.length === 0) return []

  const owners = await graphql(GROUP_OWNERS, { ids: [...new Set(rows.map((g) => g.owner))] }, { accessToken })
  const nameOf = new Map(
    owners.ok ? owners.data.listUsers.users.map((u) => [u.id, personName(u)] as const) : [],
  )

  return rows.map((g) => {
    const owner = nameOf.get(g.owner)
    return { id: g.id, label: owner ? `${owner} · ${g.name}` : g.name }
  })
}

/** Close an alert. The row leaves the watchlist on the next read. */
export async function bpAcknowledgeRiskAlert(accessToken: string, id: string): Promise<GqlResult<true>> {
  const result = await graphql(ACKNOWLEDGE, { id }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: true }
}
