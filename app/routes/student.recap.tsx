/**
 * `/student/recap` — 6-slide monthly-recap story (ports `recap.html`).
 *
 * Full-bleed page (no sidebar): a direction-aware slide machine with an
 * animation lock, segmented progress, a device-level clip-path entry reveal, and
 * a final-slide wave shrink (Phase 10). Reads no `bp_*` storage (every value is
 * baked), so it renders server-side directly — no `clientLoader`/`HydrateFallback`
 * needed. Exit → `/student/journey?from=recap`. Mirrored at
 * `/preview/student/recap`.
 */

import { RecapStory } from '~/components/dashboard/student/recap'

export function meta() {
  return [{ title: 'Recap · Blueprint' }, { name: 'description', content: 'Weekly recap story.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

export default function StudentRecapRoute() {
  return <RecapStory />
}
