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

// `useSeededUsername` lived here: it copied `_persona.tsx`'s server-resolved
// name into `bp_username` so the six hub pages could read it back out of
// storage. `useStudentProfile` reads the session directly now — a cache of a
// server fact, with nothing to invalidate it, is worse than the fact.

export default function StudentLayout() {
  // Forward the persona context (token, themeMode) to children — same pattern
  // as `routes/counselor.tsx` (Outlet) and `_persona.tsx` (useOutletContext).
  const ctx = useOutletContext<PersonaOutletContext>()
  return <Outlet context={ctx} />
}
