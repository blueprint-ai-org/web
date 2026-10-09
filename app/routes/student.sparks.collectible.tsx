/**
 * `/student/sparks/collectible` — collectible detail (ports `collectible.html`).
 * Query: `?c`, `?anim`.
 *
 * Full-bleed purple page (no sidebar, Phase 11): the query-driven `COLLECTIBLES`
 * detail (art + achievement text), the `?anim=1` cloud-shrink entrance, and the
 * back-exit → `/student/sparks?back=1`. No storage read, no write action (content
 * is query-driven), so it SSRs directly with no `clientLoader`. Mirrored at
 * `/preview/student/sparks/collectible`.
 */

import { SparksCollectible } from '~/components/dashboard/student/sparks'

export function meta() {
  return [{ title: 'Collectible · Blueprint' }, { name: 'description', content: 'Sparkz collectible.' }]
}

/** Stub server loader — the future backend-endpoint seam (returns `null`). */
export function loader() {
  return null
}

export default function StudentSparksCollectibleRoute() {
  return <SparksCollectible />
}
