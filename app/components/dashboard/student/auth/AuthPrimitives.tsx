import { useId } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'

/**
 * The three student-styled primitives the auth screens need and the rest of the
 * student flow has never had: a labelled text field that can be wrong, a
 * form-level error banner, and a CTA that can be busy.
 *
 * **Why these are net-new.** Nothing in the student flow could previously fail.
 * Onboarding writes to `localStorage` — there is no network, so there is no
 * inline error display, no `aria-invalid`, and no button loading state anywhere
 * in `app/components/dashboard/student/**`. `app/components/ui/*` is the
 * adult/counselor surface and has neither an input nor a card primitive to
 * extend. So the components are new, but the *visual recipes* are not: every
 * measurement below is lifted from an existing screen so these read as native
 * on day one.
 *
 * | Primitive        | Recipe source                                    |
 * |------------------|--------------------------------------------------|
 * | {@link AuthField}     | `onboarding-v2/NameScreen.tsx:69-107` (label + input) |
 * | {@link AuthFormError} | `onboarding-v2/PrivacyScreen.tsx:18-23` (`pcardStyle`) |
 * | {@link AuthCta}       | `onboarding-v2/OnboardingChrome.tsx:194-237` (`CtaButton`) |
 *
 * **Conventions this file follows deliberately:**
 * - Inline `style={{}}` with `var(--font-student-*)` / `var(--color-student-*)`,
 *   not Tailwind classes. That is the student-flow convention (one exception
 *   repo-wide) and it keeps these usable inside the scaled `StudentStage`.
 * - **No raw colour literals.** `NameScreen` hard-codes `#2b2b32` / `#36363f` /
 *   `#f2f3e5`; each of those is already a named token in `app.css`, so the same
 *   pixels are expressed here through the token. Nothing new is introduced —
 *   including for the "danger tint", which is the existing
 *   `--color-student-danger` and no lower-alpha variant of it.
 * - Motion is hand-rolled CSS keyframes in a scoped `<style>` block, the idiom
 *   used by `CompleteScreen.tsx:145-158`, `today-styles.ts`, `sparks-styles.ts`
 *   and friends. No animation library is installed and this phase does not add
 *   one.
 */

/* ── Token aliases ───────────────────────────────────────────────────────────
 * The literal each one replaces, and where that literal is hard-coded today.
 * Kept as named constants so a recipe change is one edit, not a find-replace.
 */

/** `#2b2b32` — input fill (`NameScreen.tsx:95`). */
const FIELD_BG = 'var(--color-student-gray-600)'
/** `#36363f` — input border at rest (`NameScreen.tsx:96`). */
const FIELD_BORDER = 'var(--color-student-border)'
/** `#f2f3e5` — input text, CTA fill (`NameScreen.tsx:101`, `OnboardingChrome.tsx:30`). */
const CREAM = 'var(--color-student-surface-cream)'
/** `#1f1f25` — card fill (`PrivacyScreen.tsx:20`), CTA label (`OnboardingChrome.tsx:31`). */
const CARD_BG = 'var(--color-student-bg)'
/** `#737472` — field label (`NameScreen.tsx:75`). */
const LABEL_FG = 'var(--color-student-gray-200)'
/** `#ff9a9a` — the error colour (`app.css:197`). */
const DANGER = 'var(--color-student-danger)'
/** `rgba(255,255,255,0.10)` — the focus ring (`app.css:173`). */
const RING = 'var(--color-student-edge-medium)'

/** Shared 14px Barlow used by both the field label and the error messages. */
const META_TEXT: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: '-0.1px',
  lineHeight: 1.35,
}

/* ── AuthField ───────────────────────────────────────────────────────────── */

export interface AuthFieldProps {
  /** Submitted form key. Also seeds the input's `id` when none is given. */
  name: string
  label: string
  /**
   * `password` is why this component takes a `type` at all — the student flow
   * has never had a masked input.
   */
  type?: 'text' | 'email' | 'password'
  /**
   * The inline error, or `undefined` when the field is fine. A message here is
   * the single switch for all three error behaviours: the coral border, the
   * message node, and `aria-invalid`. They cannot drift apart.
   */
  error?: string
  placeholder?: string
  defaultValue?: string
  /** Controlled value. Pair with {@link onValueChange}. */
  value?: string
  /**
   * Takes the string, not the event — every caller so far wants the value, and
   * the screens stay free of `e.target.value` noise.
   */
  onValueChange?: (value: string) => void
  onBlur?: () => void
  /** Browser autofill hint, e.g. `email` / `current-password` / `new-password`. */
  autoComplete?: string
  disabled?: boolean
  autoFocus?: boolean
  /** Override the generated id (only needed if something outside must point at it). */
  id?: string
  inputRef?: Ref<HTMLInputElement>
  /** Optional helper line under the input, e.g. the password length rule. */
  hint?: string
}

