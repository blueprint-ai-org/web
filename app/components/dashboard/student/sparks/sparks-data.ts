/**
 * Sparks-cluster data model — ported 1:1 from `sparks.html`, `collection.html`,
 * and `collectible.html`'s inline markup + JS.
 *
 * The prototype is almost entirely hardcoded: only the Sparkz balance
 * (`bp_sparks`) and the collection counter (`bp_today_sections`) read storage.
 * Everything else — the 2×4 artwork grid, the three collectibles, the four
 * collection sections — is a baked constant. This module carries those constants
 * so {@link SparksShop}, {@link SparksCollection}, and {@link SparksCollectible}
 * stay declarative.
 *
 *  - {@link SPARKS_GRID} — the 8-card shop grid (`sparks.html:498-587`).
 *  - {@link COLLECTIBLES} — the three collectible detail entries
 *    (`collectible.html:143-156`).
 *  - {@link COLLECTION_SECTIONS} — the four earnable card families
 *    (`collection.html:200-205`).
 */

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
  countDenom: '/20',
  progressSparks: '+30',
  /** `collection.html:172-175` — two lines (the prototype's `<br>`). */
  desc: [
    "You're starting your collection.",
    'Every card is one more step on your journey.',
  ],
} as const

// ── Shop grid (sparks.html:498-587) ──────────────────────────────────────────

/**
 * A shop card the student can unlock (`tryUnlock`), or an already-owned reward
 * that deep-links to its collectible (`goToCollectible`).
 *
 *  - `shop`  — dark card gated by `cost`. Affordable (`sparks >= cost`) →
 *    0.7 dark overlay + centred key icon + clickable; otherwise → 0.89 overlay +
 *    top-right padlock + dimmed badge (`applyAffordability`, `sparks.html:691-707`).
 *  - `owned` — blue card showing the artwork; taps open collectible `#N`.
 */
export type GridCard =
  | { readonly kind: 'shop'; readonly cost: number; readonly art: string }
  | { readonly kind: 'owned'; readonly art: string; readonly collectible: number }

/** The 8 cards, in DOM order (rendered as two rows of four). */
export const SPARKS_GRID: readonly GridCard[] = [
  // Row 1
  { kind: 'shop', cost: 20, art: 'frame-1308.svg' },
  { kind: 'owned', art: 'frame-1305.svg', collectible: 1 },
  { kind: 'owned', art: 'frame-1307.svg', collectible: 2 },
  { kind: 'shop', cost: 200, art: 'c1.jpg' },
  // Row 2
  { kind: 'shop', cost: 400, art: 'c2.jpg' },
  { kind: 'shop', cost: 600, art: 'c3.jpg' },
  { kind: 'shop', cost: 800, art: 'c4.jpg' },
  { kind: 'shop', cost: 1000, art: 'c5.jpg' },
] as const

/** `oc-success` deep-links to collectible 3 after a purchase (`sparks.html:610`). */
export const SUCCESS_COLLECTIBLE = 3

// ── Collectible detail (collectible.html:143-156) ────────────────────────────

export interface Collectible {
  readonly img: string
  readonly text: string
}

export const COLLECTIBLES: Record<string, Collectible> = {
  '1': { img: 'frame-1305.svg', text: 'You showed up every day in April' },
  '2': { img: 'frame-1307.svg', text: 'You explored your feelings in March' },
  '3': { img: 'frame-1308.svg', text: 'You were really consistent in May' },
}

export const DEFAULT_COLLECTIBLE = '3'

// ── Collection (collection.html:198-205) ─────────────────────────────────────

export interface CollectionSection {
  readonly key: string
  readonly label: string
  readonly icon: string
  readonly asset: string
}

/** The four earnable card families, in list order. */
export const COLLECTION_SECTIONS: readonly CollectionSection[] = [
  { key: 'mood', label: 'Mood check-in', icon: 'section-icon-mood.svg', asset: 'mood-checkin-04.svg' },
  { key: 'about', label: 'All about you', icon: 'section-icon-about.svg', asset: 'all-a-y-04.svg' },
  { key: 'wins', label: 'Notice your wins', icon: 'section-icon-wins.svg', asset: 'notice-y-w-04.svg' },
  { key: 'write', label: 'Write it out', icon: 'section-icon-write.svg', asset: 'write-i-o-04.svg' },
] as const

/** Collection is out of 20 slots (`collection.html:198`). */
export const COLLECTION_TOTAL = 20
