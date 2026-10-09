/**
 * Which of the several names we might hold is the one to greet somebody with.
 *
 * **Isomorphic and pure** — no env, no I/O — because the server resolves it in
 * `_persona.tsx`'s loader and the client has to agree about what it means.
 *
 * ## Why this exists at all
 *
 * The onboarding flow used to open by asking "what's your name?" and writing
 * `bp_username` to localStorage. That screen is gone (2026-09-23): every user is
 * provisioned with a name, so asking was a question we already knew the answer
 * to. What replaces it is this — the name comes from whichever session the
 * person arrived on.
 *
 * ## The order, and why
 *
 * 1. **`first_name`** before `display_name`. The surfaces that use this say
 *    *"Hi {name}!"* and truncate past nine characters for the sidebar. A first
 *    name is what that sentence wants; `display_name` is a label, and for a
 *    record created from a SIS it is often "Last, First" or a full legal name.
 * 2. **`display_name`** when there is no first name — better a full name than
 *    no name.
 * 3. **The LTI `given_name` claim**, then `name`, for somebody who arrived
 *    through a Canvas launch and has no BP AI record at all.
 * 4. **`null`**, meaning *we genuinely do not know* — which the caller must
 *    render as its own default rather than as an empty greeting.
 *
 * `null` is the honest fourth case and the reason this returns a nullable
 * instead of a fallback string: "Hi !" and "Hi Sophie!" are different kinds of
 * wrong, and only the caller knows which surface can carry which.
 */

export interface NameSources {
  /** From the BP AI profile (`getUser`), for a credential session. */
  firstName?: string | null
  displayName?: string | null
  /** From the LTI claims (`userInfo`), for a Canvas launch. */
  ltiGivenName?: string | null
  ltiName?: string | null
}

/** Trimmed, or `null` for anything blank, whitespace-only, or not a string. */
function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function preferredName(sources: NameSources): string | null {
  return (
    clean(sources.firstName) ??
    clean(sources.displayName) ??
    clean(sources.ltiGivenName) ??
    clean(sources.ltiName)
  )
}
