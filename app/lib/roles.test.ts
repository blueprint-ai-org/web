import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { ROLE_URIS, classifyRole, type RoleClaims } from './roles.ts'

function claims(partial: Partial<RoleClaims>): RoleClaims {
  return {
    roles: partial.roles ?? [],
    customFields: partial.customFields ?? {},
  }
}

describe('classifyRole — custom-field override', () => {
  it('returns counselor when custom_fields.lti_role = "counselor" (even with Instructor URI)', () => {
    const result = classifyRole(
      claims({
        roles: [ROLE_URIS.instructor],
        customFields: { lti_role: 'counselor' },
      }),
    )
    assert.equal(result, 'counselor')
  })

  it('returns counselor case-insensitively when custom_fields.lti_role = "Counselor"', () => {
    const result = classifyRole(
      claims({ customFields: { lti_role: 'Counselor' } }),
    )
    assert.equal(result, 'counselor')
  })
})

describe('classifyRole — URI scan', () => {
  it('returns teacher for the Instructor URI', () => {
    assert.equal(
      classifyRole(claims({ roles: [ROLE_URIS.instructor] })),
      'teacher',
    )
  })

  it('returns student for the Learner URI', () => {
    assert.equal(
      classifyRole(claims({ roles: [ROLE_URIS.learner] })),
      'student',
    )
  })

  it('returns parent for the Mentor URI', () => {
    assert.equal(
      classifyRole(claims({ roles: [ROLE_URIS.mentor] })),
      'parent',
    )
  })

  it('returns admin for the institution Administrator URI', () => {
    assert.equal(
      classifyRole(claims({ roles: [ROLE_URIS.institutionAdmin] })),
      'admin',
    )
  })

  it('returns admin for the system Administrator URI', () => {
    assert.equal(
      classifyRole(claims({ roles: [ROLE_URIS.systemAdmin] })),
      'admin',
    )
  })
})

describe('classifyRole — multi-role precedence', () => {
  it('returns teacher when both Instructor and Learner URIs are present', () => {
    assert.equal(
      classifyRole(
        claims({ roles: [ROLE_URIS.learner, ROLE_URIS.instructor] }),
      ),
      'teacher',
    )
  })
})

describe('classifyRole — unknown fallback', () => {
  it('returns unknown for a non-classifiable URI like Designer', () => {
    assert.equal(
      classifyRole(
        claims({
          roles: [
            'http://purl.imsglobal.org/vocab/lis/v2/membership#Designer',
          ],
        }),
      ),
      'unknown',
    )
  })

  it('returns unknown for empty roles and empty custom fields', () => {
    assert.equal(classifyRole(claims({})), 'unknown')
  })

  it('ignores an unknown lti_role custom value and falls through to URI scan', () => {
    const result = classifyRole(
      claims({
        roles: [ROLE_URIS.instructor],
        customFields: { lti_role: 'wizard' },
      }),
    )
    assert.equal(result, 'teacher')
  })
})

// ---------------------------------------------------------------------------
// step-12 §4 — the admin set is shared with lms-connector's IsAdmin.
// Against the previous code, the Staff case returned 'admin' and the
// custom-field case returned 'admin' too.
// ---------------------------------------------------------------------------
describe('classifyRole — admin recognition (canonical set)', () => {
  it('recognises the bare "Administrator" label Canvas sometimes emits', () => {
    assert.equal(classifyRole(claims({ roles: ['Administrator'] })), 'admin')
  })

  it('does NOT treat institution Staff as an administrator', () => {
    assert.equal(
      classifyRole(claims({ roles: [ROLE_URIS.institutionStaff] })),
      'teacher',
    )
  })

  it('does NOT let custom_fields.lti_role grant admin', () => {
    assert.equal(
      classifyRole(
        claims({ roles: [ROLE_URIS.learner], customFields: { lti_role: 'admin' } }),
      ),
      'student',
    )
  })

  it('platform-asserted admin outranks a custom-field persona', () => {
    assert.equal(
      classifyRole(
        claims({
          roles: [ROLE_URIS.systemAdmin],
          customFields: { lti_role: 'student' },
        }),
      ),
      'admin',
    )
  })
})
