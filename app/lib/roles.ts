/**
 * LTI launch role classifier.
 *
 * Maps the `roles` array + `custom_fields` from an LTI 1.3 launch into one of
 * six application personas. Pure function — no I/O, no globals.
 *
 * Precedence (per sub-plan D, Q7 hybrid decision):
 *   1. `customFields.lti_role` (case-insensitive) wins if it matches a known
 *      persona. This is set by the Canvas admin at install time on a per-
 *      placement basis and is the most explicit signal.
 *   2. IMS LIS v2 role URI scan. Within URIs:
 *      - Instructor → teacher (wins over Learner in multi-role launches)
 *      - Learner → student
 *      - Mentor → parent (Canvas "Observer")
 *      - institution-or-system #Administrator → admin
 *   3. Fallback → 'unknown'.
 *
 * Admin recognition is delegated to `admin-roles.ts`, the single source of
 * truth shared with lms-connector's `CanvasLtiClaims.IsAdmin`. Do not inline
 * an admin URI here.
 */

export type KnownRole =
  | 'teacher'
  | 'counselor'
  | 'student'
  | 'parent'
  | 'admin'
  | 'unknown'

import { hasAdminRole } from './admin-roles.js'

export type RoleClaims = {
  roles: string[]
  customFields: Record<string, string>
}

/**
 * IMS LIS v2 role URIs. Declared once so tests + production share the same
 * source-of-truth strings.
 */
export const ROLE_URIS = {
  instructor: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  learner: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  mentor: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor',
  institutionAdmin:
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
  systemAdmin:
    'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator',
  // Institution-level fallbacks. Canvas sends these on launches from
  // non-course contexts (Account Navigation, Global Navigation), where
  // membership#* URIs are absent because there's no enrollment in scope.
  institutionStudent:
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student',
  institutionFaculty:
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Faculty',
  institutionInstructor:
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor',
  institutionStaff:
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Staff',
} as const

// `admin` is deliberately absent: the custom field is launch-payload data and
// must never be able to grant the privileged persona on its own. An admin
// launch is recognised from the platform-asserted roles array (see
// admin-roles.ts), which is signed by the platform.
const KNOWN_CUSTOM_ROLES: ReadonlySet<KnownRole> = new Set([
  'teacher',
  'counselor',
  'student',
  'parent',
])

function isKnownCustomRole(value: string): value is KnownRole {
  return KNOWN_CUSTOM_ROLES.has(value as KnownRole)
}

export function classifyRole(claims: RoleClaims): KnownRole {
  const roles = claims.roles ?? []

  // 0. Platform-asserted admin wins outright — it is the only signal that is
  //    signed by the platform and it must match lms-connector's view.
  if (hasAdminRole(roles)) return 'admin'

  // 1. Custom-field override (case-insensitive). Cannot yield 'admin'.
  const rawCustom = claims.customFields?.lti_role
  if (typeof rawCustom === 'string') {
    const normalized = rawCustom.trim().toLowerCase()
    if (isKnownCustomRole(normalized)) return normalized
  }

  // 2. Membership URI scan (course-level). Instructor takes precedence over
  //    Learner in mixed launches.
  if (roles.includes(ROLE_URIS.instructor)) return 'teacher'
  if (roles.includes(ROLE_URIS.learner)) return 'student'
  if (roles.includes(ROLE_URIS.mentor)) return 'parent'

  // 3. Institution-level fallbacks for launches without a course context.
  if (
    roles.includes(ROLE_URIS.institutionFaculty) ||
    roles.includes(ROLE_URIS.institutionInstructor)
  ) {
    return 'teacher'
  }
  if (roles.includes(ROLE_URIS.institutionStudent)) return 'student'
  // Staff is school staff, not an administrator — it used to map to 'admin'
  // here while lms-connector never accepted it. Treated as faculty-adjacent.
  if (roles.includes(ROLE_URIS.institutionStaff)) return 'teacher'

  // 4. Fallback.
  return 'unknown'
}
