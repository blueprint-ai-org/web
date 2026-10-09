/**
 * The four student avatars — one source of truth for the app *and* for what
 * gets seeded into the BP AI avatar catalogue.
 *
 * ## Why these live in `public/` and not in the asset bundle
 *
 * The gateway stores an avatar as a row: `Avatar { id, name, image_url,
 * background, order, status }` — a *reference*, never the bytes. Since
 * 2026-09-29 the gateway does sign uploads: `uploadAsset` returns a V4-signed
 * GCS PUT plus the `publicUrl` to store (it takes no `Upload` scalar; the
 * browser PUTs the file to the bucket itself). But `uploadAsset` is **ADMIN**,
 * and this app holds a student JWT, so for the student app the answer is
 * unchanged: it uploads nothing, and its only asset write stays
 * `setMyAvatar`. Avatar art is the tenant's, uploaded by an operator from the
 * BP Admin content console (`/tenant/content/avatars`) — or, for these four,
 * hosted from this app's `public/` and seeded as URLs.
 *
 * That rules out `studentAsset()`, which resolves through Vite's asset graph to
 * a **content-hashed URL that changes on every build** — fine in JSX, useless
 * the moment a value has to outlive a deploy. Files under `public/` are served
 * verbatim at a stable path, which is what a stored URL needs.
 *
 * {@link AVATAR_SRC} is therefore the one path constant, used twice:
 *
 * - the app renders it directly (`/avatars/avatar-1.svg`), so local dev needs
 *   no origin and no env var;
 * - `scripts/bp-ai-seed-avatars.ts` prefixes `PUBLIC_BASE_URL` to store an
 *   absolute URL, so the row is resolvable by any Blueprint client — including
 *   ones that are not this web app.
 *
 * ## What the catalogue cannot hold
 *
 * The onboarding picker draws animated googly eyes over each avatar with
 * hand-tuned per-avatar pupil geometry, and `Avatar` has no field for it. That
 * geometry stays in `AvatarScreen`, keyed by {@link AvatarSlug}. An avatar an
 * admin adds later still renders — from its `image_url`, without eyes — rather
 * than breaking the picker.
 */

/** Stable identity, shared with the catalogue row's `name`. */
export type AvatarSlug = 'avatar-1' | 'avatar-2' | 'avatar-3' | 'avatar-4'

/** Legacy 1-based id the settings page stores in `bp_avatar_id`. */
export type AvatarId = 1 | 2 | 3 | 4

export interface StudentAvatar {
  readonly id: AvatarId
  readonly slug: AvatarSlug
  /** Root-relative `public/` path — stable across builds, unlike `studentAsset`. */
  readonly src: string
  /** The picker's background disc, and the row's `background`. */
  readonly bg: string
}

/**
 * Root-relative path for a slug. The seeder prefixes an origin; the app does not.
 *
 * **Deliberately not under `/student/`.** `server.ts:86` registers
 * `app.get('/student/*splat', rrHandler)` *before* the static middleware, so
 * every `/student/**` URL is claimed by React Router and no file under
 * `public/student/` is reachable in any environment — measured 2026-09-23, dev
 * and the Railway deploy both 404. Art whose URL is about to be written into
 * the gateway cannot sit behind that shadow.
 */
export function avatarSrc(slug: AvatarSlug): string {
  return `/avatars/${slug}.svg`
}

/**
 * Left-to-right order in the picker, which is also the row's `order`.
 * Colours are the prototype's (`settings.html:269-274`, `onboarding.html#s3`).
 */
export const STUDENT_AVATARS: readonly StudentAvatar[] = [
  { id: 1, slug: 'avatar-1', src: avatarSrc('avatar-1'), bg: '#b38aff' },
  { id: 2, slug: 'avatar-2', src: avatarSrc('avatar-2'), bg: '#f3beaf' },
  { id: 3, slug: 'avatar-3', src: avatarSrc('avatar-3'), bg: '#b8c0ed' },
  { id: 4, slug: 'avatar-4', src: avatarSrc('avatar-4'), bg: '#58b880' },
]

/** The avatar a student has before they pick one (`settings.html:279`). */
export const DEFAULT_AVATAR_ID: AvatarId = 3

export const DEFAULT_AVATAR: StudentAvatar =
  STUDENT_AVATARS.find((a) => a.id === DEFAULT_AVATAR_ID) ?? STUDENT_AVATARS[0]

/** Look up by the stored `bp_avatar` src. Unknown src → `undefined`, never a throw. */
export function avatarBySrc(src: string): StudentAvatar | undefined {
  return STUDENT_AVATARS.find((a) => a.src === src)
}

/** Look up by slug — the key the catalogue's `name` carries. */
export function avatarBySlug(slug: string): StudentAvatar | undefined {
  return STUDENT_AVATARS.find((a) => a.slug === slug)
}

/**
 * One choice in the picker, after the catalogue and the local art are merged.
 *
 * `id` is the catalogue row's — `null` when there is no catalogue behind this
 * pick, which is what makes a choice unsaveable: `setMyAvatar` takes an id and
 * nothing else can stand in for one.
 */
export interface PickableAvatar {
  readonly id: string | null
  readonly slug: string
  readonly src: string
  readonly bg: string
}
