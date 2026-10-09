/**
 * `/signup` — account creation, the other non-LTI entry point.
 *
 * Same shape as `login.tsx`: top-level route outside `_persona.tsx`, registered
 * with `app.all` in `server.ts`. Read that file's header for the reasoning
 * behind both.
 *
 * ⚠️ **Fully built and switched OFF.** The screen is finished and the action is
 * final, but `BP_SIGNUP_ENABLED` defaults to absent and
 * {@link requireSignupEnabled} makes **both the loader and the action** answer
 * 404 while it is — so this route behaves as if it does not exist, for a browser
 * and for a hand-crafted POST alike.
 *
 * The reason is the operation, not the code. Every self-service `signup`
 * provisions a **brand-new tenant** and makes the signer its **`admin`** —
 * measured, five distinct tenants from five signups (see `bpSignup`'s doc
 * comment, `isSignupEnabled()`, and the findings doc). D5 assumes every
 * credential user is a student; D7 assumes no tenant field. A student who signed
 * up here would own an empty school. That is a backend conversation, and the
 * flag is what keeps it from becoming live data in the meantime.
 */

import { redirect } from 'react-router'
import type { Route } from './+types/signup'
import { SignupScreen } from '~/components/dashboard/student/auth/SignupScreen'
import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2'
import { bpSessionFromPayload, bpSignup } from '~/lib/bp-ai/auth.server'
import { isSignupEnabled } from '~/lib/bp-ai/config.server'
import { bpSessionCookie, readBpSession, sealBpSession } from '~/lib/bp-ai/session.server'
import type { BpAiError } from '~/lib/bp-ai/types'
import { validateSignup } from '~/lib/bp-ai/validate'
import type { FieldErrors, SignupField } from '~/lib/bp-ai/validate'

/**
 * Where a successful signup lands.
 *
 * Straight into onboarding, unlike login's `/student`: a brand-new account has
 * demonstrably not completed onboarding, so there is nothing for a
 * `clientLoader` to decide (D6). This is the one destination the server can
 * know for certain.
 */
const AFTER_SIGNUP = ONBOARDING_FIRST_PATH

/** Where an already-authenticated visitor to `/signup` is sent instead. */
const ALREADY_SIGNED_IN = '/student'

/** Failure shape — see the note on `LoginActionData` in `login.tsx`. */
export interface SignupActionData {
  ok: false
  fieldErrors: FieldErrors<SignupField>
  formError?: string
}

/**
 * Map a gateway failure to something a person can act on. Exhaustive by
 * construction, like `loginFormError`.
 *
 * The one arm that genuinely differs from login: `duplicate_email` is the
 * common, expected, recoverable case here, and the message has to point at the
 * recovery. It is also the **only** kind the gateway gives us a machine-readable
 * `extensions.code` for (`EMAIL_ALREADY_REGISTERED`), so it is the one arm not
 * riding on fragile message matching.
 */
export function signupFormError(error: BpAiError): string {
  switch (error.kind) {
    case 'duplicate_email':
      return 'That email already has an account. Try logging in instead.'
    case 'network':
      return 'We couldn’t reach Spark EQ. Check your connection and try again.'
    case 'invalid_credentials':
      // Structurally impossible on signup — there is no credential to check.
      return 'Something went wrong creating your account. Please try again.'
    case 'validation':
      // `BAD_REQUEST: User already authenticated` — a credential reached a
      // NO_USER operation. Our bug, not the user's.
      return 'You appear to be signed in already. Reload the page and try again.'
    case 'unauthenticated':
      return 'Something went wrong creating your account. Please try again.'
    case 'unknown':
      // Where the current gateway outage lands: `signup` answers
      // `rpc error: code = Internal desc = internal error`, which carries no
      // code and matches no known string. A generic retry message is the
      // honest response — we cannot tell the user anything more specific
      // because the gateway did not.
      return 'Something went wrong creating your account. Please try again.'
    default: {
      const exhaustive: never = error.kind
      return exhaustive
    }
  }
}

/**
 * The kill switch, and the only thing in this module that runs before anything
 * else.
 *
 * **Both entry points call it, and the `action` is the one that matters.** A UI
 * gate — hiding the link, not rendering the form — stops nobody: `curl -X POST`
 * with a valid body would still reach `bpSignup` and still provision a real
 * tenant with a real admin on the live gateway. Gating the loader alone would
 * be security theatre with a side effect.
 *
 * **404, not a redirect**, so the route behaves as if it does not exist. A
 * redirect to `/login` would answer 302 and thereby confirm that `/signup` is
 * implemented-but-off, which is a fact about our roadmap that a probe has no
 * business learning; it would also turn a scripted POST into a *successful*
 * request, which reads as "handled" in every log and monitor. `throw new
 * Response('Not Found', { status: 404 })` is the repo's existing idiom for
 * exactly this — `_preview.tsx:26` hides the whole preview tree in production
 * the same way.
 *
 * Read per request rather than captured at module load, so a deploy can flip
 * the flag with a restart and a test can flip it between cases.
 */
function requireSignupEnabled(): void {
  if (!isSignupEnabled()) throw new Response('Not Found', { status: 404 })
}

export function meta() {
  return [{ title: 'Sign up · Spark EQ' }]
}

/**
 * 404 while signup is switched off; otherwise bounce an already-authenticated
 * visitor (`signup` is a `NO_USER` operation the gateway would reject anyway).
 *
 * The flag is checked **before** the session read, so a disabled route answers
 * identically for everyone — a signed-in visitor getting a 302 where a stranger
 * gets a 404 would leak that the route is really there.
 */
export async function loader({ request }: Route.LoaderArgs) {
  requireSignupEnabled()
  const session = await readBpSession(request)
  if (session) throw redirect(ALREADY_SIGNED_IN)
  return null
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
 *
 * Four duplicated lines with `login.tsx` rather than a shared module — a
 * one-function module for this is more machinery than the duplication costs.
 */
async function readFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    return new FormData()
  }
}

export async function action({ request }: Route.ActionArgs) {
  // First line, before the body is even read: while the flag is off, no code
  // path from here can reach `bpSignup`, so no POST can create a tenant.
  requireSignupEnabled()
  const form = await readFormData(request)
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const name = String(form.get('name') ?? '').trim()

  const fieldErrors = validateSignup({ email, password, name })
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors } satisfies SignupActionData
  }

  const result = await bpSignup(email, password, name)
  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: {},
      formError: signupFormError(result.error),
    } satisfies SignupActionData
  }

  try {
    const sealed = await sealBpSession(bpSessionFromPayload(result.data))
    return redirect(AFTER_SIGNUP, { headers: { 'Set-Cookie': bpSessionCookie(sealed) } })
  } catch (err) {
    console.error('[signup] failed to seal bp-session:', err)
    return {
      ok: false,
      fieldErrors: {},
      formError: 'Something went wrong creating your account. Please try again.',
    } satisfies SignupActionData
  }
}

/**
 * The real screen (Phase 6) — built, reviewed, and reachable only when
 * `BP_SIGNUP_ENABLED` is on. It is rendered by the same route whose loader
 * 404s while the flag is off, so this component simply never mounts in that
 * configuration; nothing here needs to know about the flag.
 */
export default function SignupRoute({ actionData }: Route.ComponentProps) {
  return <SignupScreen actionData={actionData} />
}
