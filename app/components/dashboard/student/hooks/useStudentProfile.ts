import { useEffect, useState } from "react";

import { DEFAULT_AVATAR } from "~/lib/student/avatars";
import { studentStorage } from "~/lib/student/storage";

/**
 * Student profile hydration — the single source for the avatar + username IIFEs
 * that were byte-identical across the 6 hub pages (`today.html:740-754` et al.):
 * a `'Sophie'` name fallback, the >9-char → `8 + '…'` truncation for the
 * sidebar label, and the `avatar-3` / `#b8c0ed` avatar defaults.
 *
 * Storage is read only on the client (via the SSR-safe adapter), so SSR and the
 * first client commit render the defaults; the effect then hydrates the stored
 * values. This mirrors the prototype (its IIFEs ran after first paint too) and
 * avoids a hydration mismatch.
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
  const [profile, setProfile] = useState<StudentProfile>({
    name: DEFAULT_NAME,
    displayName: DEFAULT_NAME,
    greeting: `Hi ${DEFAULT_NAME}!`,
    avatarSrc: DEFAULT_AVATAR_SRC,
    avatarBg: DEFAULT_AVATAR_BG,
    hydrated: false,
  });

  useEffect(() => {
    const name = studentStorage.getUsername() || DEFAULT_NAME;
    const avatarSrc = studentStorage.getAvatar() || DEFAULT_AVATAR_SRC;
    const avatarBg = studentStorage.getAvatarBg() || DEFAULT_AVATAR_BG;
    setProfile({
      name,
      displayName: truncate(name),
      greeting: `Hi ${name}!`,
      avatarSrc,
      avatarBg,
      hydrated: true,
    });
  }, []);

  return profile;
}
