/**
 * Scoped CSS for the journal home (`journal.html`'s `<style>`), namespaced `j-`.
 * Rendered once by {@link JournalHome} via a `<style>` element — the same
 * component-scoped-stylesheet pattern the summary / mood flows use.
 *
 * Only the bits inline styles cannot express live here: `::-webkit-scrollbar`,
 * `::placeholder`, and the `:hover`/`:active`/`:disabled` pseudo-classes. All
 * layout/geometry stays inline on the elements (the today-hub / activity-shell
 * convention), and the circle→overlay FLIP + the question-overlay "done" entry
 * are driven by React state, not CSS classes.
 */

export const JOURNAL_CSS = `
/* Hidden scrollbar on the notes column (journal.html:100) */
.j-col-left { scrollbar-width: none; }
.j-col-left::-webkit-scrollbar { display: none; }

/* Interactive affordances (journal.html:114,187,196,231) */
.j-write-cta { transition: opacity 120ms; cursor: pointer; }
.j-write-cta:active { opacity: 0.9; }
.j-past-notes { transition: background 120ms; cursor: pointer; }
.j-past-notes:hover { background: #252530; }
.j-add-note { transition: background 120ms; cursor: pointer; }
.j-add-note:hover { background: #36363f; }
.j-question-circle { transition: opacity 120ms; cursor: pointer; }
.j-question-circle:active { opacity: 0.85; }
.j-note-edit { cursor: pointer; }

/* Overlay controls (journal.html:326,363,374-375) */
.wov-back { transition: background 120ms; }
.wov-back:hover { background: rgba(255,255,255,0.24); }
.wov-textarea::placeholder { color: #adadad; font-weight: 400; }
.wov-save { transition: opacity 150ms, transform 120ms; }
.wov-save:active { transform: scale(0.97); }
.wov-save:disabled { opacity: 0.4; cursor: default; }
.qov-btn:active { opacity: 0.85; }
`
