/**
 * Scoped CSS for the support "write it out" page — only the bits inline styles
 * can't express: the `:hover`/`:active`/`:disabled` affordances and the
 * textarea `::placeholder`. Layout/geometry (and the two transitions — the
 * shared circle's `top` slide and the screen crossfade) stay inline on the
 * elements, the established page-port convention.
 *
 * Class names are namespaced `sw-*` so they can't collide with `app.css` or a
 * sibling page's scoped block. Ports `support-write.html`'s `.btn-back`,
 * `.btn-save`, `.btn-primary`, and `.write-textarea::placeholder` rules
 * (`support-write.html:47-156`).
 */

export const SUPPORT_CSS = `
.sw-back { transition: background 120ms; }
.sw-back:hover { background: rgba(255,255,255,0.24); }

.sw-save { transition: opacity 150ms, transform 120ms; }
.sw-save:active { transform: scale(0.97); }
.sw-save:disabled { opacity: 0.4; cursor: default; }

.sw-primary { transition: opacity 120ms; }
.sw-primary:hover { opacity: 0.9; }

.sw-textarea::placeholder { color: #adadad; font-weight: 400; }
`
