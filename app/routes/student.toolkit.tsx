/**
 * `/student/toolkit` — toolkit home (ports `my-toolkit.html`).
 * Query: `?tab`, `?explore`, `?reset`, `?preview`.
 *
 * Sidebar-bearing stage page (Phase 9): simple vs full views gated on
 * `bp_video_watched`, RECOMMENDED/BROWSE/DO IT AGAIN/SAVED filter tabs,
 * heart-save (Set-based, min-1 rule), explore mode. Shared module — also mounted
 * at `/preview/student/toolkit` (explicit id in `routes.ts`). Client-only render
 * (see `HydrateFallback`).
 */

import { ToolkitHome } from '~/components/dashboard/student/toolkit'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'My toolkit · Blueprint' }, { name: 'description', content: 'Student toolkit.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — toolkit reads the video gate + hearted items via the adapter. */
export function clientLoader() {
  return {
    videoWatched: studentStorage.getVideoWatched(),
    saved: studentStorage.getSaved(['v2']),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="My toolkit" route="/student/toolkit" source="my-toolkit.html" chrome />
}

/** Stub action — the future write seam (heart-save Set). */
export function action() {
  return null
}

export default function StudentToolkitRoute() {
  return <ToolkitHome />
}