/**
 * Label + input + inline error, in the `NameScreen` field recipe: a 10px-gap
 * column, a 14px Barlow label above, and a 20px/500 Barlow input on `#2b2b32`
 * with a `1.5px` `#36363f` border and a 12px radius.
 *
 * Three things it adds to that recipe, none of which exist anywhere in the
 * student flow today:
 *
 * 1. **An error state.** The border swaps to `--color-student-danger` and the
 *    message renders beneath in 14px Barlow.
 * 2. **`aria-invalid`.** Rendered explicitly as `"false"` rather than omitted,
 *    so the attribute *flips* rather than appearing from nowhere — assistive
 *    tech and QA both get an unambiguous before/after.
 * 3. **A visible focus ring.** `NameScreen` sets `outline: 'none'` with no
 *    replacement, which is survivable on a one-field onboarding screen and not
 *    on a login form. Focus brightens the border to cream and adds a soft
 *    `edge-medium` ring; in the error state the border stays coral so "focused"
 *    never masks "wrong".
 *
 * The error node is rendered only when there is an error, carries `role="alert"`
 * so it is announced on insertion, and is the exact node `aria-describedby`
 * points at.
 */
export function AuthField({
  name,
  label,
  type = 'text',
  error,
  placeholder,
  defaultValue,
  value,
  onValueChange,
  onBlur,
  autoComplete,
  disabled = false,
  autoFocus = false,
  id,
  inputRef,
  hint,
}: AuthFieldProps) {
  // `useId` (not a counter) so the server and client markup agree — SSR is on.
  const generated = useId()
  const inputId = id ?? `auth-${name}-${generated}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const invalid = Boolean(error)

  // Precedence: error beats focus. A coral border must never be overwritten by
  // a cream one just because the user is still standing in the broken field.
  const describedBy = invalid ? errorId : hint ? hintId : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <label
        htmlFor={inputId}
        style={{ ...META_TEXT, color: invalid ? DANGER : LABEL_FG, textAlign: 'left' }}
      >
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
        ref={inputRef}
        defaultValue={defaultValue}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={onValueChange ? (e) => onValueChange(e.target.value) : undefined}
        // Focus/blur paint the ring directly rather than through React state:
        // a `useState` per field would re-render the whole form on every tab
        // press, and there is nothing else for that state to drive.
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 3px ${RING}`
          if (!invalid) e.currentTarget.style.borderColor = CREAM
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none'
          if (!invalid) e.currentTarget.style.borderColor = FIELD_BORDER
          onBlur?.()
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: FIELD_BG,
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderColor: invalid ? DANGER : FIELD_BORDER,
          borderRadius: 12,
          padding: '18px 20px',
          fontFamily: 'var(--font-student-body)',
          fontSize: 20,
          fontWeight: 500,
          color: CREAM,
          outline: 'none',
          boxShadow: 'none',
          opacity: disabled ? 0.55 : 1,
          transition: 'border-color 140ms ease, box-shadow 140ms ease',
        }}
      />

      {invalid ? (
        <span
          id={errorId}
          role="alert"
          style={{ ...META_TEXT, color: DANGER, textAlign: 'left' }}
        >
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} style={{ ...META_TEXT, color: LABEL_FG, textAlign: 'left' }}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}

/* ── AuthFormError ───────────────────────────────────────────────────────── */

export interface AuthFormErrorProps {
  /**
   * The message. `undefined` renders nothing, so callers can pass
   * `actionData?.formError` straight through without a guard of their own.
   */
  message?: ReactNode
  id?: string
}

/**
 * The form-level banner: what went wrong when nothing went wrong with a
 * specific field — "That email and password don't match", "We couldn't reach
 * Spark EQ".
 *
 * Shape is `PrivacyScreen`'s `pcardStyle` (`#1f1f25` fill, 20px radius,
 * `20px 24px` padding) with its neutral `#444450` border swapped for
 * `--color-student-danger`. The border is the whole tint — deliberately not a
 * translucent coral wash, because every alpha variant of a token in this
 * codebase is itself a declared token (`--color-student-success-muted`), and
 * inventing one inline for a single banner would be the first raw colour
 * literal in the auth surface.
 *
 * `role="alert"` puts it in the accessibility tree the moment it mounts, which
 * matters because the natural reading order after a failed submit is "button,
 * then nothing" — the banner is above the fields, out of the user's path.
 */
export function AuthFormError({ message, id }: AuthFormErrorProps) {
  if (!message) return null
  return (
    <div
      id={id}
      role="alert"
      data-testid="auth-form-error"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        boxSizing: 'border-box',
        background: CARD_BG,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: DANGER,
        borderRadius: 20,
        padding: '20px 24px',
        textAlign: 'left',
      }}
    >
      {/* A ring-and-bar glyph rather than an icon import: the auth screens have
          no icon set of their own, and a 20px inline SVG needs no asset. */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="10" cy="10" r="8.25" stroke={DANGER} strokeWidth="1.5" />
        <path d="M10 6v5" stroke={DANGER} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="13.75" r="0.9" fill={DANGER} />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          lineHeight: 1.35,
          letterSpacing: '-0.1px',
          color: DANGER,
        }}
      >
        {message}
      </span>
    </div>
  )
}

/* ── AuthCta ─────────────────────────────────────────────────────────────── */

