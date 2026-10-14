import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";

import type { PersonaOutletContext } from "~/routes/_persona";
import { DEFAULT_AVATAR } from "~/lib/student/avatars";
import { studentStorage } from "~/lib/student/storage";

/**
 * Student profile hydration — the single source for the avatar + username IIFEs
 * that were byte-identical across the 6 hub pages (`today.html:740-754` et al.):
 * a `'Sophie'` name fallback, the >9-char → `8 + '…'` truncation for the
 * sidebar label, and the `avatar-3` / `#b8c0ed` avatar defaults.
 *
 * **The name comes from the session, the avatar from storage.** Until step-7
 * both came from `localStorage`: `_persona.tsx` resolved the name server-side
 * and `student.tsx` copied it into `bp_username` so these hub pages could read
 * it back. The copy is gone — it was a cache of a server fact with no way to
 * notice the fact had changed, and the only reason it existed was that the key
 * predated the session (the onboarding screen that asked for a name wrote it,
 * and that screen was removed on 2026-09-23).
 *
 * The avatar is still storage, and still an effect: SSR and the first client
 * commit render the defaults and the effect hydrates. This mirrors the
 * prototype (its IIFEs ran after first paint too) and avoids a hydration
 * mismatch. The name does not need that treatment any more — it arrives with
 * the document.
 */

const DEFAULT_NAME = "Sophie";
const DEFAULT_AVATAR_BG = DEFAULT_AVATAR.bg;

export interface StudentProfile {
  /** Full stored name, or `'Sophie'`. */
  name: string;
  /** Sidebar label — truncated to `8 + '…'` when longer than 9 chars. */
  displayName: string;
  /** Greeting line, e.g. `"Hi Sophie!"`. */
  greeting: string;
  /** Avatar image URL (migrated `avatar-3.svg` when unset). */
  avatarSrc: string;
  /** Avatar background colour. */
  avatarBg: string;
  /** `true` once storage has been read on the client. */
  hydrated: boolean;
}

function truncate(name: string): string {
  return name.length > 9 ? `${name.slice(0, 8)}…` : name;
}

const DEFAULT_AVATAR_SRC = DEFAULT_AVATAR.src;

export function useStudentProfile(): StudentProfile {
  // Every caller renders inside `_persona` → `student`, which passes this
  // context down. `?? null` rather than a non-null assertion: a story or test
  // rendering one of these components bare gets the default name instead of a
  // crash.
  const context = useOutletContext<PersonaOutletContext | null>();
  const name = context?.profileName || DEFAULT_NAME;

  const [avatar, setAvatar] = useState({
    avatarSrc: DEFAULT_AVATAR_SRC,
    avatarBg: DEFAULT_AVATAR_BG,
    hydrated: false,
  });

  useEffect(() => {
    setAvatar({
      avatarSrc: studentStorage.getAvatar() || DEFAULT_AVATAR_SRC,
      avatarBg: studentStorage.getAvatarBg() || DEFAULT_AVATAR_BG,
      hydrated: true,
    });
  }, []);

  return {
    name,
    displayName: truncate(name),
    greeting: `Hi ${name}!`,
    ...avatar,
  };
}
