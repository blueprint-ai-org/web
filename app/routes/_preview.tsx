/**
 * Dev-only `/preview/*` layout for visual QA without an LTI session.
 *
 * Hard-gated by `NODE_ENV !== "production"`: any request in production
 * `throw`s a 404 from the loader so these routes can't leak unauthenticated
 * dashboards in deploy. Locally (and on Railway preview envs where
 * `NODE_ENV !== "production"`) the layout renders a tiny "PREVIEW MODE"
 * banner above the requested persona dashboard.
 *
 * The persona-shell routes assume LTI session + theme cookie chrome; this
 * layout deliberately omits both — it just reads `?theme=light|dark` and
 * mirrors `_persona.tsx`'s `counselor-light` class toggle so light-mode
 * theming still works during visual QA.
 */

import { Outlet, useOutletContext } from 'react-router'
import type { Route } from './+types/_preview'
import type { ThemeMode } from '~/lib/theme-types'

export type PreviewOutletContext = {
  themeMode: ThemeMode
}

export async function loader({ request }: Route.LoaderArgs) {
  if (process.env.NODE_ENV === 'production') {
    throw new Response('Not Found', { status: 404 })
  }
  const url = new URL(request.url)
  // Student persona has its own design language (warm dark + Anton). The
  // `.student-dark` scope re-maps adult tokens to student values.
  const isStudent = url.pathname.startsWith('/preview/student')
  // Teacher + counselor dashboards are dark-only until light-mode work lands —
  // pin them regardless of `?theme=`. Other personas still honor the query.
  const forcedDark = url.pathname.startsWith('/preview/teacher') || url.pathname.startsWith('/preview/counselor')
  const themeParam = url.searchParams.get('theme')
  const themeMode: ThemeMode = forcedDark || isStudent ? 'dark' : themeParam === 'dark' ? 'dark' : 'light'
  return { themeMode, isStudent }
}

export default function PreviewLayout({ loaderData }: Route.ComponentProps) {
  const { themeMode, isStudent } = loaderData
  const ctx: PreviewOutletContext = { themeMode }
  const scopeClass = isStudent ? 'student-dark' : themeMode === 'light' ? 'counselor-light' : ''
  return (
    <>
      <div
        style={{
          background: '#fde68a',
          color: '#78350f',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 600,
          textAlign: 'center',
          borderBottom: '1px solid #f59e0b',
        }}
      >
        PREVIEW MODE — no LTI session. This route is dev-only and 404s in production.
      </div>
      <div className={scopeClass}>
        <Outlet context={ctx} />
      </div>
    </>
  )
}

/** Typed accessor for child routes that need the preview context. */
export function usePreviewContext(): PreviewOutletContext {
  return useOutletContext<PreviewOutletContext>()
}