/**
 * The pending ellipsis. Three dots, each fading and lifting on the same
 * 1200ms loop offset by 160ms — the "typing" rhythm rather than a spinner,
 * which is the point: there is no spinner in this repo and a corporate one
 * would be the first thing on these screens that doesn't look hand-made.
 *
 * `prefers-reduced-motion` parks the dots at a steady dim instead of hiding
 * them, so the button still reads as busy without moving.
 */
const AUTH_CTA_CSS = `
.auth-cta-dots { display: inline-flex; align-items: center; gap: 5px; }
.auth-cta-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: auth-cta-dot 1200ms ease-in-out infinite; }
.auth-cta-dot:nth-child(2) { animation-delay: 160ms; }
.auth-cta-dot:nth-child(3) { animation-delay: 320ms; }
@keyframes auth-cta-dot {
  0%, 70%, 100% { opacity: 0.28; transform: translateY(0); }
  35% { opacity: 1; transform: translateY(-3px); }
}
@media (prefers-reduced-motion: reduce) {
  .auth-cta-dot { animation: none; opacity: 0.55; }
}
`

export interface AuthCtaProps {
  label: string
  /**
   * In flight: the button is genuinely `disabled`, not merely dimmed, and the
   * label becomes the animated ellipsis.
   */
  pending?: boolean
  /** Disabled for a reason other than a request in flight. */
  disabled?: boolean
  /**
   * What assistive tech hears while pending — the dots are `aria-hidden`, so
   * without this the button would announce as unlabelled mid-submit.
   */
  pendingLabel?: string
  /** Defaults to `submit`: these buttons live in RR7 `<Form>`s. */
  type?: 'submit' | 'button'
  onClick?: () => void
  /** `CtaButton`'s 270×48 default. */
  width?: number
  /** Distance from the stage bottom when pinned. `CtaButton` uses 64; auth uses 48. */
  bottom?: number
  /**
   * Render in normal flow instead of pinned to the stage bottom. The pinned
   * default matches `CtaButton`; `inline` is for a form column or a showcase
   * sheet, where `position: absolute` would put the button in the letterbox.
   */
  inline?: boolean
}

/**
 * `CtaButton` (`OnboardingChrome.tsx:194-237`) plus a pending state: same
 * 270×48 cream pill, same 16px/500 Barlow label, same 8px radius and
 * `0 1px 1px rgba(20,21,26,0.03)` shadow, same absolute bottom-centre placement
 * inside the stage.
 *
 * What `pending` does, precisely:
 * - sets the real `disabled` attribute, so a double-tap cannot fire a second
 *   POST and the browser itself refuses the click — a `pointer-events: none`
 *   or an `onClick` early-return would still leave the button focusable and
 *   submittable by <kbd>Enter</kbd>;
 * - sets `aria-busy`, which is the part a screen reader acts on;
 * - swaps the visible label for {@link AUTH_CTA_CSS}'s three dots while
 *   keeping the text available to assistive tech.
 *
 * The button keeps its full cream fill while pending (only a slight dim) so it
 * still reads as the thing that is working, not as the thing that is broken.
 * A `disabled` prop, by contrast, dims it properly — those are different
 * states and they should not look alike.
 */
export function AuthCta({
  label,
  pending = false,
  disabled = false,
  pendingLabel,
  type = 'submit',
  onClick,
  width = 270,
  bottom = 48,
  inline = false,
}: AuthCtaProps) {
  const isDisabled = pending || disabled

  const button = (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={pending}
      data-pending={pending ? 'true' : undefined}
      data-testid="auth-cta"
      style={{
        width,
        height: 48,
        background: CREAM,
        color: CARD_BG,
        fontFamily: 'var(--font-student-body)',
        fontSize: 16,
        fontWeight: 500,
        letterSpacing: '-0.1px',
        borderRadius: 8,
        border: 'none',
        // `wait` while in flight; `not-allowed` when the button is off for
        // another reason. The cursor is the cheapest honest signal of which.
        cursor: pending ? 'wait' : disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 1px 1px rgba(20,21,26,0.03)',
        opacity: disabled && !pending ? 0.45 : pending ? 0.85 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Anchors the visually-hidden pending label below; without it that 1px
        // box would position against whatever ancestor happens to be relative.
        position: 'relative',
        transition: 'opacity 140ms ease',
      }}
    >
      {pending ? (
        <>
          <style>{AUTH_CTA_CSS}</style>
          {/* Announced instead of the dots, and clipped to a 1px box rather
              than `display: none` — hidden text is not read out. */}
          <span
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clipPath: 'inset(50%)',
              whiteSpace: 'nowrap',
            }}
          >
            {pendingLabel ?? `${label}…`}
          </span>
          <span className="auth-cta-dots" aria-hidden="true">
            <span className="auth-cta-dot" />
            <span className="auth-cta-dot" />
            <span className="auth-cta-dot" />
          </span>
        </>
      ) : (
        label
      )}
    </button>
  )

  if (inline) return button

  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
      }}
    >
      {button}
    </div>
  )
}
