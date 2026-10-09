/**
 * `/student/notice-wins` — notice-wins activity (ports `notice-wins.html`).
 *
 * Full-bleed page (no sidebar): a monster prompt + textarea (prefilled on edit);
 * Save writes `bp_wins_note`/`bp_wins_question` and hands off to
 * `/student/completed?card=wins` (Phase 7). Client-only render (see
 * `HydrateFallback`). Mirrored at `/preview/student/notice-wins`.
 */

import { NoticeWins } from '~/components/dashboard/student/activities'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Notice wins · Blueprint' }, { name: 'description', content: 'Notice-wins activity.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — edit prefill reads the stored win via the adapter. */
export function clientLoader() {
  return {
    winsNote: studentStorage.getWinsNote(),
    winsQuestion: studentStorage.getWinsQuestion(),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Notice wins" route="/student/notice-wins" source="notice-wins.html" />
}

/** Stub action — the future write seam (`bp_wins_note` / `bp_wins_question`). */
export function action() {
  return null
}

export default function StudentNoticeWinsRoute() {
  return <NoticeWins />
}
