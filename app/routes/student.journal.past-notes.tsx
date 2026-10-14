/**
 * `/student/journal/past-notes` — the notes archive (ports
 * `journal-past-notes.html`).
 *
 * Full-bleed page (no sidebar): the student's journal entries, "This month" /
 * "Older notes", beside two stat cards. Read-only. Mirrored at
 * `/preview/student/journal/past-notes`.
 */

import type { LoaderFunctionArgs } from 'react-router'

import { PastNotes, type ArchiveNote, type PastNotesProps } from '~/components/dashboard/student/journal/PastNotes'
import { bpJournalArchive } from '~/lib/bp-ai/journal.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'
import { localDateFor, timeZoneFor } from '~/lib/student/time-zone'

export function meta() {
  return [{ title: 'Past notes · Blueprint' }, { name: 'description', content: 'Journal archive.' }]
}

const EMPTY: PastNotesProps = { thisMonth: [], older: [], monthCount: '0', total: '0' }

const PREVIEW: PastNotesProps = {
  thisMonth: [{ key: 'p1', date: 'October 14, 2026', text: 'A note written this month.' }],
  older: [{ key: 'p2', date: 'September 30, 2026', question: 'A prompt from the catalogue?', answer: 'Its answer.' }],
  monthCount: '1',
  total: '2',
}

/** `2026-04-27` → `April 27, 2026`, at noon UTC so no zone moves it a day. */
function longDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The first page of `listJournals`, newest first, split at the student's
 * current month. No BP session (an LTI launch) or a failed read ⇒ an empty
 * archive, never the prototype's entries.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<PastNotesProps> {
  if (isPreviewRequest(request)) return PREVIEW

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return EMPTY

  const today = localDateFor(request) ?? new Date().toISOString().slice(0, 10)
  const result = await bpJournalArchive(bp.accessToken, bp.userId, today, timeZoneFor(request))
  if (!result.ok) {
    console.error(`[journal/past-notes] listJournals failed (${result.error.kind}): ${result.error.message}`)
    return EMPTY
  }

  const { entries, counts } = result.data
  const note = (e: (typeof entries)[number]): ArchiveNote =>
    e.questionId
      ? { key: e.id, date: longDate(e.day), question: e.prompt, answer: e.text }
      : { key: e.id, date: longDate(e.day), text: e.text }
  const month = today.slice(0, 7)
  return {
    thisMonth: entries.filter((e) => e.day.startsWith(month)).map(note),
    older: entries.filter((e) => !e.day.startsWith(month)).map(note),
    monthCount: String(counts.thisMonth),
    total: `${counts.total}${counts.more ? '+' : ''}`,
  }
}

export default function StudentJournalPastNotesRoute({ loaderData }: { loaderData: PastNotesProps }) {
  return <PastNotes {...loaderData} />
}
