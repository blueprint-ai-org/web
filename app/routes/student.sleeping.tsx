/**
 * `/student/sleeping` — sleeping gate page (ports `sleeping.html`).
 *
 * Full-bleed page (no sidebar): a slowly-orbiting moon behind a large blue
 * circle, two eyes whose highlights drift shut, and a floating title + orange
 * message bubble (see {@link SleepingGate}). Static gate — no time logic, no
 * storage, no write action. Mirrored at `/preview/student/sleeping`.
 */

import { SleepingGate } from '~/components/dashboard/student/sleeping'

export function meta() {
  return [{ title: 'Sleeping · Blueprint' }, { name: 'description', content: 'Sleeping gate.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

export default function StudentSleepingRoute() {
  return <SleepingGate />
}
