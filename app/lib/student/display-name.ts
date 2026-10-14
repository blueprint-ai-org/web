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
 * ## What is left of it
 *
 * **Only the LTI fallback.** The BP AI half — `first_name` before
 * `display_name`, because *"Hi {name}!"* wants a first name and a SIS
 * `display_name` is often "Last, First" — is now the GATEWAY's rule, answered
 * as `me { preferred_name }`. It was the same rule implemented twice, once per
 * frontend, with nothing keeping the two in step.
 *
 * What remains is the case the gateway cannot answer: somebody who arrived
 * through a Canvas launch and has no BP AI record at all.
 *
 * 1. **The LTI `given_name` claim**, then `name`.
 * 2. **`null`**, meaning *we genuinely do not know* — which the caller must
 *    render as its own default rather than as an empty greeting.
 *
 * `null` is the honest fourth case and the reason this returns a nullable
 * instead of a fallback string: "Hi !" and "Hi Sophie!" are different kinds of
 * wrong, and only the caller knows which surface can carry which.
 */

export interface NameSources {
  /** From the LTI claims (`userInfo`), for a Canvas launch. */
  ltiGivenName?: string | null
  ltiName?: string | null
}

/** Trimmed, or `null` for anything blank, whitespace-only, or not a string. */
function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function preferredName(sources: NameSources): string | null {
  return clean(sources.ltiGivenName) ?? clean(sources.ltiName)
}
