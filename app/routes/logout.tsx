/**
 * `POST /logout` — end the credential session.
 *
 * Action-only, no component, mirroring `app/routes/api.theme.tsx`: there is
 * nothing to render, and every path out of here is a redirect or a 405.
 *
 * **Two rules govern this route, and the second is the important one:**
 *
 *  1. `POST` only. A `GET` gets `405 Allow: POST`, because a GET logout is
 *     triggerable by an `<img src="/logout">` on any page, a link prefetch, or
 *     a browser preconnect — none of which the user asked for.
 *  2. **The cookie is cleared unconditionally.** The gateway's `logout` is
 *     best-effort: if it fails, times out, or the session was already gone, the
 *     user is still logged out locally. Never leave someone signed in because a
 *     network call failed — and never assume the gateway invalidated a token
 *     the user still holds (the findings doc marks that semantics UNRESOLVED).
 *
 * The API call is made with the **raw** access token, not `Bearer` — see
 * `bpLogout`. Raw is the only variant observed to actually revoke.
 */

import { redirect } from 'react-router'
import type { Route } from './+types/logout'
import { bpLogout } from '~/lib/bp-ai/auth.server'
import { clearBpSessionCookie, readBpSession } from '~/lib/bp-ai/session.server'

/** Where a logged-out user lands. */
const AFTER_LOGOUT = '/login'

/**
 * Evict the back-forward cache for this origin (added in Phase 7).
 *
 * Clearing the cookie is not enough on its own. The authenticated page the user
 * just left sits in the browser's bfcache as a fully-rendered snapshot, and a
 * back-button press restores it **without any network request** — so no loader
 * runs, the gate is never re-asked, and the user is looking at their own data
 * again seconds after logging out. Measured, not theoretical: this is exactly
 * what the Phase 7 QA walkthrough caught.
 *
 * `"cache"` and nothing else. Emphatically **not** `"storage"`: that would wipe
 * `localStorage`, taking `bp_onboarding_done` and every other `bp_*` key with
 * it, and a returning user would be walked through onboarding again on a device
 * where they had already finished it — breaking the behaviour D6 exists to
 * provide. `"cookies"` would be redundant; the `Set-Cookie` below already does
 * that, precisely and reversibly.
 *
 * **Known limitation.** This is a Chrome-family fix. Safari does not implement
 * `Clear-Site-Data` at all, and Firefox does not treat it as a bfcache
 * eviction, so on those browsers a back press can still restore the rendered
 * view (the session itself is gone — every subsequent navigation re-enters
 * through the gate and lands on `/login`). The guaranteed cure is
 * `Cache-Control: no-store` on the authenticated documents themselves, and it
 * is deliberately NOT applied here: that would disable bfcache for the LTI path
 * too, where a back press inside the Safari Canvas iframe currently *depends*
 * on the restore — a fresh document GET there has no cookie and no URL token
 * and hits the gate's 401 (the limitation documented on `_persona.tsx`'s
 * `shouldRevalidate`). Trading a working Canvas back-button for a hardened
 * credential one is the wrong way round, so the residual stays.
 */
const CLEAR_BFCACHE = '"cache"'

function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ ok: false, error: 'method-not-allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  })
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') return methodNotAllowed()

  const session = await readBpSession(request)
  if (session) {
    // Fire-and-observe, never fire-and-depend. A failure here is logged and
    // then ignored: the redirect below still carries the clearing cookie.
    const result = await bpLogout(session.accessToken, session.refreshToken)
    if (!result.ok) {
      console.warn(
        `[logout] BP AI logout failed (${result.error.kind}): ${result.error.message} — clearing the local session anyway`,
      )
    }
  }

  // Unconditional, including when there was no session to begin with: a stale
  // or unreadable `bp-session` cookie must still be swept, or a user with a
  // cookie signed by a rotated secret can never clear it.
  return redirect(AFTER_LOGOUT, {
    headers: {
      'Set-Cookie': clearBpSessionCookie(),
      'Clear-Site-Data': CLEAR_BFCACHE,
    },
  })
}

export function loader() {
  return methodNotAllowed()
}
