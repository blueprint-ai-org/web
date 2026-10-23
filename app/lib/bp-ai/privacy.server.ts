/**
 * The student's own onboarding and privacy state — both the server's now.
 *
 * ```graphql
 * myPrivacySettings: [PrivacySetting!]!                                   # @auth(type: USER)
 * completeOnboarding: User!                                               # idempotent
 * updateMyPrivacySettings(input: PrivacySettingsInput!): [PrivacySetting!]!
 * ```
 *
 * They used to live in `localStorage` (an onboarding flag and two privacy
 * keys), which meant a second device walked the onboarding again and a privacy toggle
 * was a promise nobody enforced. The gateway now stores them and enforces the
 * privacy ones on every third-party read.
 *
 * No user id travels in any of the three: the gateway resolves the caller from
 * the token, so there is nothing a request could widen.
 *
 * **The rows are the server's, copy included.** Label, description, hint and
 * whether a row can be changed come back with the values, so the screen paints
 * what is enforced rather than a local table that could promise something the
 * gateway does not do.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { PrivacySettingKey } from './gql/graphql'
import type { GqlResult } from './types'

const MY_PRIVACY_SETTINGS = gql(`query MyPrivacySettings {
  myPrivacySettings { key label description hint enabled editable }
}`)

const UPDATE_MY_PRIVACY_SETTINGS = gql(`mutation UpdateMyPrivacySettings($input: PrivacySettingsInput!) {
  updateMyPrivacySettings(input: $input) { key label description hint enabled editable }
}`)

const COMPLETE_ONBOARDING = gql(`mutation CompleteOnboarding {
  completeOnboarding { id onboardingCompletedAt }
}`)

export interface BpPrivacySetting {
  key: PrivacySettingKey
  label: string
  description: string
  hint: string
  enabled: boolean
  /** False for JOURNAL: always private, not a choice. */
  editable: boolean
}

/** The two choices a student can make. Absent ⇒ leave it as it is. */
export interface BpPrivacyChoice {
  mood?: boolean
  classStats?: boolean
}

/** The privacy rows, in the gateway's order. */
export async function bpMyPrivacySettings(accessToken: string): Promise<GqlResult<BpPrivacySetting[]>> {
  const result = await graphql(MY_PRIVACY_SETTINGS, {}, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.myPrivacySettings }
}

/** Store the choices; answers with the rows as they now stand. */
export async function bpUpdateMyPrivacySettings(
  accessToken: string,
  input: BpPrivacyChoice,
): Promise<GqlResult<BpPrivacySetting[]>> {
  const result = await graphql(UPDATE_MY_PRIVACY_SETTINGS, { input }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.updateMyPrivacySettings }
}

/** Mark onboarding done. Idempotent: a second call never moves the date. */
export async function bpCompleteOnboarding(accessToken: string): Promise<GqlResult<string | null>> {
  const result = await graphql(COMPLETE_ONBOARDING, {}, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.completeOnboarding.onboardingCompletedAt ?? null }
}

/** Read a privacy form field: `'true'`/`'false'`, anything else ⇒ not sent. */
export function readChoice(form: FormData): BpPrivacyChoice {
  const bool = (name: string) => {
    const raw = form.get(name)
    return raw === 'true' ? true : raw === 'false' ? false : undefined
  }
  return { mood: bool('mood'), classStats: bool('classStats') }
}
