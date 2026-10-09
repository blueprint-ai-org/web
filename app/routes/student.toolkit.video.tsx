/**
 * `/student/toolkit/video` — video player + feedback wizard (ports
 * `toolkit-video.html`). Query: `?video`, `?from`.
 *
 * Full-bleed page (no sidebar): a native `<video>` (rendered outside the scaled
 * stage) with a custom rAF scrubber, then a 5-screen feedback wizard
 * (did-try → helpful → why → thanks). Sets `bp_video_watched` on play/finish;
 * the `?from` → exit matrix returns to today / school / school?tab=attend /
 * toolkit. Mirrored at `/preview/student/toolkit/video`. Client-only render
 * (see `HydrateFallback`).
 */

import { VideoFlow } from '~/components/dashboard/student/toolkit'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Toolkit video · Blueprint' }, { name: 'description', content: 'Toolkit video.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Client loader — reads the watch gate via the adapter. */
export function clientLoader() {
  return { videoWatched: studentStorage.getVideoWatched() }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Toolkit video" route="/student/toolkit/video" source="toolkit-video.html" />
}

/** Stub action — the future write seam (`bp_video_watched`). */
export function action() {
  return null
}

export default function StudentToolkitVideoRoute() {
  return <VideoFlow />
}
