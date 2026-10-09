/**
 * Class-based CSS shared by the three daily-card activity flows
 * (`write-it-out.html`, `notice-wins.html`, `all-about-you.html`), namespaced
 * `act-` to avoid collisions. Rendered once per screen via a `<style>` element —
 * the same component-scoped-stylesheet pattern the mood check-in and completed
 * flows use.
 *
 * Only the bits inline styles cannot express live here: `::placeholder`,
 * `:hover`/`:active`/`:disabled` pseudo-classes, the `.selected` emoji state,
 * and the mount fade-in. Per-activity geometry (back-button radius, save-button
 * size, screen/bubble colours) stays as inline styles / CSS custom properties on
 * the elements, since the three flows diverge there.
 *
 * Note on the prototype's `@keyframes float`: it animates the `#s-done`
 * "Completed!" card, which is DEAD CODE in all three prototype pages — `goTo`
 * is never called; `saveNote`/`saveSurvey` navigate straight to
 * `completed.html?card=…`. The real post-save card choreography lives in the
 * Phase 6 `/student/completed` route (`CompletedSequence`), so the float is not
 * reproduced here. What these screens keep is a soft mount fade-in (`.act-in`),
 * matching the prototype `.screen` opacity transition and this codebase's
 * overlay convention.
 */

export const ACTIVITY_CSS = `
/* ── Mount fade-in (mirrors the prototype .screen opacity transition) ───── */
.act-body { opacity: 0; transform: translateY(8px); transition: opacity 320ms cubic-bezier(0.4,0,0.2,1), transform 320ms cubic-bezier(0.4,0,0.2,1); }
.act-body.act-in { opacity: 1; transform: none; }

/* ── Back button (geometry + hover colours via custom props) ────────────── */
.act-btn-back {
  position: absolute; top: 36px; left: 24px; z-index: 10;
  border: none; cursor: pointer; display: grid; place-items: center;
  background: var(--act-back-bg, rgba(255,255,255,0.16));
  transition: background 120ms;
}
.act-btn-back:hover { background: var(--act-back-bg-hover, rgba(255,255,255,0.24)); }

/* ── Textarea ───────────────────────────────────────────────────────────── */
.act-textarea {
  width: 100%; box-sizing: border-box;
  border: none; outline: none; resize: none;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 600;
  color: #f2f3e5; padding: 10px 16px;
  background: transparent; min-height: 200px;
}
.act-textarea::placeholder { color: #adadad; font-weight: 400; }

/* ── Save button (identical treatment across all three flows) ───────────── */
.act-btn-save {
  background: #f2f3e5; color: #1f1f25;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  border: none; cursor: pointer;
  transition: opacity 150ms, transform 120ms;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.act-btn-save:active { transform: scale(0.97); }
.act-btn-save:disabled { opacity: 0.4; cursor: default; }

/* ── Emoji grid (all-about-you) ─────────────────────────────────────────── */
.act-emoji-btn {
  width: 78px; height: 78px; border-radius: 50%;
  background: #2f2f37; border: 8px solid #2f2f37;
  cursor: pointer; display: grid; place-items: center;
  font-size: 40px; line-height: 1;
  transition: border 120ms;
  box-sizing: border-box; flex-shrink: 0; padding: 0;
}
.act-emoji-btn.selected { border: 3px solid #f2f3e5; }
.act-emoji-btn:hover:not(.selected) { border-color: rgba(242,243,229,0.25); }
/* A number on the same circle (1–5 / 1–10 scales from the about_you catalogue). */
.act-emoji-btn.act-number { font-family: var(--font-student-display); font-size: 28px; color: #f2f3e5; }

/* ── Option pills (all-about-you catalogue questions with labelled options) ─
   Same fill and selected ring as the emoji circles, so a labelled answer reads
   as the same control; pills wrap across the 440px column. */
.act-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.act-chip {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px; padding: 8px 16px; box-sizing: border-box;
  border-radius: 99px; background: #2f2f37; border: 3px solid #2f2f37;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #f2f3e5; line-height: 1.15; text-align: left; cursor: pointer;
  transition: border 120ms;
}
.act-chip .act-chip-emoji { font-size: 20px; line-height: 1; }
.act-chip.selected { border-color: #f2f3e5; }
.act-chip:hover:not(.selected) { border-color: rgba(242,243,229,0.25); }
`
