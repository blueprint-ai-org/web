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
import { bpContinueSupport, bpReportInterventionEvent, bpTransition } from '~/lib/bp-ai/intervention.server'
import { InterventionEventType } from '~/lib/bp-ai/gql/schema'
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

  // Step-28: a telemetry-only post (the screen rendering, the student leaving
  // without finishing). It carries no FSM meaning, so it answers before the
  // Continue path below and never reports `advanced`.
  const event = String(form.get('event') ?? '')
  if (event) {
    await reportEvent(bp.accessToken, sessionId, event, String(form.get('toolId') ?? ''))
    return { advanced: false }
  }

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

  // Step-28: the student is now looking at the tool the ACTION screen serves.
  // After the transition, so a session that refused to advance is not counted
  // as a tool the student saw.
  await reportEvent(bp.accessToken, sessionId, 'TOOL_SELECTED', String(form.get('toolId') ?? ''))
  return { advanced: true }
}

/**
 * Step-28 engagement telemetry. Advisory by construction: an unknown event
 * name or a failed call is logged and the screen carries on, because nothing
 * the student does next depends on it.
 */
async function reportEvent(accessToken: string, sessionId: string, event: string, toolId: string): Promise<void> {
  const type = (Object.values(InterventionEventType) as string[]).includes(event)
    ? (event as InterventionEventType)
    : null
  if (!type) {
    console.error(`${TAG} unknown intervention event ${JSON.stringify(event)}`)
    return
  }
  const sent = await bpReportInterventionEvent(accessToken, sessionId, type, toolId || undefined)
  if (!sent.ok) console.error(`${TAG} reportInterventionEvent ${type} failed (${sent.error.kind}): ${sent.error.message}`)
}

export default function StudentHelpfulContentRoute() {
  return <HelpfulContent />
}
