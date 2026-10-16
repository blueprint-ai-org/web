/**
 * Sparks-cluster copy — ported from `sparks.html`, `collection.html` and
 * `collectible.html`.
 *
 * The prototype's shop grid, its prices, the three collectibles and the
 * collection's "out of 20" were baked constants; they are the gateway's now
 * (`listCollectibles`, `sparkBalance`, `listMilestones`). What stays here is
 * UI copy and the per-section label/icon, which are design, not data.
 */

import type { CollectibleSection } from '~/lib/bp-ai/gql/schema'

// ── Copy ────────────────────────────────────────────────────────────────────

export const SPARKS_COPY = {
  title: 'Sparkz',
  subtitle: 'Collect Sparkz. Collect art you love.',
  totalLabel: 'Total',
  buyBtn: 'Buy a new collectible',
  successLabel: 'New collectible!',
  collectionBtn: 'View cards collection',
  /** `sparks.html:723-724` — the confirm question is templated with the cost. */
  confirmQuestion: (cost: number): string =>
    `Ready to unlock this collectible? It'll cost you ${cost} Sparkz.`,
} as const

export const COLLECTION_COPY = {
  /** `collection.html:172-175` — two lines (the prototype's `<br>`). */
  desc: [
    "You're starting your collection.",
    'Every card is one more step on your journey.',
  ],
} as const

/**
 * Label and icon per earnable section, in list order (`collection.html:200-205`).
 * Typed against the generated enum, so a new section fails the typecheck
 * instead of rendering without a label.
 */
export const SECTION_META: Readonly<Record<Exclude<CollectibleSection, 'SHOP'>, { label: string; icon: string }>> = {
  MOOD: { label: 'Mood check-in', icon: 'section-icon-mood.svg' },
  ABOUT: { label: 'All about you', icon: 'section-icon-about.svg' },
  WINS: { label: 'Notice your wins', icon: 'section-icon-wins.svg' },
  WRITE: { label: 'Write it out', icon: 'section-icon-write.svg' },
}
