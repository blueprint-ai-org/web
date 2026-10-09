/**
 * Credential-form validation — the first validation code in the student flow.
 *
 * **Isomorphic and pure.** No `.server` suffix, no `process.env`, no imports:
 * the same functions reject a bad POST body in the route action (this phase)
 * and drive inline field feedback in the browser (Phase 6). Keep it that way —
 * the moment this file touches a server-only API it stops being usable on the
 * client and the two sides start disagreeing about what "valid" means.
 *
 * The contract is deliberately narrow: **shape only**. Whether an account
 * exists, whether a password is right, whether an email is already taken —
 * none of that is knowable here, and all of it comes back from the gateway as a
 * `BpAiError` for the route action to map. Anything this file rejects, the API
 * never has to see.
 *
 * An empty returned object means valid. Callers branch on
 * `Object.keys(errors).length === 0`.
 */

/** Fields the login form owns. */
export type LoginField = 'email' | 'password'

/** Fields the signup form owns. `name` is required; there is no org/tenant field (D7). */
export type SignupField = 'email' | 'password' | 'name'

/**
 * Fields the invitation form owns.
 *
 * **No email field, and that is the point.** `acceptInvitation(token, password)`
 * takes no address: the token already names the person, and the address the
 * invitation was sent to is the address it is bound to. An email input here
 * would be a box whose contents are ignored — or worse, one a user could type a
 * *different* address into and reasonably expect to mean something.
 */
export type InviteField = 'password' | 'confirm'

/**
 * Field-keyed messages, ready to render next to an input. Partial because the
 * happy path is `{}` and each field is independently valid or not.
 */
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  name: string
}

export interface InviteForm {
  password: string
  confirm: string
}

/**
 * Minimum password length on **signup only**.
 *
 * The gateway enforces no policy we could observe — the Phase 0 spike created
 * accounts freely — so this is our floor, not its. Exported so Phase 6's
 * helper text and this rule cannot drift.
 */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Deliberately permissive: one `@`, a dot in the domain, no whitespace.
 *
 * A UI-grade check, not RFC 5322. Its only job is to catch the typo the user
 * can still fix on this screen — a missing `@`, a trailing space, `gmail.con`
 * is not our business. Anything stricter starts rejecting valid addresses,
 * which is a worse failure than one wasted round-trip to a gateway that
 * answers `invalid credentials` anyway.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MESSAGES = {
  emailRequired: 'Enter your email address.',
  emailShape: "That doesn't look like an email address.",
  passwordRequired: 'Enter your password.',
  passwordTooShort: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  nameRequired: 'Enter your name.',
  confirmRequired: 'Type your password again.',
  confirmMismatch: 'Those passwords don’t match.',
} as const

/**
 * Email is validated on its trimmed value everywhere. Callers should trim
 * before storing too — a leading space in an email is always a paste artefact,
 * never intent.
 */
function emailError(email: string): string | undefined {
  const value = email.trim()
  if (value.length === 0) return MESSAGES.emailRequired
  if (!EMAIL_SHAPE.test(value)) return MESSAGES.emailShape
  return undefined
}

/**
 * Validate the login form.
 *
 * **Presence only on the password** — no length rule. Two reasons: an account
 * created before any policy existed must still be able to log in, and telling
 * a stranger at the login screen that our passwords are ≥8 characters hands
 * them a free constraint. A wrong password comes back from the gateway as
 * `invalid_credentials`; that is the right place for it to be judged.
 *
 * Whitespace is **not** trimmed off the password, here or on signup. A space
 * can be a real character in a real password.
 */
export function validateLogin(form: LoginForm): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {}
  const email = emailError(form.email)
  if (email) errors.email = email
  if (form.password.length === 0) errors.password = MESSAGES.passwordRequired
  return errors
}

/**
 * Validate the signup form: email shape, password ≥ {@link MIN_PASSWORD_LENGTH},
 * non-empty name. A name of only whitespace is empty.
 *
 * `password` reports "required" when blank rather than "too short", because
 * "use at least 8 characters" next to an untouched field reads as a scold
 * rather than as help.
 */
export function validateSignup(form: SignupForm): FieldErrors<SignupField> {
  const errors: FieldErrors<SignupField> = {}
  const email = emailError(form.email)
  if (email) errors.email = email

  if (form.password.length === 0) {
    errors.password = MESSAGES.passwordRequired
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = MESSAGES.passwordTooShort
  }

  if (form.name.trim().length === 0) errors.name = MESSAGES.nameRequired
  return errors
}

/**
 * Validate the invitation form: a password at or above
 * {@link MIN_PASSWORD_LENGTH}, typed twice and matching.
 *
 * Same floor as signup, because it is the same act — choosing a password for a
 * new credential — and a person who was invited should not meet a different
 * rule from a person who signed up.
 *
 * **The confirmation field is ours, not the API's.** `acceptInvitation` takes
 * one password and the token is single use, so a typo is not a login the user
 * can retry: it is a credential they now hold and do not know, recoverable only
 * through a password reset they would have to know to ask for. That asymmetry
 * is what earns the second field here when `/login` has none.
 *
 * The mismatch is reported on `confirm` rather than on `password`: the field
 * the user is looking at when they finish typing is the one the message belongs
 * beside, and the first field is not the one more likely to be wrong.
 */
export function validateInvite(form: InviteForm): FieldErrors<InviteField> {
  const errors: FieldErrors<InviteField> = {}

  if (form.password.length === 0) {
    errors.password = MESSAGES.passwordRequired
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = MESSAGES.passwordTooShort
  }

  if (form.confirm.length === 0) {
    errors.confirm = MESSAGES.confirmRequired
  } else if (errors.password === undefined && form.confirm !== form.password) {
    // Only once the password itself is valid. "Those passwords don’t match"
    // under a password that is too short describes a problem the user cannot
    // fix without first fixing the other one.
    errors.confirm = MESSAGES.confirmMismatch
  }

  return errors
}
