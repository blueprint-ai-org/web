/**
 * Canonical definition of "LTI launch role that counts as an administrator".
 *
 * SINGLE SOURCE OF TRUTH. This tool (`classifyRole` in app/lib/roles.ts) and
 * the backend that mints Blueprint credentials from a Canvas launch
 * (`lms-connector/internal/ltiauth/domain/claims_model.go`, `IsAdmin`) MUST
 * recognise exactly the same set. They used to disagree:
 *
 *   - this tool additionally treated `institution/person#Staff` as admin,
 *     which is a school-staff role, not an administrative one; and it let the
 *     `custom_fields.lti_role` install-time override grant `admin` on its own.
 *   - lms-connector additionally accepted the bare label "Administrator", but
 *     did NOT accept `system/person#Administrator` — a real Canvas root-account
 *     admin was therefore an admin here and a non-admin there.
 *
 * The union below is the agreed set. `lms-connector` mirrors it in
 * `RoleAdministrator` / `RoleAdministratorSystem` / `RoleAdministratorShort`;
 * change both sides together.
 */
export const ADMIN_ROLE_IDS: readonly string[] = [
  // IMS LIS v2 institution-level administrator.
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
  // IMS LIS v2 system-level administrator (Canvas root-account admin).
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator',
  // Short label form Canvas emits on some launches.
  'Administrator',
] as const

/** True when any of `roles` is an administrator role. */
export function hasAdminRole(roles: readonly string[] | undefined): boolean {
  if (!roles) return false
  return roles.some((r) => ADMIN_ROLE_IDS.includes(r))
}
