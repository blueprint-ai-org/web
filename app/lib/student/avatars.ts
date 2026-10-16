/**
 * The student's avatar choices, as the tenant's catalogue defines them.
 *
 * The four avatars used to be defined HERE — slug, art under `public/`,
 * colour, a fixed default — and a script seeded the catalogue from
 * this list, pointing `image_url` at this app's own origin. Since step-23
 * manager seeds the catalogue (`key`, `isDefault`, `background`), the art is
 * uploaded to the bucket with `uploadAsset`, and the app draws whatever the
 * catalogue says. An `image_url` that is still empty draws the background disc
 * alone — the placeholder — rather than local art that could disagree with
 * what other Blueprint clients show.
 *
 * What the catalogue cannot hold — the hand-tuned googly-eye geometry the
 * onboarding picker draws — stays in `AvatarScreen`, keyed by `Avatar.key`.
 */

/** One choice in a picker. */
export interface PickableAvatar {
  /** The catalogue row's id, which is what `setMyAvatar` takes. */
  readonly id: string
  /** Stable slug (`Avatar.key`): what per-avatar art is keyed on. */
  readonly key: string
  /** The art, or null until someone uploads it. */
  readonly src: string | null
  readonly bg: string
  readonly isDefault: boolean
}

/** The disc behind an avatar whose row names no background, and behind "no avatar". */
export const NEUTRAL_AVATAR_BG = '#36363f'

/**
 * Which avatar a picker opens on: the student's own pick when it is still in
 * the catalogue, else the tenant's default, else none.
 */
export function initialAvatarId(avatars: readonly PickableAvatar[], chosenId: string | null): string | null {
  if (chosenId && avatars.some((a) => a.id === chosenId)) return chosenId
  return avatars.find((a) => a.isDefault)?.id ?? null
}
