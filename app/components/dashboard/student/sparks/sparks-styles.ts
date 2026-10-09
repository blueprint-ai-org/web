/**
 * Scoped CSS for the sparks shop — the exit/re-enter choreography, the
 * clip-path unlock overlay, and the confirm/success panel transitions, ported
 * 1:1 from `sparks.html`'s `<style>` block (`:81-347`).
 *
 * Class names are namespaced `spk-*` so they cannot collide with anything in
 * `app.css` or a sibling page's scoped block. The exit transitions are baked
 * into the `.exit` selectors (as in the prototype), and the overlay's confirm →
 * success crossfade is driven by an `is-success` class on the overlay plus an
 * `in` class on the three confirm elements — {@link SparksShop} toggles those
 * via refs, matching the prototype's `classList` toggles exactly.
 *
 * The sidebar is the ONE element animated imperatively rather than via `.exit`:
 * the shared {@link Sidebar} sets its `translateY(-50%)` transform inline, and an
 * inline style always beats a CSS class — so a `.exit` rule could never override
 * it (cf. the journal port's `querySelector('nav')` technique).
 */

const BEZ = 'cubic-bezier(0.75,0,0.3,0.99)' // exit/enter medium (sparks.html:88)
const BEZ2 = 'cubic-bezier(0.73,-0.01,0.2,0.98)' // overlay medium (sparks.html:238)
const EXIT_T = `transform 800ms ${BEZ}, opacity 600ms ease`

