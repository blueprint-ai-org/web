/**
 * `/invite` — redeem an invitation, choose a password, land signed in.
 *
 * The third credential entry point, and the first one that can give a
 * **student** a login. `/login` needs a password that already exists; `/signup`
 * is finished and switched off because the gateway's `signup` provisions a new
 * tenant and makes the signer its `admin` (see `signup.tsx`). This route is the
 * shape D5 always assumed: an admin creates the person inside their school,
 * the platform emails them a single-use token, and redeeming it sets the
 * password and returns a full session — with the role they were created with
 * and only that role.
 *
 * Same structural rules as its two siblings: top-level, **outside
 * `_persona.tsx`** (that layout 401s without a session, which would make this
 * page unreachable to exactly the people who need it), and registered with
 * `app.all` in `server.ts` — with `app.get` the form POST falls through to
 * ltijs and is 401'd, which looks exactly like a working page whose button does
 * nothing.
 *
 * ## Two things this route deliberately does not do
 *
 * **It does not bounce a visitor who already has a session.** `/login` and
 * `/signup` both redirect an authenticated visitor away, and here that would be
 * wrong: the token names a *specific person*, and the device most likely to be
 * carrying a stale `bp-session` is a shared or family one. Somebody accepting
 * an invitation on it is not the person the old cookie belongs to. The call is
 * `NO_USER`, so the held session is never sent; a successful redemption
 * replaces the cookie, which is the correct outcome rather than a surprising
 * one.
 *
 * **It does not verify the token before rendering.** There is no operation that
 * inspects one — `acceptInvitation` is all-or-nothing and single use, so asking
 * would spend it. An expired or spent token is therefore discovered at submit,
 * and {@link inviteFormError} is where that is made legible.
 */

import { redirect } from 'react-router'
import type { Route } from './+types/invite'
import { InviteScreen } from '~/components/dashboard/student/auth/InviteScreen'
import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2'
import { bpAcceptInvitation, bpSessionFromPayload } from '~/lib/bp-ai/auth.server'
import { bpSessionCookie, sealBpSession } from '~/lib/bp-ai/session.server'
import type { BpAiError } from '~/lib/bp-ai/types'
import { validateInvite } from '~/lib/bp-ai/validate'
import type { FieldErrors, InviteField } from '~/lib/bp-ai/validate'

/** The query parameter the invitation link carries. */
export const TOKEN_PARAM = 'token'

/**
 * Where a redeemed invitation lands.
 *
 * Onboarding, like signup and unlike login: an account that did not exist a
 * moment ago has demonstrably not completed onboarding, so there is nothing for
 * a `clientLoader` to decide against `bp_onboarding_done` in localStorage (D6).
 * This is the one destination the server can know for certain.
 */
const AFTER_ACCEPT = ONBOARDING_FIRST_PATH

/** Failure shape — see the note on `LoginActionData` in `login.tsx`. */
export interface InviteActionData {
  ok: false
  fieldErrors: FieldErrors<InviteField>
  formError?: string
}

/**
 * Map a gateway failure to something a person can act on. Exhaustive by
 * construction, like `loginFormError` and `signupFormError`.
 *
 * **`unauthenticated` is the load-bearing arm, and it does not mean what it
 * means on the other two screens.** Measured against `api-test` on 2026-09-22:
 * a token the platform will not redeem answers
 * `UNAUTHORIZED` / "Authentication required" / `grpc_code: Unauthenticated` —
 * which `classifyKind` folds into `unauthenticated`, the same kind an expired
 * *session* produces elsewhere. Here there is no session: the request carries
 * no credential at all except the token, so "not authenticated" can only be a
 * statement about the token, and the copy has to be about the link rather than
 * about signing in again.
 *
 * `validation` gets the identical sentence. A `BAD_REQUEST` on the other two
 * screens is our bug — a credential sent to a `NO_USER` operation — but this
 * action never sends one, so the only thing left for the gateway to call
 * invalid is the token. Two kinds, one cause the user can see, one recovery.
 *
 * The sentence names all three documented ways a token dies — expired, already
 * redeemed, invalidated by a re-invitation — without claiming to know which,
 * because the gateway does not say and the recovery is the same for all three.
 */
export function inviteFormError(error: BpAiError): string {
  switch (error.kind) {
    case 'unauthenticated':
    case 'validation':
      return 'That invitation link has expired or has already been used. Ask your school to send you a new one.'
    case 'network':
      return 'We couldn’t reach Spark EQ. Check your connection and try again.'
    case 'duplicate_email':
      // Structurally impossible — this operation creates no account and takes
      // no address. Treated as a contract break, not shown as advice.
      return 'Something went wrong setting your password. Please try again.'
    case 'invalid_credentials':
      // Likewise: there is no password to check, only one to set.
      return 'Something went wrong setting your password. Please try again.'
    case 'unknown':
      return 'Something went wrong setting your password. Please try again.'
    default: {
      const exhaustive: never = error.kind
      return exhaustive
    }
  }
}

export function meta() {
  return [{ title: 'Set your password · Spark EQ' }]
}

/**
 * Hand the screen the token from the link, and nothing else.
 *
 * Trimmed because a token pasted out of an email client arrives with whitespace
 * often enough to be worth one `.trim()`; `''` for a visitor with no token at
 * all, which the screen renders as an explanation rather than a form.
 */
export function loader({ request }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get(TOKEN_PARAM)?.trim() ?? ''
  return { token }
}

/** See the note on `readFormData` in `login.tsx`. */
async function readFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    return new FormData()
  }
}

export async function action({ request }: Route.ActionArgs) {
  const form = await readFormData(request)
  const token = String(form.get(TOKEN_PARAM) ?? '').trim()
  // Never trimmed — whitespace can be a real character in a real password, and
  // this is the submit that decides what the password *is*.
  const password = String(form.get('password') ?? '')
  const confirm = String(form.get('confirm') ?? '')

  const fieldErrors = validateInvite({ password, confirm })
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors } satisfies InviteActionData
  }

  // A POST with no token cannot succeed, and spending a round trip to be told
  // so would burn nothing but would also let a scripted probe use this route to
  // ask the gateway questions. The screen only renders the form when it has a
  // token, so reaching here without one means a hand-built request.
  if (token.length === 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: 'That invitation link is missing its token. Open the link from your email again.',
    } satisfies InviteActionData
  }

  const result = await bpAcceptInvitation(token, password)
  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: {},
      formError: inviteFormError(result.error),
    } satisfies InviteActionData
  }

  try {
    const sealed = await sealBpSession(bpSessionFromPayload(result.data))
    return redirect(AFTER_ACCEPT, { headers: { 'Set-Cookie': bpSessionCookie(sealed) } })
  } catch (err) {
    // `sealBpSession` throws only on a misconfigured `BP_SESSION_SECRET` — a
    // deploy fault, so it must be loud in the log. It is also the worst moment
    // for one: the token has just been spent, so "try again" is advice the user
    // cannot take. The message says what actually helps.
    console.error('[invite] failed to seal bp-session:', err)
    return {
      ok: false,
      fieldErrors: {},
      formError:
        'Your password was set, but we couldn’t sign you in. Try logging in with it, or ask your school for help.',
    } satisfies InviteActionData
  }
}

export default function InviteRoute({ actionData, loaderData }: Route.ComponentProps) {
  return <InviteScreen token={loaderData.token} actionData={actionData} />
}
