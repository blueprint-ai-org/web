/**
 * Scoped CSS for the grades/school page — only the bits inline styles can't
 * express: the attendance chart clip-path reveal (`grades.html:175-183`), the
 * grades-journal done-screen entry (`:611-629`), the drawer scrollbar hide, and
 * the `:hover`/`:disabled`/`.selected` affordances. Layout/geometry stays inline
 * on the elements (the established page-port convention).
 *
 * Class names are namespaced `gr-*` so they can't collide with `app.css` or a
 * sibling page's scoped block. The done-screen entry is expressed as one-shot
 * keyframes with `fill-mode: backwards` (the "from" state paints before the
 * first frame, then reverts to the natural base) — reproducing the prototype's
 * `gj-entered` (reward + title, immediate) / `gj-phase2` (bubble + buttons,
 * +300ms) double-rAF stagger without any JS.
 */

const BEZ_DONE = 'cubic-bezier(0.75,0,0.3,0.99)'

export const GRADES_CSS = `
/* ── Attendance chart reveal (grades.html:175-183) ────────────────────────── */
@keyframes gr-chart-reveal {
  from { clip-path: inset(0 0 100% 0); }
  to   { clip-path: inset(0 0 0% 0); }
}
.gr-chart-line { animation: gr-chart-reveal 1s ease-out both 0.3s; }

/* ── Subject cards + pills + buttons ──────────────────────────────────────── */
.gr-subject-card { transition: background 120ms; cursor: pointer; }
.gr-subject-card:hover { background: #252530; }
.gr-tab-pill { transition: background 150ms, color 150ms; cursor: pointer; }
.gr-remember-btn { transition: background 120ms; cursor: pointer; }
.gr-remember-btn:hover { background: rgba(255,255,255,0.06); }
.gr-video-play { cursor: pointer; }
.gr-heart-btn { transition: transform 120ms; cursor: pointer; }
.gr-heart-btn:active { transform: scale(0.9); }

/* ── Subject drawer ───────────────────────────────────────────────────────── */
.gr-drawer { scrollbar-width: none; }
.gr-drawer::-webkit-scrollbar { display: none; }
.gr-drw-btn { transition: background 120ms; cursor: pointer; }
.gr-drw-btn:hover { background: rgba(255,255,255,0.06); }
.gr-drw-btn.gr-drw-btn-on { background: rgba(255,255,255,0.16); border-color: transparent; color: #ededed; }
.gr-grade-pill { transition: border-color 120ms; cursor: pointer; }
.gr-grade-pill.selected { border-color: #a4a59f; }
.gr-grade-pill:disabled { opacity: 0.25; cursor: default; pointer-events: none; }
.gr-back-btn { transition: background 120ms; cursor: pointer; }
.gr-back-btn:hover { background: rgba(255,255,255,0.24); }

/* ── Grades journal overlay ───────────────────────────────────────────────── */
.gr-gj-back { transition: background 120ms; cursor: pointer; }
.gr-gj-back:hover { background: rgba(255,255,255,0.24); }
.gr-gj-save:disabled { opacity: 0.4; cursor: default; }

/* Done-screen entry (grades.html:611-629) — reward/title immediate, bubble/buttons +300ms */
@keyframes gr-gj-rise { from { transform: translateY(400px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes gr-gj-slide-x { from { transform: translateX(500px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes gr-gj-rise-btn { from { transform: translateX(-50%) translateY(200px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
.gr-gj-done-reward { animation: gr-gj-rise 800ms ${BEZ_DONE} backwards; }
.gr-gj-done-title { animation: gr-gj-rise 800ms ${BEZ_DONE} backwards; }
.gr-gj-done-bubble { animation: gr-gj-slide-x 800ms ${BEZ_DONE} 300ms backwards; }
.gr-gj-btn-row { animation: gr-gj-rise-btn 800ms ${BEZ_DONE} 300ms backwards; }
`