export const SPARKS_CSS = `
/* ── Exit animations (sparks.html:82-123) ─────────────────────────────────── */
.spk-cloud { transition: transform 800ms ${BEZ}, opacity 600ms ease; }
.spk-cloud.exit { transform: scale(3); }

.spk-header-left.exit { transform: translateY(-200px); opacity: 0; transition: ${EXIT_T}; }
.spk-total-box.exit { transform: translateY(-200px); opacity: 0; transition: ${EXIT_T}; }
.spk-grid.exit { transform: translateY(400px); opacity: 0; transition: ${EXIT_T}; }
.spk-collection-btn.exit { transform: translateX(-50%) translateY(200px); opacity: 0; transition: ${EXIT_T}; }
.spk-lightning.exit { opacity: 0; transition: opacity 600ms ease; }

/* ── Art cards (sparks.html:178-231) ──────────────────────────────────────── */
.spk-art-card { transition: none; }

/* ── View-collection button (sparks.html:304-315) ─────────────────────────── */
.spk-collection-btn {
  position: absolute; bottom: 36px; left: 651px; transform: translateX(-50%);
  height: 48px; padding: 0 28px; white-space: nowrap; z-index: 5;
  background: transparent; color: #f5f5f5;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  border-radius: 8px; border: 1px solid rgba(255,255,255,0.16);
  cursor: pointer; letter-spacing: -0.1px;
  box-shadow: 0px 1px 1px 0px rgba(20,21,26,0.03);
  transition: background 140ms;
}
.spk-collection-btn:hover { background: rgba(255,255,255,0.06); }

/* ── Unlock overlay (sparks.html:233-347) ─────────────────────────────────── */
.spk-unlock-overlay {
  position: absolute; inset: 0; z-index: 20;
  overflow: hidden; display: none;
  background: #3f50b8;
  transition: background-color 800ms ${BEZ2};
}
.spk-unlock-overlay.is-success { background: #4CAF82; }

.spk-overlay-lightning {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%,-50%) rotate(0deg);
  width: 3730px; height: 6598px;
  pointer-events: none; z-index: 0;
  transition: transform 800ms ${BEZ2};
}
.spk-unlock-overlay.is-success .spk-overlay-lightning {
  transform: translate(-50%,-50%) rotate(-30deg);
}

.spk-oc-confirm {
  position: absolute; inset: 0; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;
  transition: transform 800ms ${BEZ2}, opacity 600ms ease;
}
.spk-unlock-overlay.is-success .spk-oc-confirm { transform: translateY(600px); opacity: 0; }

.spk-oc-success {
  position: absolute; inset: 0; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;
  transform: translateY(-600px); opacity: 0;
  transition: transform 800ms ${BEZ2}, opacity 600ms ease;
}
.spk-unlock-overlay.is-success .spk-oc-success { transform: translateY(0); opacity: 1; }

.spk-confirm-badge {
  display: flex; align-items: center; gap: 8px;
  background: #2f2f37; border-radius: 99px; padding: 8px 16px;
  transform: translateY(-80px); opacity: 0;
}
.spk-confirm-badge.in {
  transform: translateY(0); opacity: 1;
  transition: transform 1000ms ${BEZ2}, opacity 800ms ease;
}

.spk-confirm-question {
  font-family: var(--font-student-display); font-weight: 400; font-size: 52px; line-height: 1.1;
  color: #f2f3e5; text-align: center; margin: 0;
  width: 685px; letter-spacing: 0.5px;
  transform: translateY(-80px); opacity: 0;
}
.spk-confirm-question.in {
  transform: translateY(0); opacity: 1;
  transition: transform 1000ms ${BEZ2} 60ms, opacity 800ms ease 60ms;
}

.spk-confirm-btn {
  position: absolute; bottom: 45px; left: 50%;
  transform: translateX(-50%) translateY(80px); opacity: 0;
  width: 270px; height: 48px;
  background: #f2f3e5; border: none; border-radius: 8px;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500; color: #1f1f25;
  cursor: pointer;
}
.spk-confirm-btn.in {
  transform: translateX(-50%) translateY(0); opacity: 1;
  transition: transform 1000ms ${BEZ2} 120ms, opacity 800ms ease 120ms;
}

.spk-overlay-back {
  position: absolute; top: 32px; left: 32px; z-index: 10;
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(255,255,255,0.1); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 140ms;
}
.spk-overlay-back:hover { background: rgba(255,255,255,0.18); }
.spk-unlock-overlay.is-success .spk-overlay-back { display: none; }

.spk-success-art { width: 237px; height: 241px; border-radius: 16px; display: block; }
.spk-success-label {
  font-family: var(--font-student-display); font-weight: 400; font-size: 72px; line-height: 1.1;
  color: #f2f3e5; margin: 0; letter-spacing: 1px;
}

/* ── Re-entry from the collectible (sparks.html:931-962, ?back=1) ──────────────
 * The prototype rebuilds the exact exit states then animates back over 900ms.
 * Here it's expressed declaratively: one-shot keyframes with fill-mode
 * "backwards" so the exit state paints before the first frame (no FOUC) and the
 * element reverts to its natural base afterwards — leaving later .exit toggles
 * unaffected (a "forwards" fill would keep overriding them). The sidebar is
 * reached via the descendant nav selector so the shared component needs no
 * change. */
@keyframes spk-back-sidebar { from { transform: translateY(-50%) translateX(-300px); opacity: 0; } to { transform: translateY(-50%); opacity: 1; } }
@keyframes spk-back-up200 { from { transform: translateY(-200px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes spk-back-grid { from { transform: translateY(400px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes spk-back-btn { from { transform: translateX(-50%) translateY(200px); opacity: 0; } to { transform: translateX(-50%); opacity: 1; } }
@keyframes spk-back-cloud { from { transform: scale(3); } to { transform: none; } }
@keyframes spk-back-fade { from { opacity: 0; } to { opacity: 1; } }

.spk-inner.from-collectible nav { animation: spk-back-sidebar 900ms ${BEZ} backwards; }
.spk-inner.from-collectible .spk-header-left { animation: spk-back-up200 900ms ${BEZ} backwards; }
.spk-inner.from-collectible .spk-total-box { animation: spk-back-up200 900ms ${BEZ} backwards; }
.spk-inner.from-collectible .spk-grid { animation: spk-back-grid 900ms ${BEZ} backwards; }
.spk-inner.from-collectible .spk-collection-btn { animation: spk-back-btn 900ms ${BEZ} backwards; }
.spk-inner.from-collectible .spk-cloud { animation: spk-back-cloud 900ms ${BEZ} backwards; }
.spk-inner.from-collectible .spk-lightning { animation: spk-back-fade 900ms ${BEZ} backwards; }
`
