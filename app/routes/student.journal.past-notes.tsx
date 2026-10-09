/**
 * `/student/journal/past-notes` — static notes archive (ports
 * `journal-past-notes.html`).
 *
 * Full-bleed page (no sidebar): a scrolling "This month" / "Older notes" list
 * beside two stat cards. Fully static demo copy — no storage read, no write
 * action. Client-only render (see `HydrateFallback`). Mirrored at
 * `/preview/student/journal/past-notes`.
 */

import { PastNotes } from '~/components/dashboard/student/journal'

export function meta() {
  return [{ title: 'Past notes · Blueprint' }, { name: 'description', content: 'Journal archive.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

export default function StudentJournalPastNotesRoute() {
  return <PastNotes />
}
