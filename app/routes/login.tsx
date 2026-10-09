/**
 * `/login` — credential entry point, the non-LTI way into the app.
 *
 * The action, the error mapping and the cookie handshake landed in Phase 3 and
 * are unchanged; Phase 6 replaced the unstyled placeholder with `LoginScreen`
 * and added one field to the loader's return (`signupEnabled`) so the screen can
 * decide whether to show a link to `/signup`. The client-side half of validation
 * reuses this action's own `validateLogin`, so the two cannot disagree.
 *
 * Sits at top level, **outside `_persona.tsx`** — that layout 401s without a
 * session, which would make the login page unreachable. Same reasoning as
 * `/unsupported-role` (`app/routes.ts:14-16`).
 *
 * See also the `app.all` registration in `server.ts`: with `app.get` the form
 * POST falls through to ltijs and is 401'd, which looks exactly like a working
 * page whose submit button does nothing.
 */

import { redirect } from 'react-router'
import type { Route } from './+types/login'
import { LoginScreen } from '~/components/dashboard/student/auth/LoginScreen'
import { bpLogin, bpSessionFromPayload } from '~/lib/bp-ai/auth.server'
import { isSignupEnabled } from '~/lib/bp-ai/config.server'
import { bpSessionCookie, readBpSession, sealBpSession } from '~/lib/bp-ai/session.server'
import type { BpAiError } from '~/lib/bp-ai/types'
import { validateLogin } from '~/lib/bp-ai/validate'
import type { FieldErrors, LoginField } from '~/lib/bp-ai/validate'

/**
 * Where a successful login lands.
 *
 * Always `/student`, never straight into onboarding: whether onboarding is
 * done lives in `bp_onboarding_done` in **localStorage** (D6), which no server
 * action can read. Phase 7 gives `/student`'s `clientLoader` the redirect into
 * onboarding, because that is the only code that can see the flag.
 */
const AFTER_LOGIN = '/student'

/** Where an already-authenticated visitor to `/login` is sent instead. */
const ALREADY_SIGNED_IN = '/student'

/**
 * The failure shape, following the `{ ok: false, … }` convention of
 * `app/routes/api.theme.tsx:14-18`. Success never produces action data — it is
 * a redirect.
 *
 * `fieldErrors` is per-input; `formError` is the one-line banner for everything
 * that is not attributable to a single field (bad credentials, dead network).
 */
export interface LoginActionData {
  ok: false
  fieldErrors: FieldErrors<LoginField>
  formError?: string
}

/**
 * Map a gateway failure to something a person can act on.
 *
 * Exhaustive by construction — the `never` arm makes adding a
 * `BpAiErrorKind` a compile error here rather than a silent fall-through to a
 * vague message.
 *
 * The `raw` gateway string is never shown. It leaks the internal transport
 * (`rpc error: code = Unknown desc = …`) and, worse, would let this screen
 * distinguish "no such account" from "wrong password" for anyone probing it.
 * One message covers both.
 */
export function loginFormError(error: BpAiError): string {
  switch (error.kind) {
    case 'invalid_credentials':
      return 'That email and password don’t match. Check them and try again.'
    case 'network':
      return 'We couldn’t reach Spark EQ. Check your connection and try again.'
    case 'duplicate_email':
      // Structurally impossible on login — the gateway only emits this for
      // signup. Treated as a contract break, not shown as advice.
      return 'Something went wrong signing you in. Please try again.'
    case 'validation':
      // `BAD_REQUEST: User already authenticated` — we sent a credential to a
      // NO_USER operation. Our bug, not the user's.
      return 'You appear to be signed in already. Reload the page and try again.'
    case 'unauthenticated':
      return 'Your session has expired. Please sign in again.'
    case 'unknown':
      return 'Something went wrong signing you in. Please try again.'
    default: {
      const exhaustive: never = error.kind
      return exhaustive
    }
  }
}

export function meta() {
  return [{ title: 'Log in · Spark EQ' }]
}

/**
 * Bounce an already-authenticated visitor. Two reasons, either sufficient:
 * there is nothing here for them, and `login` is a `NO_USER` operation the
 * gateway would reject anyway.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await readBpSession(request)
  if (session) throw redirect(ALREADY_SIGNED_IN)
  // The only thing the screen needs from the server, and it cannot read it
  // itself: `BP_SIGNUP_ENABLED` is a server env var and nothing in this repo
  // bootstraps env into `window`. Without it the screen would have to guess
  // whether `/signup` exists, and a wrong guess is a link to a 404.
  return { signupEnabled: isSignupEnabled() }
}

/**
 * Read the submitted form, tolerating a body we cannot parse.
 *
 * `request.formData()` **throws** when the `Content-Type` is absent or not a
 * form type ("Content-Type was not one of multipart/form-data or
 * application/x-www-form-urlencoded"), and an unhandled throw in an action
 * surfaces as a 500 with the root error boundary. A real browser form always
 * sends the right header, so this only fires for a malformed client, a
 * truncated upload, or a bare `curl -X POST` — and for all three the honest
 * answer is "we received no fields", which is exactly what an empty `FormData`
 * makes validation say.
 */
async function readFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    return new FormData()
  }
}

export async function action({ request }: Route.ActionArgs) {
  const form = await readFormData(request)
  // Trim the email (a leading space is always a paste artefact) but never the
  // password — whitespace can be a real character in a real one.
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')

  const fieldErrors = validateLogin({ email, password })
  if (Object.keys(fieldErrors).length > 0) {
    // Return before touching the network: a malformed form is not the
    // gateway's problem, and this is what keeps a blank submit off the wire.
    return { ok: false, fieldErrors } satisfies LoginActionData
  }

  const result = await bpLogin(email, password)
  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: {},
      formError: loginFormError(result.error),
    } satisfies LoginActionData
  }

  try {
    const sealed = await sealBpSession(bpSessionFromPayload(result.data))
    return redirect(AFTER_LOGIN, { headers: { 'Set-Cookie': bpSessionCookie(sealed) } })
  } catch (err) {
    // `sealBpSession` throws only on a misconfigured `BP_SESSION_SECRET`. That
    // is a deploy fault, so it must be loud in the log — but an unhandled
    // throw here renders the root error boundary, which tells the user nothing
    // and the operator nothing either.
    console.error('[login] failed to seal bp-session:', err)
    return {
      ok: false,
      fieldErrors: {},
      formError: 'Something went wrong signing you in. Please try again.',
    } satisfies LoginActionData
  }
}

/**
 * The real screen (Phase 6). Every decision it makes about layout, motion and
 * validation lives in `LoginScreen`; this route's job is to hand it the two
 * pieces of server state it cannot see — the action's field errors, and whether
 * `/signup` exists — and nothing else.
 */
export default function LoginRoute({ actionData, loaderData }: Route.ComponentProps) {
  return <LoginScreen actionData={actionData} signupEnabled={loaderData.signupEnabled} />
}
