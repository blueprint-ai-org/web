/**
 * `/student/helpful-content` — the intervention's Support and Action screens
 * (ports `helpful-content.html`).
 *
 * Full-bleed page (no sidebar): 3 cross-fading screens (intro → video →
 * feedback). Mirrored at `/preview/student/helpful-content`.
 * No `clientLoader` — the page reads no storage at load (SSR-safe render).
 *
 * Since step-14 this is where an intervention session lands: the check-in
 * navigates here with the payload in history `state`, the intro screen is the
 * SUPPORT screen and the video screen is the ACTION screen. Reached with no
 * state (a direct URL, or the preview mirror) it behaves exactly as it did —
 * three baked screens that record nothing.
 *
 * ## The action is the FSM's Continue, and it is two calls
 *
 * `continueSupport` does NOT move the session: since step-13 it is the only
 * thing that satisfies the `support_screen_viewed` guard (L5-R19), so the
 * transition to `ACTION` has to follow it. Calling only the transition is
 * refused and leaves the student stuck on SUPPORT — which is the bug this step
 * exists to close.
 */

import type { ActionFunctionArgs } from 'react-router'

import { HelpfulContent } from '~/components/dashboard/student/helpful-content'
import { InterventionState } from '~/lib/bp-ai/gql/schema'
import { bpContinueSupport, bpTransition } from '~/lib/bp-ai/intervention.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

const TAG = '[helpful-content]'

export function meta() {
  return [{ title: 'Helpful content · Blueprint' }, { name: 'description', content: 'Helpful content interstitial.' }]
}

/** Stub server loader — the page's data arrives in history state (returns `null`). */
export function loader() {
  return null
}

/**
 * The student pressed Continue on the support screen: acknowledge it, then
 * advance to `ACTION`. Never fails the screen — it has already moved on, and a
 * refused guard means the session is somewhere else, not that the child did
 * something wrong.
 */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { advanced: false }

  const form = await request.formData()
  const sessionId = String(form.get('sessionId') ?? '')
  if (!sessionId) return { advanced: false }

  const acked = await bpContinueSupport(bp.accessToken, sessionId)
  if (!acked.ok) {
    console.error(`${TAG} continueSupport failed (${acked.error.kind}): ${acked.error.message}`)
    return { advanced: false }
  }

  const advanced = await bpTransition(bp.accessToken, sessionId, InterventionState.Action)
  if (!advanced.ok) {
    console.error(`${TAG} SUPPORT→ACTION failed (${advanced.error.kind}): ${advanced.error.message}`)
    return { advanced: false }
  }
  return { advanced: true }
}

export default function StudentHelpfulContentRoute() {
  return <HelpfulContent />
}
