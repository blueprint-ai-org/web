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

/**
 * Fields the join form owns. No password: the person chooses one later, at
 * `/invite`, from the invitation `joinTenant` emails — so the address is proven
 * before a credential exists.
 */
export type JoinField = 'code' | 'name' | 'email'

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

export interface JoinForm {
  code: string
  name: string
  email: string
}

export interface InviteForm {
  password: string
  confirm: string
}

/**
 * The gateway's `passwordPolicy`, read by the server (`password-policy.server.ts`)
 * and handed to this file as data.
 *
 * There used to be a hard-coded minimum of 8 here while authentication
 * enforced 12 for the same act, so a password this screen accepted was refused
 * after the round trip. Reading the rule is what keeps the two from disagreeing
 * again. It stays a UX check: the server applies its own rule regardless.
 *
 * `null` when the policy could not be read. The length checks are then skipped
 * rather than guessed — the server still refuses, and the screen shows its
 * reason.
 */
export interface PasswordPolicy {
  /** In characters (Unicode code points — Go's runes). */
  minLength: number
  /** In UTF-8 BYTES — bcrypt's limit — so a few emoji can exceed it. */
  maxBytes: number
}

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
  /** Without a policy there is no number to give, but the server's rule still is one. */
  passwordTooShort: (min?: number) =>
    min === undefined ? 'That password is too short. Try a longer one.' : `Use at least ${min} characters.`,
  // No number: the limit is in bytes, and a character count would be wrong for
  // anyone typing outside ASCII.
  passwordTooLong: 'That password is too long. Try a shorter one.',
  nameRequired: 'Enter your name.',
  codeRequired: 'Enter the code your school gave you.',
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
 * a stranger at the login screen that our passwords have a minimum length hands
 * them a free constraint. A wrong password comes back from the gateway as
 * `invalid_credentials`; that is the right place for it to be judged.
 *
 * Whitespace is **not** trimmed off the password, here or on `/invite`. A space
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
 * Validate the join form: a code, a name and an email, all present; the email
 * well-shaped. Whitespace-only counts as empty for all three.
 *
 * The code's shape is deliberately not checked. Its alphabet and length are
 * authentication's to choose, and a copy of them here would be one more rule to
 * drift — a wrong code costs one round trip and comes back as
 * `JOIN_CODE_INVALID`.
 */
export function validateJoin(form: JoinForm): FieldErrors<JoinField> {
  const errors: FieldErrors<JoinField> = {}
  if (form.code.trim().length === 0) errors.code = MESSAGES.codeRequired
  if (form.name.trim().length === 0) errors.name = MESSAGES.nameRequired
  const email = emailError(form.email)
  if (email) errors.email = email
  return errors
}

/**
 * The length rule for a password being SET, against the gateway's policy.
 *
 * Measured the way authentication measures it: the minimum in code points
 * (`[...pw]`, not `.length`, which counts UTF-16 units and would call one emoji
 * two characters), the maximum in UTF-8 bytes. `TextEncoder` is in both Node
 * and the browser, so this stays isomorphic.
 */
function newPasswordError(password: string, policy: PasswordPolicy | null): string | undefined {
  if (password.length === 0) return MESSAGES.passwordRequired
  if (policy === null) return undefined
  if ([...password].length < policy.minLength) return MESSAGES.passwordTooShort(policy.minLength)
  if (new TextEncoder().encode(password).length > policy.maxBytes) return MESSAGES.passwordTooLong
  return undefined
}

/**
 * Validate the invitation form: a password within the gateway's
 * {@link PasswordPolicy}, typed twice and matching.
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
export function validateInvite(
  form: InviteForm,
  policy: PasswordPolicy | null,
): FieldErrors<InviteField> {
  const errors: FieldErrors<InviteField> = {}

  const password = newPasswordError(form.password, policy)
  if (password) errors.password = password

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
