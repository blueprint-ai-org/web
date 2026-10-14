import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Form, useNavigation } from 'react-router'

import { validateJoin } from '~/lib/bp-ai/validate'
import type { FieldErrors, JoinField } from '~/lib/bp-ai/validate'

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
import { CheckEmail } from './InviteScreen'

/**
 * `/signup` — join my school. Same shape as {@link LoginScreen}; read that
 * file's header for the parts they share (the `NameScreen` structure, the RR7
 * `<Form>`, the isomorphic client validation, the stale-server-error rule).
 *
 * **The design's signup screen, with its fields repurposed.** It was built for
 * name + email + password; `joinTenant` takes a join code, a name and an email,
 * and the password is chosen later at `/invite`. So the password slot became
 * the code — same component, same hint position, same layout.
 *
 * **After a successful submit the form is replaced by "check your email"**,
 * the state `/invite` already shows without a token ({@link CheckEmail}). The
 * design has no success state for this screen, and that one says exactly what
 * the next step is.
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
  actionData?:
    | { ok: false; fieldErrors: FieldErrors<JoinField>; formError?: string }
    | { ok: true; email: string }
}

export function SignupScreen({ actionData }: SignupScreenProps) {
  const { entered, phase2 } = useEnterAnimation({ phase2Delay: 260 })
  const motion: OnboardingMotion = { enterKind: 'fade', entered, phase2, exit: null }

  const navigation = useNavigation()
  const pending = navigation.state !== 'idle' && navigation.formMethod != null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  const [clientErrors, setClientErrors] = useState<FieldErrors<JoinField>>({})
  const [edited, setEdited] = useState<Partial<Record<JoinField, true>>>({})

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
  const codeRef = useRef<HTMLInputElement | null>(null)

  const serverFieldErrors = actionData?.ok === false ? actionData.fieldErrors : {}

  function errorFor(field: JoinField): string | undefined {
    return clientErrors[field] ?? (edited[field] ? undefined : serverFieldErrors[field])
  }

  useEffect(() => {
    // Only a failure shakes; success replaces the form altogether.
    if (!actionData || actionData.ok) return
    setStaleBanner(false)
    shake()
  }, [actionData, shake])

  function change(field: JoinField, setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setClientErrors((prev) => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }))
      setEdited((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateJoin({ code: code.trim(), name: name.trim(), email: email.trim() })
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
        : codeRef.current
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
        {actionData?.ok === true ? (
          <CheckEmail testId="join-sent">
            We’ve sent an invitation to {actionData.email}. Open the link in it to pick your
            password and finish joining your school.
          </CheckEmail>
        ) : (
          <>
            {/* Typographic apostrophe, matching the error copy (“don’t match”). */}
            <AuthTitle>Let’s begin!</AuthTitle>

            <Form method="post" onSubmit={onSubmit} noValidate style={{ width: '100%', maxWidth: 480 }}>
              <div
                ref={columnRef}
                style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}
              >
                <AuthFormError
                  message={staleBanner || actionData?.ok !== false ? undefined : actionData.formError}
                />

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

                {/* The design's password slot, repurposed for the join code: no
                    placeholder, and the `hint` carries the only guidance the field
                    needs. `AuthField` hides the hint while an error is showing. */}
                <AuthField
                  name="code"
                  label="Your school code"
                  type="text"
                  autoComplete="off"
                  inputRef={codeRef}
                  value={code}
                  onValueChange={change('code', setCode)}
                  error={errorFor('code')}
                  hint="Your school gives you this code."
                />
              </div>

              {/* Always shown: `/login` exists in every configuration. */}
              <AuthSwitchLink prompt="Already have an account?" to="/login" linkLabel="Log in" />

              <AuthCta
                label="Join my school"
                pending={pending}
                pendingLabel="Joining your school…"
                bottom={48}
              />
            </Form>
          </>
        )}
      </div>
    </AuthStage>
  )
}
