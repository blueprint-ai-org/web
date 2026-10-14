/**
 * `/signup` — join my school: a student asks to join the school whose join
 * code they were given.
 *
 * Same shape as `login.tsx`: top-level route outside `_persona.tsx`, registered
 * with `app.all` in `server.ts`. Read that file's header for the reasoning
 * behind both.
 *
 * **No password here, and no session at the end.** `joinTenant(code, email,
 * name)` creates the student in the code's school and emails them an ordinary
 * invitation; they choose a password when they redeem it at `/invite`. So the
 * address is verified by the same channel as an admin's invitation, and this
 * anonymous screen never handles a credential. Success is therefore a "check
 * your email" state, not a redirect.
 *
 * Creating a tenant is not this app's job: the gateway's `signup` (which makes
 * the signer the admin of a brand-new school) is not called from here at all.
 */

import { redirect } from 'react-router'
import type { Route } from './+types/signup'
import { SignupScreen } from '~/components/dashboard/student/auth/SignupScreen'
import { bpJoinTenant } from '~/lib/bp-ai/auth.server'
import { readBpSession } from '~/lib/bp-ai/session.server'
import type { BpAiError } from '~/lib/bp-ai/types'
import { validateJoin } from '~/lib/bp-ai/validate'
import type { FieldErrors, JoinField } from '~/lib/bp-ai/validate'

/** Where an already-authenticated visitor to `/signup` is sent instead. */
const ALREADY_SIGNED_IN = '/student'

/**
 * The code was not accepted. Shown under the code field, and deliberately
 * the same sentence for a code that never existed, was revoked or expired —
 * the gateway does not distinguish them either.
 */
export const JOIN_CODE_INVALID_MESSAGE = 'That code isn’t valid. Check it with your school.'

/** Failure shape — see the note on `LoginActionData` in `login.tsx`. */
export interface SignupActionData {
  ok: false
  fieldErrors: FieldErrors<JoinField>
  formError?: string
}

/**
 * Success: the invitation is on its way — or, for an address that already has
 * an account, deliberately nothing is, and the screen says the same thing
 * (the gateway answers `true` either way; see `bpJoinTenant`).
 */
export interface SignupSentData {
  ok: true
  email: string
}

/**
 * Map a gateway failure to something a person can act on. Exhaustive by
 * construction, like `loginFormError`.
 *
 * `JOIN_CODE_INVALID` never reaches here: the action puts it under the code
 * field, which is where the user has to act.
 */
export function joinFormError(error: BpAiError): string {
  switch (error.kind) {
    case 'network':
      return 'We couldn’t reach Spark EQ. Check your connection and try again.'
    case 'unreachable':
      return 'Spark EQ is temporarily unavailable. Please try again in a moment.'
    case 'validation':
      return 'Check your code, name and email, and try again.'
    case 'duplicate_email':
      // Structurally impossible: an address that already has an account is
      // answered `true`, by design, so this screen cannot confirm it exists.
    case 'invalid_credentials':
    case 'unauthenticated':
    case 'not_permitted':
    case 'invitation_invalid':
    case 'unknown':
      return 'Something went wrong joining your school. Please try again.'
    default: {
      const exhaustive: never = error.kind
      return exhaustive
    }
  }
}

export function meta() {
  return [{ title: 'Join your school · Spark EQ' }]
}

/**
 * Bounce an already-authenticated visitor: there is nothing here for them, and
 * `joinTenant` is a `NO_USER` operation.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await readBpSession(request)
  if (session) throw redirect(ALREADY_SIGNED_IN)
  return null
}

/**
 * Read the submitted form, tolerating a body we cannot parse — see the note on
 * `readFormData` in `login.tsx`.
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
  const code = String(form.get('code') ?? '').trim()
  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim()

  const fieldErrors = validateJoin({ code, name, email })
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors } satisfies SignupActionData
  }

  const result = await bpJoinTenant(code, email, name)
  if (!result.ok) {
    if (result.error.reason === 'JOIN_CODE_INVALID') {
      return { ok: false, fieldErrors: { code: JOIN_CODE_INVALID_MESSAGE } } satisfies SignupActionData
    }
    return {
      ok: false,
      fieldErrors: {},
      formError: joinFormError(result.error),
    } satisfies SignupActionData
  }
  return { ok: true, email } satisfies SignupSentData
}

export default function SignupRoute({ actionData }: Route.ComponentProps) {
  return <SignupScreen actionData={actionData} />
}
