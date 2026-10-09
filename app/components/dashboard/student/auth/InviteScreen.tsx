import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Form, useNavigation } from 'react-router'

import { MIN_PASSWORD_LENGTH, validateInvite } from '~/lib/bp-ai/validate'
import type { FieldErrors, InviteField } from '~/lib/bp-ai/validate'

import { useEnterAnimation } from '../hooks/useEnterAnimation'
import type { OnboardingMotion } from '../onboarding-v2/transitions'

import { AuthCta, AuthField, AuthFormError } from './AuthPrimitives'
import {
  AUTH_SCREEN_CSS,
  AuthEyebrow,
  AuthMascot,
  AuthStage,
  AuthSwitchLink,
  AuthTitle,
  useAuthShake,
} from './AuthStage'

/**
 * `/invite` — the screen an invited person lands on, straight from their email.
 *
 * Structurally {@link SignupScreen} with the three fields replaced by two, and
 * read that file's header (and `LoginScreen`'s) for everything the three share:
 * the `NameScreen` recipe, the RR7 `<Form>`, the isomorphic client validation,
 * the stale-banner rule.
 *
 * **What it does not ask for is the interesting part.** No email, no name, no
 * school: `acceptInvitation(token, password)` takes a token and a password, and
 * the token already names the person, their school and their role. Everything
 * else on this screen would be a field whose value is discarded. The person is
 * *choosing a password*, not filling in a form — so the screen asks for exactly
 * that, twice.
 *
 * **The confirmation field is ours, not the API's.** The token is single use:
 * a typo'd password is not a retry, it is a credential the invitee now holds
 * and cannot guess. See `validateInvite`.
 *
 * **Two states, and the second is not an error page.** Arriving with no token
 * is the ordinary consequence of opening `/invite` by hand, or of an email
 * client that mangled the link — so the tokenless state explains where the link
 * comes from and offers `/login`, rather than rendering a form that cannot
 * possibly succeed. It is not styled as a failure, because nothing has failed
 * yet.
 */

/**
 * Where the mascot sits on the 1194×834 canvas.
 *
 * Login's position, not signup's: this column has two fields, the same height
 * as login's, and the mascot tracks the form.
 */
const MASCOT = { left: 168, top: 330, size: 132 } as const

export interface InviteScreenProps {
  /**
   * The invitation token, from `?token=` — `''` when the visitor arrived
   * without one.
   *
   * It rides in a hidden input rather than being re-read from the URL by the
   * action: the value the user's browser showed them is the value that gets
   * redeemed, and a form POST carries it even where the redirect chain would
   * have dropped the query string.
   */
  token: string
  /** `useActionData()` from the route. `undefined` until a submit fails. */
  actionData?: {
    fieldErrors: FieldErrors<InviteField>
    formError?: string
  }
}

export function InviteScreen({ token, actionData }: InviteScreenProps) {
  const { entered, phase2 } = useEnterAnimation({ phase2Delay: 260 })
  const motion: OnboardingMotion = { enterKind: 'fade', entered, phase2, exit: null }

  const navigation = useNavigation()
  const pending = navigation.state !== 'idle' && navigation.formMethod != null

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [clientErrors, setClientErrors] = useState<FieldErrors<InviteField>>({})
  const [edited, setEdited] = useState<Partial<Record<InviteField, true>>>({})
  const [staleBanner, setStaleBanner] = useState(false)

  const { ref: columnRef, shake } = useAuthShake()
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const confirmRef = useRef<HTMLInputElement | null>(null)

  const serverFieldErrors = actionData?.fieldErrors ?? {}

  function errorFor(field: InviteField): string | undefined {
    return clientErrors[field] ?? (edited[field] ? undefined : serverFieldErrors[field])
  }

  useEffect(() => {
    if (!actionData) return
    setStaleBanner(false)
    shake()
  }, [actionData, shake])

  function change(field: InviteField, setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setClientErrors((prev) => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }))
      setEdited((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateInvite({ password, confirm })
    if (Object.keys(errors).length === 0) return
    event.preventDefault()
    setClientErrors(errors)
    setEdited({})
    setStaleBanner(true)
    shake()
    ;(errors.password ? passwordRef.current : confirmRef.current)?.focus()
  }

  return (
    <AuthStage slug="invite" motion={motion}>
      <style>{AUTH_SCREEN_CSS}</style>

      <AuthMascot left={MASCOT.left} top={MASCOT.top} size={MASCOT.size} entered={phase2} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 120px 96px',
          textAlign: 'center',
        }}
      >
        <AuthEyebrow />

        {token.length === 0 ? (
          <NoToken />
        ) : (
          <>
            <AuthTitle>Pick a password</AuthTitle>

            <Form
              method="post"
              onSubmit={onSubmit}
              noValidate
              style={{ width: '100%', maxWidth: 480 }}
            >
              <input type="hidden" name="token" value={token} />

              <div
                ref={columnRef}
                style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}
              >
                <AuthFormError message={staleBanner ? undefined : actionData?.formError} />

                {/* No placeholder — see the note in `LoginScreen`. */}
                <AuthField
                  name="password"
                  label="Your new password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  inputRef={passwordRef}
                  value={password}
                  onValueChange={change('password', setPassword)}
                  error={errorFor('password')}
                  hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                />

                <AuthField
                  name="confirm"
                  label="Type it again"
                  type="password"
                  autoComplete="new-password"
                  inputRef={confirmRef}
                  value={confirm}
                  onValueChange={change('confirm', setConfirm)}
                  error={errorFor('confirm')}
                />
              </div>

              <AuthCta
                label="Set my password"
                pending={pending}
                pendingLabel="Setting your password…"
                bottom={48}
              />
            </Form>
          </>
        )}
      </div>
    </AuthStage>
  )
}

/**
 * What `/invite` shows without a token.
 *
 * Deliberately not an error: the invitation link is the only thing that carries
 * a token, so somebody here without one has simply not used it — which the copy
 * says, in the order they need it (what this page is for, where the link is,
 * what to do if they already have a password).
 */
function NoToken() {
  return (
    <>
      <AuthTitle>Check your email</AuthTitle>
      <p
        data-testid="invite-no-token"
        style={{
          maxWidth: 480,
          margin: 0,
          fontFamily: 'var(--font-student-body)',
          fontSize: 18,
          fontWeight: 500,
          lineHeight: 1.5,
          color: 'var(--color-student-gray-200)',
        }}
      >
        Your school sends an invitation email with a link that opens this page and lets you pick a
        password. Open that link to finish setting up your account.
      </p>
      <AuthSwitchLink prompt="Already have a password?" to="/login" linkLabel="Log in" />
    </>
  )
}
