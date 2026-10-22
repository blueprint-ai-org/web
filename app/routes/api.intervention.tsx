/**
 * `POST /api/intervention` — open the student's intervention session.
 *
 * Called by `MoodCheckin.tsx` once the check-in has been written, for the same
 * reason the check-in's own write is a resource route: the screen is a
 * client-only imperative animation orchestrator, and a form post would
 * revalidate its loader underneath a running transition. See
 * `api.mood-checkin.tsx` for the full argument.
 *
 * ## It never fails the student
 *
 * Every failure answers **200** with `intervention: null`, and the check-in
 * then goes to the Today hub exactly as it did before this route existed. A
 * child who just finished a check-in is not shown an error page because the
 * FSM was unreachable.
 *
 * ## Two calls, and the second one is not optional
 *
 * `createInterventionSession` opens the session in `EXPRESSION`; the student is
 * about to look at the support screen, so the session is moved to `SUPPORT`
 * here. A payload whose session is still in `EXPRESSION` would strand the
 * flow — `continueSupport` answers `FAILED_PRECONDITION` outside `SUPPORT` —
 * so a refused transition reports `intervention: null` rather than handing the
 * front a session it cannot drive.
 */

import type { ActionFunctionArgs } from 'react-router'

import { bpStartIntervention, bpTransition } from '~/lib/bp-ai/intervention.server'
import { InterventionState } from '~/lib/bp-ai/gql/schema'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

const TAG = '[api/intervention]'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method', intervention: null }, { status: 405 })
  }

  const bp = await bpSessionOf(await getAppSession(request))
  // Same shape as `api/mood-checkin`: an LTI launch the gateway would not
  // exchange has no BP AI session, which is a state and not an error.
  // No `import.meta.env.DEV` log here, unlike `api/mood-checkin`: that global
  // only exists under Vite, and route modules are imported directly by
  // `node:test` under tsx, where reading it is a TypeError.
  if (!bp) return Response.json({ ok: false, reason: 'no-session', intervention: null })

  const opened = await bpStartIntervention(bp.accessToken, bp.userId)
  if (!opened.ok) {
    console.error(`${TAG} createInterventionSession failed (${opened.error.kind}): ${opened.error.message}`)
    return Response.json({ ok: false, reason: 'unavailable', intervention: null })
  }

  const { sessionId } = opened.data
  const entered = await bpTransition(bp.accessToken, sessionId, InterventionState.Support)
  if (!entered.ok) {
    console.error(`${TAG} EXPRESSION→SUPPORT failed (${entered.error.kind}): ${entered.error.message}`)
    return Response.json({ ok: false, reason: 'fsm', intervention: null })
  }

  return Response.json({ ok: true, intervention: opened.data })
}

/** A GET here is a mistake, not a page. */
export function loader() {
  return Response.json({ ok: false, reason: 'method', intervention: null }, { status: 405 })
}
