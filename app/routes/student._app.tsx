/**
 * `student/_app` — pathless grouping layout for the six sidebar-bearing hub
 * pages (Today index + Journal, My toolkit, Journey, Grades, Sparkz).
 *
 * In the prototype migration each hub page renders its own full 1194×834
 * {@link StudentStage} with an *in-canvas* {@link Sidebar} (Phase 2), so this
 * layout no longer paints the legacy fixed nav-rail / `pl-[104px]` content
 * shell — it is now a transparent passthrough that just forwards the parent
 * (persona or preview) context to its `<Outlet />`. The layout is kept as a
 * route-tree grouping so the stage pages stay distinct from the full-bleed
 * siblings (mood-checkin, activities, satellites …) registered outside it.
 *
 * Mounted under BOTH the LTI subtree (`/student`, context from `_persona`) and
 * the dev preview subtree (`/preview/student`, context from `_preview`); it is
 * context-agnostic and forwards whatever the parent provides.
 */

import { Outlet, useOutletContext } from 'react-router'
import type { PersonaOutletContext } from './_persona'
import type { PreviewOutletContext } from './_preview'

type StudentAppContext = PersonaOutletContext | PreviewOutletContext

export default function StudentAppShell() {
  // Forward the parent context (persona or preview) to children unchanged.
  const ctx = useOutletContext<StudentAppContext>()
  return <Outlet context={ctx} />
}
