/**
 * Support "write it out" copy — ported 1:1 from `support-write.html`'s
 * hardcoded fallback text (the `data-content` defaults the prototype's
 * `content-loader.js` would overwrite at runtime).
 *
 * The page is pure demo: nothing touches storage (no `bp_*` key, no
 * `localStorage`), so this module is copy only — {@link SupportWrite} stays
 * declarative.
 */

export const SUPPORT_COPY = {
  // ── Screen 1: write (support-write.html:177-206) ──
  sparkPill: '1',
  title: 'Need to talk?',
  writeBubble:
    "Write it out. You're not alone. Other people have felt this way too.",
  placeholder: 'Start writing here',
  save: 'Save',
  // ── Screen 2: done (support-write.html:209-232) ──
  /** Rendered across two lines (the prototype's `<br>`). */
  doneTitle: ['Message', 'Sent!'],
  doneBubble:
    "Thanks for sharing. Someone at your school will be in touch. You're always welcome to keep checking in here.",
  done: 'Done',
} as const
