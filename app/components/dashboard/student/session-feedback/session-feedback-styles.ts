/**
 * Scoped CSS for the session-feedback page — only the bits inline styles can't
 * express: the answer-block base border + `.selected` state (an inline `border`
 * would out-specify the class, so the border lives here) and the pointer
 * affordances. Layout/geometry stays inline on the elements (the established
 * page-port convention); the inter-screen rise/stagger is driven by
 * `useEnterAnimation` via inline transitions, so no keyframes are needed here.
 *
 * Class names are namespaced `sf-*` so they can't collide with `app.css` or a
 * sibling page's scoped block. Mirrors the prototype's `.q-block` /
 * `.q-block.selected` (`session-feedback.html:94-104`).
 */

export const SESSION_FEEDBACK_CSS = `
/* ── Answer blocks (session-feedback.html:94-104) ─────────────────────────── */
.sf-block {
  border: 1px solid rgba(92,92,101,0.3);
  cursor: pointer;
  transition: border-color 150ms, border-width 150ms;
}
.sf-block.sf-selected { border: 3px solid #f2f3e5; }

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.sf-btn { cursor: pointer; }
`
