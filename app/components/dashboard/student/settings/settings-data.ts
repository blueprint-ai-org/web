import {
  DEFAULT_AVATAR_ID,
  STUDENT_AVATARS,
  type AvatarId,
  type StudentAvatar,
} from '~/lib/student/avatars'

/**
 * Baked copy + data for the settings page (ports `settings.html`'s
 * `AVATAR_DATA`, `BG_TO_ID`, `SRC_TO_ID` and the hardcoded `data-content`
 * fallbacks — the fallback text is what actually rendered, so it is canonical).
 *
 * The avatar rows themselves are no longer defined here: settings and
 * onboarding used to carry their own copy of the same four, and the pair now
 * has to agree with a seeded row in the BP AI catalogue as well. They come from
 * `~/lib/student/avatars`, which is also what the seeder reads.
 */

export { DEFAULT_AVATAR_ID }
export type { AvatarId }

/** @deprecated Prefer {@link StudentAvatar}; kept so callers need no rename. */
export type AvatarSpec = StudentAvatar

/** `AVATAR_DATA` (`settings.html:269-274`) — now the shared catalogue. */
export const SETTINGS_AVATARS: readonly StudentAvatar[] = STUDENT_AVATARS

/** `BG_TO_ID` (`settings.html:280`) — avatar bg hex → id. */
export const BG_TO_ID: Readonly<Record<string, AvatarId>> = {
  '#b38aff': 1,
  '#f3beaf': 2,
  '#b8c0ed': 3,
  '#58b880': 4,
}

/**
 * `SRC_TO_ID` (`settings.html:281-286`), keyed by the `public/` paths the app
 * actually stores in `bp_avatar` — not the prototype's `./foundations/...`.
 * A value written before the 2026-09-23 move is a stale hashed bundle URL and
 * misses here; the `bp_avatar_id` / `bp_avatar_bg` steps of the cascade in
 * `readInitialAvatar` still resolve it.
 */
export const SRC_TO_ID: Readonly<Record<string, AvatarId>> = Object.fromEntries(
  SETTINGS_AVATARS.map((a) => [a.src, a.id]),
) as Record<string, AvatarId>

// The privacy rows lived here (`settings.html:216-257`). The rows are the
// gateway's now (`myPrivacySettings`, step-22), copy included, so the screen
// paints what is enforced rather than a table that could promise otherwise.

export const SETTINGS_COPY = {
  title: 'Settings',
  tabAvatar: 'Avatar',
  tabPrivacy: 'Privacy',
  save: 'Save',
  toggleOn: 'ON',
  toggleOff: 'OFF',
} as const
