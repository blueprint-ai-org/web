/**
 * `/student/journal/question` — guided journal question flow (ports
 * `journal-question.html`). Query: `?q` (1|2).
 *
 * Full-bleed page (no sidebar): a 3-screen wizard (question → write → saved)
 * that persists `bp_journal_q1|q2` and finishes back to `/student/journal`.
 * Client-only render (see `HydrateFallback`). Mirrored at
 * `/preview/student/journal/question`.
 */

import { JournalQuestion } from '~/components/dashboard/student/journal'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Journal question · Blueprint' }, { name: 'description', content: 'Guided journal question.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — reads any saved answers for the `?q` prompt via the adapter. */
export function clientLoader() {
  return {
    q1: studentStorage.getJournalAnswer(1, 'session'),
    q2: studentStorage.getJournalAnswer(2, 'session'),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Journal question" route="/student/journal/question" source="journal-question.html" />
}

/** Stub action — the future write seam (`bp_journal_q1` / `bp_journal_q2`). */
export function action() {
  return null
}

export default function StudentJournalQuestionRoute() {
  return <JournalQuestion />
}
