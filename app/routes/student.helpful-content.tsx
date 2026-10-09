/**
 * `/student/helpful-content` — post-check-in interstitial (ports
 * `helpful-content.html`).
 *
 * Full-bleed page (no sidebar): 3 cross-fading screens (intro → video →
 * feedback). Exits run the enter-anim protocol back to `/student`; playing the
 * video sets `bp_video_watched`. Mirrored at `/preview/student/helpful-content`.
 * No `clientLoader` — the page reads no storage at load (SSR-safe render).
 */

import { HelpfulContent } from '~/components/dashboard/student/helpful-content'

export function meta() {
  return [{ title: 'Helpful content · Blueprint' }, { name: 'description', content: 'Helpful content interstitial.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

/** Stub action — the future write seam (`bp_video_watched`). */
export function action() {
  return null
}

export default function StudentHelpfulContentRoute() {
  return <HelpfulContent />
}
