import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Form, useNavigation } from 'react-router'

import { validateLogin } from '~/lib/bp-ai/validate'
import type { FieldErrors, LoginField } from '~/lib/bp-ai/validate'

import { useEnterAnimation } from '../hooks/useEnterAnimation'
import type { OnboardingMotion } from '../onboarding-v2/transitions'

import { AuthCta, AuthField, AuthFormError } from './AuthPrimitives'
import {
  AUTH_SCREEN_CSS,
  AuthEyebrow,
  AuthStage,
  AuthSwitchLink,
  AuthTitle,
  useAuthShake,
} from './AuthStage'

/**
 * `/login` — the credential screen.
 *
 * Structurally `NameScreen.tsx:23-114`: the eyebrow, the Anton 80px title, one
 * `maxWidth: 480` column of fields, and the CTA pinned at `bottom: 48`. Two
 * fields instead of one, and every difference beyond that is a consequence of
 * the one thing a login form can do that an onboarding screen cannot — fail.
 *
 * **Submission is a real RR7 `<Form method="post">`**, so this screen works with
 * JavaScript disabled and needs no `fetch` of its own. `useNavigation()` drives
 * the CTA's pending state, `useActionData()` (threaded in as {@link LoginScreenProps.actionData})
 * supplies server errors, and `validateLogin` — the *same* isomorphic function
 * the action runs — catches a blank or malformed form in the browser before
 * anything reaches the network. One rule, one message, two places it can fire.
 *
 * **No "forgot password" link.** The API exposes no `forgotPassword` or
 * `changePassword` operation (see the findings doc), so the link would go
 * nowhere. A dead link on a login screen is worse than its absence: it wastes
 * the click of exactly the person who is already stuck.
 */

export interface LoginScreenProps {
  /** `useActionData()` from the route. `undefined` until a submit fails. */
  actionData?: {
    fieldErrors: FieldErrors<LoginField>
    formError?: string
  }
  /**
   * Whether `/signup` exists right now (`BP_SIGNUP_ENABLED`, surfaced by the
   * loader). **Defaults to `false`** — a screen that cannot see the flag must
   * assume the route is not there, because the failure mode of guessing wrong
   * in the other direction is a link to a 404.
   */
  signupEnabled?: boolean
}

export function LoginScreen({ actionData, signupEnabled = false }: LoginScreenProps) {
  // One enter clock for the whole screen: the double-rAF `entered` fades the
  // content layer in via `AuthStage`. `phase2` is kept because `OnboardingMotion`
  // requires it, but this screen has nothing staggered against it any more —
  // the mascot it used to pop was removed.
  const { entered, phase2 } = useEnterAnimation({ phase2Delay: 260 })
  const motion: OnboardingMotion = { enterKind: 'fade', entered, phase2, exit: null }

  const navigation = useNavigation()
  // True for both phases of a submit: `submitting` while the action runs, then
  // `loading` while the redirect's loaders run. `formMethod` is what separates
  // that from an ordinary GET navigation — without it the CTA would go idle in
  // the gap between the action returning and the next page painting.
  const pending = navigation.state !== 'idle' && navigation.formMethod != null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Errors this browser found, from the same `validateLogin` the action runs.
  const [clientErrors, setClientErrors] = useState<FieldErrors<LoginField>>({})
  // Fields edited since the last server response. A server error on a field the
  // user has since changed is stale — it describes a value that no longer
  // exists, and leaving it on screen makes a corrected field look still-wrong.
  const [edited, setEdited] = useState<Partial<Record<LoginField, true>>>({})

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
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  const serverFieldErrors = actionData?.fieldErrors ?? {}

  function errorFor(field: LoginField): string | undefined {
    return clientErrors[field] ?? (edited[field] ? undefined : serverFieldErrors[field])
  }

  // Every failed submit shakes the column, whether the browser or the gateway
  // rejected it. `actionData` is a fresh object per navigation, so a second
  // identical failure still re-fires.
  useEffect(() => {
    if (!actionData) return
    setStaleBanner(false)
    shake()
  }, [actionData, shake])

  function change(field: LoginField, setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      // Clear this field's client error as it is typed — re-validating on every
      // keystroke would scold someone mid-way through typing "a@b.co".
      setClientErrors((prev) => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }))
      setEdited((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
    }
  }

  /**
   * The gate that keeps a bad form off the wire.
   *
   * `preventDefault()` on an RR7 `<Form>`'s submit event stops the navigation
   * outright — no request is made, so an empty submit costs zero round trips.
   * `setEdited({})` matters as much as `setClientErrors`: without it, a field
   * the user had edited since the last server error would suppress the fresh
   * client error too.
   */
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateLogin({ email: email.trim(), password })
    if (Object.keys(errors).length === 0) return
    event.preventDefault()
    setClientErrors(errors)
    setEdited({})
    setStaleBanner(true)
    shake()
    // Land the caret on the first thing that is wrong, in DOM order.
    const target = errors.email ? emailRef.current : passwordRef.current
    target?.focus()
  }

  return (
    <AuthStage slug="login" motion={motion}>
      <style>{AUTH_SCREEN_CSS}</style>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // `NameScreen`'s `0 120px`, plus 96px at the bottom so the centred
          // column is biased up out of the pinned CTA's 48–96px band.
          padding: '0 120px 96px',
          textAlign: 'center',
        }}
      >
        <AuthEyebrow />
        <AuthTitle>Welcome back!</AuthTitle>

        <Form
          method="post"
          onSubmit={onSubmit}
          // `noValidate` hands validation to `validateLogin` alone. Without it
          // the browser's own bubble fires first on `type="email"`, in the UA's
          // wording and its own visual language, and our inline messages never
          // get a chance to render.
          noValidate
          style={{ width: '100%', maxWidth: 480 }}
        >
          <div
            ref={columnRef}
            style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}
          >
            <AuthFormError message={staleBanner ? undefined : actionData?.formError} />

            <AuthField
              name="email"
              label="Your email"
              type="email"
              placeholder="you@school.edu"
              autoComplete="email"
              autoFocus
              inputRef={emailRef}
              value={email}
              onValueChange={change('email', setEmail)}
              error={errorFor('email')}
            />

            {/* No placeholder on a password field: a row of bullets in an
                empty box reads as a password already filled in. The email
                field keeps its own, because "you@school.edu" teaches a format
                where dots teach nothing. */}
            <AuthField
              name="password"
              label="Your password"
              type="password"
              autoComplete="current-password"
              inputRef={passwordRef}
              value={password}
              onValueChange={change('password', setPassword)}
              error={errorFor('password')}
            />
          </div>

          {/* Only while `/signup` actually exists — see `AuthSwitchLink`. */}
          {signupEnabled && (
            <AuthSwitchLink prompt="New here?" to="/signup" linkLabel="Create an account" />
          )}

          <AuthCta label="Log in" pending={pending} pendingLabel="Logging you in…" bottom={48} />
        </Form>
      </div>
    </AuthStage>
  )
}
