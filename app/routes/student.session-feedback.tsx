/**
 * `/student/session-feedback` — session feedback (ports `session-feedback.html`).
 *
 * Full-bleed page (no sidebar): a "Did it help?" question screen + three
 * terminal response screens, all rendered by {@link SessionFeedback}. Exit →
 * `/student/mood-checkin`. No inbound link in the prototype — direct-URL
 * scenario. Mirrored at `/preview/student/session-feedback`.
 */

import { SessionFeedback } from '~/components/dashboard/student/session-feedback'

export function meta() {
  return [{ title: 'Session feedback · Blueprint' }, { name: 'description', content: 'Session feedback.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Stub action — the future write seam (feedback POST). */
export function action() {
  return null
}

export default function StudentSessionFeedbackRoute() {
  return <SessionFeedback />
}
