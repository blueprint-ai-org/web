/**
 * Scoped CSS for the journey page — only the bits inline styles cannot express:
 * the six organic float keyframes (`journey.html:540-545`), the `?from=recap`
 * entry keyframe (`:547-555`), and the `:hover`/`:active`/cursor affordances.
 * Layout/geometry stays inline on the elements (the today-hub / journal /
 * toolkit convention).
 *
 * Keyframes are namespaced `jy-float-*` so they cannot collide with the shared
 * keyframes in `app.css` (`float-*` is a common name) — the constants in
 * `journey-data.ts` reference these exact names.
 */

export const JOURNEY_CSS = `
/* Feeling / bubble / dot float variants (journey.html:540-545) */
@keyframes jy-float-a { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-20px) translateX(3px)} }
@keyframes jy-float-b { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-16px) translateX(-4px)} }
@keyframes jy-float-c { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-22px) translateX(2px)} }
@keyframes jy-float-d { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-14px) translateX(-3px)} }
@keyframes jy-float-e { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-18px) translateX(4px)} }
@keyframes jy-float-f { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-19px) translateX(-2px)} }

/* Entry from recap (journey.html:547-555) */
@keyframes jy-enter-up { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.jy-inner.from-recap { animation: jy-enter-up 800ms cubic-bezier(0.73,-0.01,0.2,0.98) both; }

/* Tab pills (journey.html:88-95) */
.jy-tab-pill { transition: background 150ms, color 150ms; cursor: pointer; }

/* Stat cards (journey.html:107-113) */
.jy-stat-card { cursor: pointer; transition: transform 140ms cubic-bezier(0.34,1.56,0.64,1); }
.jy-stat-card:hover { transform: scale(1.01); }

/* Open-recap button (journey.html:305-313) */
.jy-open-recap { transition: background 150ms; cursor: pointer; }
.jy-open-recap:hover { background: rgba(255,255,255,0.06); }

/* Carousel + pagination (journey.html:316-370) */
.jy-alltime-clip { cursor: grab; user-select: none; }
.jy-alltime-clip.dragging { cursor: grabbing; }
.jy-nav-arrow { transition: background 120ms; cursor: pointer; }
.jy-nav-arrow:hover { background: rgba(255,255,255,0.08); }

/* Stat-detail back button (journey.html:143-151) */
.jy-stat-back { transition: background 120ms; cursor: pointer; }
.jy-stat-back:hover { background: rgba(255,255,255,0.24); }
.jy-stat-back:active { opacity: 0.7; }
`
