import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Form, useNavigation } from 'react-router'

import { MIN_PASSWORD_LENGTH, validateSignup } from '~/lib/bp-ai/validate'
import type { FieldErrors, SignupField } from '~/lib/bp-ai/validate'

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
 * `/signup` — account creation. Same shape as {@link LoginScreen}; read that
 * file's header for the parts they share (the `NameScreen` structure, the RR7
 * `<Form>`, the isomorphic client validation, the stale-server-error rule).
 *
 * ⚠️ **This screen is complete and deliberately unreachable.** `BP_SIGNUP_ENABLED`
 * is off, and the route's *loader and action* both 404 while it is — so nothing
 * here can be exercised in production, by a link or by a hand-crafted POST. The
 * reason is a product one, not a bug: the gateway's `signup` is an
 * org-creation flow that hands every signer a brand-new empty tenant and
 * `role: "admin"` over it, which is not what a student signing up should get.
 * See `isSignupEnabled()` in `app/lib/bp-ai/config.server.ts` for the full
 * account. Turning it on is one env var once the backend has an operation that
 * joins an existing school.
 *
 * **Three fields, and deliberately not four.** No school, org or tenant input
 * (D7) — the gateway's `signup` takes `email`, `password`, `name`, and
 * `bpSignup` pointedly does not send the `org_name` the schema also accepts.
 * Adding a school field here would be inventing a product decision the backend
 * has not made.
 */

/**
 * Where the mascot sits on the 1194×834 canvas.
 *
 * 40px higher than login's, because the taller three-field column shifts the
 * whole centred block up: the mascot tracks the form, not the frame.
 */
const MASCOT = { left: 168, top: 290, size: 132 } as const

export interface SignupScreenProps {
  /** `useActionData()` from the route. `undefined` until a submit fails. */
  actionData?: {
    fieldErrors: FieldErrors<SignupField>
    formError?: string
  }
}

export function SignupScreen({ actionData }: SignupScreenProps) {
  const { entered, phase2 } = useEnterAnimation({ phase2Delay: 260 })
  const motion: OnboardingMotion = { enterKind: 'fade', entered, phase2, exit: null }

  const navigation = useNavigation()
  const pending = navigation.state !== 'idle' && navigation.formMethod != null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [clientErrors, setClientErrors] = useState<FieldErrors<SignupField>>({})
  const [edited, setEdited] = useState<Partial<Record<SignupField, true>>>({})

  /**
   * Suppresses a *stale* form-level banner.
   *
   * The banner describes the previous round trip ("That email and password
   * don't match"). The moment the user submits again and the browser rejects
   * the form, that sentence is describing an attempt that no longer exists —
   * and it is sitting above fresh field errors that say something different.
   * Clearing it is the honest behaviour, and it also keeps the tallest state
   * the layout can reach (a banner plus every field wrong at once) from
   * crowding the pinned CTA: the two error kinds are never stacked.
   *
   * Reset whenever new `actionData` arrives, since that banner is current.
   */
  const [staleBanner, setStaleBanner] = useState(false)

  const { ref: columnRef, shake } = useAuthShake()
  const nameRef = useRef<HTMLInputElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  const serverFieldErrors = actionData?.fieldErrors ?? {}

  function errorFor(field: SignupField): string | undefined {
    return clientErrors[field] ?? (edited[field] ? undefined : serverFieldErrors[field])
  }

  useEffect(() => {
    if (!actionData) return
    setStaleBanner(false)
    shake()
  }, [actionData, shake])

  function change(field: SignupField, setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setClientErrors((prev) => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }))
      setEdited((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateSignup({ name: name.trim(), email: email.trim(), password })
    if (Object.keys(errors).length === 0) return
    event.preventDefault()
    setClientErrors(errors)
    setEdited({})
    setStaleBanner(true)
    shake()
    // First invalid field in DOM order, which is also the order they are read.
    const target = errors.name
      ? nameRef.current
      : errors.email
        ? emailRef.current
        : passwordRef.current
    target?.focus()
  }

  return (
    <AuthStage slug="signup" motion={motion}>
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
        {/* Typographic apostrophe, matching the error copy (“don’t match”). */}
        <AuthTitle>Let’s begin!</AuthTitle>

        <Form method="post" onSubmit={onSubmit} noValidate style={{ width: '100%', maxWidth: 480 }}>
          <div
            ref={columnRef}
            style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}
          >
            <AuthFormError message={staleBanner ? undefined : actionData?.formError} />

            <AuthField
              name="name"
              label="What's your name?"
              type="text"
              placeholder="Your name…"
              autoComplete="name"
              autoFocus
              inputRef={nameRef}
              value={name}
              onValueChange={change('name', setName)}
              error={errorFor('name')}
            />

            <AuthField
              name="email"
              label="Your email"
              type="email"
              placeholder="you@school.edu"
              autoComplete="email"
              inputRef={emailRef}
              value={email}
              onValueChange={change('email', setEmail)}
              error={errorFor('email')}
            />

            {/* No placeholder — see the note in `LoginScreen`. The `hint`
                below carries the only guidance this field needs. */}
            <AuthField
              name="password"
              label="Pick a password"
              type="password"
              autoComplete="new-password"
              inputRef={passwordRef}
              value={password}
              onValueChange={change('password', setPassword)}
              error={errorFor('password')}
              // Stated up front rather than sprung after a rejected submit, and
              // read from `MIN_PASSWORD_LENGTH` so the rule and the sentence
              // that describes it cannot drift. `AuthField` hides the hint
              // while an error is showing — one message per field at a time.
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            />
          </div>

          {/* Always shown: `/login` exists in every configuration. */}
          <AuthSwitchLink prompt="Already have an account?" to="/login" linkLabel="Log in" />

          <AuthCta
            label="Create account"
            pending={pending}
            pendingLabel="Creating your account…"
            bottom={48}
          />
        </Form>
      </div>
    </AuthStage>
  )
}
