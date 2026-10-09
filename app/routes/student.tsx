/**
 * `/student` — Student persona layout.
 *
 * Renders an `<Outlet />` for the active child route. The `_index` slot
 * renders the dashboard; the `onboarding` slot renders the wizard. The
 * outer persona layout (`_persona.tsx`) owns the LTI session gate, theme
 * cookie, `CanvasHeader`, and `frame-ancestors` CSP — this layout is just
 * the Student-specific shell.
 *
 * It also seeds the name — see {@link useSeededUsername}.
 */

import { useEffect } from 'react'
import { Outlet, useOutletContext } from 'react-router'
import type { PersonaOutletContext } from './_persona'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [
    { title: 'Student · Blueprint' },
    { name: 'description', content: 'Student wellbeing dashboard.' },
  ]
}

/**
 * Copy the server-resolved name into `bp_username`, where the rest of the
 * student flow already looks for it.
 *
 * Until 2026-09-23 that key was written by the first onboarding screen, which
 * asked the student to type their name. The screen is gone — every user is
 * provisioned with one — so `_persona.tsx`'s loader resolves it from the BP AI
 * profile or the LTI claims and this effect puts it where `useStudentProfile`
 * and `settings` read it. **Six hub pages and the settings screen therefore
 * needed no changes at all**, which is the whole reason for seeding storage
 * rather than threading a prop.
 *
 * Three deliberate details:
 *
 *  - **The server wins.** A name already in storage is overwritten when the
 *    server knows a different one, because the profile is the record and
 *    storage is a cache of it. The alternative — first write wins — would pin a
 *    stale name on the device forever, with no screen left to correct it.
 *  - **`null` writes nothing.** Not knowing the name must leave whatever is
 *    there alone rather than clearing it: `useStudentProfile` has its own
 *    default, and blanking the key would turn "we couldn't reach the gateway"
 *    into "this student has no name".
 *  - **Client-only, in an effect.** `studentStorage` is SSR-safe but there is
 *    nothing to write on the server, and writing during render would be a side
 *    effect in a render pass.
 */
function useSeededUsername(profileName: string | null): void {
  useEffect(() => {
    if (!profileName) return
    if (studentStorage.getUsername() === profileName) return
    studentStorage.setUsername(profileName)
  }, [profileName])
}

export default function StudentLayout() {
  // Forward the persona context (token, themeMode) to children — same pattern
  // as `routes/counselor.tsx` (Outlet) and `_persona.tsx` (useOutletContext).
  const ctx = useOutletContext<PersonaOutletContext>()
  useSeededUsername(ctx.profileName)
  return <Outlet context={ctx} />
}
