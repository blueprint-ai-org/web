/**
 * `/preview/counselor` — dev-only Counselor persona preview layout.
 *
 * Mirrors `counselor.tsx`'s sub-nav but rewrites the `NavLink` targets to
 * `/preview/counselor/<tab>` so the preview tree stays self-contained. The
 * `_preview.tsx` layout owns the production 404 gate.
 */

import { NavLink, Outlet } from 'react-router'

export function meta() {
  return [
    { title: 'Counselor (preview) · Blueprint' },
    { name: 'description', content: 'Counselor wellbeing dashboard preview.' },
  ]
}

const NAV_ITEMS = [
  { to: '/preview/counselor/insights', label: 'Insights' },
  { to: '/preview/counselor/class-health', label: 'Class Health' },
  { to: '/preview/counselor/student-wellbeing', label: 'Student Wellbeing' },
] as const

export default function PreviewCounselorLayout() {
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
