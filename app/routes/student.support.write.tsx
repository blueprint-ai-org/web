/**
 * `/student/support/write` — "write it out" support flow (ports
 * `support-write.html`).
 *
 * Full-bleed page (orange stage, no sidebar, Phase 13): a 2-screen flow — the
 * write screen (spark pill, prompt bubble, disabled-until-typed Save) crossfades
 * into a done screen. No storage read (the prototype touches no `bp_*`); the
 * `action` sends the message as `requestSupport`, and its `delivered` picks the
 * done copy — "Message Sent!" only when someone was reached. Both exits —
 * the write back button and the done Done button — `navigate(-1)`. Content is
 * baked, so it SSRs directly with no `clientLoader`. Mirrored at
 * `/preview/student/support/write`.
 */

import type { ActionFunctionArgs } from 'react-router'

import { SupportWrite } from '~/components/dashboard/student/support'
import { bpRequestSupport } from '~/lib/bp-ai/support.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

const TAG = '[support-write]'

export function meta() {
  return [{ title: 'Write it out · Support · Blueprint' }, { name: 'description', content: 'Support write flow.' }]
}

/**
 * Send the message as a support request (step-16).
 *
 * `delivered` decides the done screen's copy, so every path that did NOT reach
 * a person — no BP session, a malformed form, a refused or failed call —
 * answers `delivered: false`. There is no path that reports "sent" without the
 * gateway saying so.
 */
export async function action({ request }: ActionFunctionArgs): Promise<{ delivered: boolean }> {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { delivered: false }

  const form = await request.formData()
  const message = String(form.get('message') ?? '').trim()
  const requestId = String(form.get('requestId') ?? '')
  if (!message || !requestId) return { delivered: false }

  const result = await bpRequestSupport(bp.accessToken, message, requestId)
  if (!result.ok) {
    console.error(`${TAG} requestSupport failed (${result.error.kind}): ${result.error.message}`)
    return { delivered: false }
  }
  return result.data
}

export default function StudentSupportWriteRoute() {
  return <SupportWrite />
}
