/**
 * Baked copy for the settings page (ports `settings.html`'s hardcoded
 * `data-content` fallbacks — the fallback text is what actually rendered, so
 * it is canonical).
 *
 * The avatars (the prototype's `AVATAR_DATA` and its colour/path → id maps)
 * are the tenant's catalogue now (`listAvatars`, loaded by the route), and the pick is
 * `me.user.avatar` — no local table maps a colour or a path back to an id.
 */

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
