/**
 * `/student/support/write` — "write it out" support flow (ports
 * `support-write.html`).
 *
 * Full-bleed page (orange stage, no sidebar, Phase 13): a 2-screen flow — the
 * write screen (spark pill, prompt bubble, disabled-until-typed Save) crossfades
 * into a "Message Sent!" done screen. No storage read (the prototype touches no
 * `bp_*`); the message POST is the future write seam (`action`). Both exits —
 * the write back button and the done Done button — `navigate(-1)`. Content is
 * baked, so it SSRs directly with no `clientLoader`. Mirrored at
 * `/preview/student/support/write`.
 */

import { SupportWrite } from '~/components/dashboard/student/support'

export function meta() {
  return [{ title: 'Write it out · Support · Blueprint' }, { name: 'description', content: 'Support write flow.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Stub action — the future write seam (support message POST). */
export function action() {
  return null
}

export default function StudentSupportWriteRoute() {
  return <SupportWrite />
}
