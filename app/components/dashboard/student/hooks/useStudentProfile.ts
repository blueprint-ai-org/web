import { useOutletContext } from "react-router";

import type { PersonaOutletContext } from "~/routes/_persona";
import { NEUTRAL_AVATAR_BG } from "~/lib/student/avatars";

/**
 * Student profile hydration — the single source for the avatar + username IIFEs
 * that were byte-identical across the 6 hub pages (`today.html:740-754` et al.):
 * a `'Sophie'` name fallback, the >9-char → `8 + '…'` truncation for the
 * sidebar label, and the avatar.
 *
 * **Both come from the session.** Until step-7
 * both came from `localStorage`: `_persona.tsx` resolved the name server-side
 * and `student.tsx` copied it into `bp_username` so these hub pages could read
 * it back. The copy is gone — it was a cache of a server fact with no way to
 * notice the fact had changed, and the only reason it existed was that the key
 * predated the session (the onboarding screen that asked for a name wrote it,
 * and that screen was removed on 2026-09-23).
 *
 * The avatar followed in step-23: it is `me.user.avatar`, resolved by
 * `_persona.tsx` beside the name. It was `bp_avatar` / `bp_avatar_bg`, written
 * by the pickers and read here in an effect, defaulting to a hard-coded
 * avatar-3 — so a second device showed the default. No avatar (none chosen,
 * an LTI launch, a preview) is a neutral disc.
 */

const DEFAULT_NAME = "Sophie";

export interface StudentProfile {
  /** Full stored name, or `'Sophie'`. */
  name: string;
  /** Sidebar label — truncated to `8 + '…'` when longer than 9 chars. */
  displayName: string;
  /** Greeting line, e.g. `"Hi Sophie!"`. */
  greeting: string;
  /** Avatar image URL, or null: none chosen, or its art not uploaded yet. */
  avatarSrc: string | null;
  /** Avatar background colour. */
  avatarBg: string;
}

function truncate(name: string): string {
  return name.length > 9 ? `${name.slice(0, 8)}…` : name;
}

export function useStudentProfile(): StudentProfile {
  // Every caller renders inside `_persona` → `student`, which passes this
  // context down. `?? null` rather than a non-null assertion: a story or test
  // rendering one of these components bare gets the default name instead of a
  // crash.
  const context = useOutletContext<PersonaOutletContext | null>();
  const name = context?.profileName || DEFAULT_NAME;
  const avatar = context?.profileAvatar ?? null;

  return {
    name,
    displayName: truncate(name),
    greeting: `Hi ${name}!`,
    avatarSrc: avatar?.src ?? null,
    avatarBg: avatar?.bg ?? NEUTRAL_AVATAR_BG,
  };
}
