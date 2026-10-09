/**
 * `/counselor` — Counselor persona layout.
 *
 * Renders a sub-nav linking the 3 Counselor views (insights, class-health,
 * student-wellbeing) and an `<Outlet />` for the active child route. The
 * outer persona layout (`_persona.tsx`) owns the LTI session gate, theme
 * cookie, `CanvasHeader`, and `frame-ancestors` CSP — this layout is just
 * the Counselor-specific chrome.
 */

import { NavLink, Outlet } from 'react-router'

export function meta() {
  return [
    { title: 'Counselor · Blueprint' },
    { name: 'description', content: 'Counselor wellbeing dashboard.' },
  ]
}

const NAV_ITEMS = [
  { to: '/counselor/insights', label: 'Insights' },
  { to: '/counselor/class-health', label: 'Class Health' },
  { to: '/counselor/student-wellbeing', label: 'Student Wellbeing' },
] as const

export default function CounselorLayout() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Sub-nav */}
      <nav className="flex items-center gap-1 border-b border-border">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'px-3 py-2 text-sm font-medium rounded-t-md transition-colors',
                'hover:text-foreground hover:bg-card/50',
                isActive
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground border-b-2 border-transparent -mb-px',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Active view */}
      <div>
        <Outlet />
      </div>
    </div>
  )
}
