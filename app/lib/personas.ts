/**
 * Which screens a role may see, and where it lands.
 *
 * ## What this replaces
 *
 * `app/lib/roles.ts` and `app/lib/admin-roles.ts`, both deleted. Between them
 * they reimplemented, in the browser-side app, the classification that
 * lms-connector performs on the signed launch: `classifyRole` read the LTI
 * `roles` array and the `custom_fields.lti_role` override, and `hasAdminRole`
 * held a copy of the admin URIs with a comment asking whoever edited one to
 * edit the other. They had already drifted — the tool treated
 * `institution/person#Staff` as an administrator and the service never did, so
 * the same person got two answers from two halves of one product.
 *
 * The role now arrives from the gateway, once: off the session for a credential
 * login, and from `ltiLaunchRole` for a launch (which asks lms-connector's
 * `CanonicalRole`, the one remaining implementation). What is left here is the
 * only part that was ever ours: which of the gateway's eight roles this app has
 * a screen for, and which screen.
 *
 * ## The three roles with no screen
 *
 * `TUTOR`, `SUPPORT` and `SCHOOL_ADMIN` resolve to `null`, which routes to
 * `/unsupported-role`. That is a deliberate dead end rather than a default: a
 * guess here puts a real person in somebody else's app, and `STUDENT` — the
 * tempting default, being the narrowest — is a real persona with real screens
 * and an onboarding flow that would start writing records for them.
 */

import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2/steps'
import { Role } from '~/lib/bp-ai/gql/schema'
import type { KnownRole } from '~/lib/theme-types'

/** A role this app has screens for. A subset of the gateway's `Role`. */
export type Persona = Exclude<KnownRole, 'unknown'>

const PERSONA_BY_ROLE: Partial<Record<Role, Persona>> = {
  [Role.Student]: 'student',
  [Role.Teacher]: 'teacher',
  [Role.Counselor]: 'counselor',
  [Role.Parent]: 'parent',
  [Role.Admin]: 'admin',
}

/**
 * The persona for a role, or `null` when this app has no screens for it.
 *
 * `null` for an absent role too: "we could not establish a role" and "the role
 * has no screens" land in the same place, and the screen there prints what was
 * detected so a support conversation has something to go on.
 */
export function personaFor(role: Role | null | undefined): Persona | null {
  if (!role) return null
  return PERSONA_BY_ROLE[role] ?? null
}

/**
 * Where each persona starts.
 *
 * `admin` lands on the counselor dashboard: a school administrator looking at
 * this app wants the counselor view, and there is no separate admin surface to
 * send them to. It is the one mapping here that is a product decision rather
 * than a rename, which is why it is a table entry and not a `case` buried in
 * three route files — it used to be written out three times, in `app.tsx`,
 * `_index.tsx` and `unsupported-role.tsx`, and `_index.tsx` had already drifted
 * (it hard-coded `/student/onboarding/welcome` instead of the exported first
 * step).
 */
export const PERSONA_PATH: Record<Persona, string> = {
  student: ONBOARDING_FIRST_PATH,
  teacher: '/teacher',
  counselor: '/counselor',
  parent: '/parent',
  admin: '/counselor',
}

/** Where to send someone whose role has no screens. */
export const UNSUPPORTED_PATH = '/unsupported-role'

/** The first screen for a role — `/unsupported-role` when there is none. */
export function pathForRole(role: Role | null | undefined): string {
  const persona = personaFor(role)
  return persona ? PERSONA_PATH[persona] : UNSUPPORTED_PATH
}
