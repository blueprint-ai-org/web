/**
 * Class-based CSS for the mood check-in flow, ported verbatim from
 * `mood-checkin.html`'s `<style>` block and namespaced `mc-` to avoid
 * collisions. Rendered once by {@link MoodCheckin} via a `<style>` element —
 * the same component-scoped-stylesheet pattern the onboarding `CompleteScreen`
 * uses for its spark-badge keyframes.
 *
 * Only the bits that inline styles cannot express live here: `@keyframes`
 * (picker enter, shake, spark crossfade), `:hover`/`:active`/`::placeholder`
 * pseudo-classes, descendant-selector transitions (`.mc-done.done-entered
 * .mc-done-center`, `.mc-sleep.s-sleep-exiting …`), and the `.maxed`/`.sel`
 * state rules. Per-instance geometry (emotion shape size, deco slots) stays as
 * inline styles on the elements.
 */

export const MOOD_CSS = `
/* ── Screen base + transition scaffold (mood-checkin.html:22-28) ───────── */
.mc-screen { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 260ms cubic-bezier(0.4,0,0.2,1); overflow: hidden; }
.mc-screen.active { opacity: 1; pointer-events: all; }
.mc-done { transition: none; }

/* ── Progress bar (:40-49) ────────────────────────────────────────────── */
.mc-prog { position: absolute; top: 36px; left: 219px; width: 756px; height: 4px; background: #444450; border-radius: 99px; overflow: hidden; z-index: 50; pointer-events: none; }
.mc-prog-fill { height: 100%; background: #f2f3e5; border-radius: 99px; transition: width 600ms cubic-bezier(0.22,1,0.36,1); }

/* ── S0 emotion picker (:57-144) ──────────────────────────────────────── */
.mc-wrap { position: absolute; top: 76px; left: 50%; transform: translateX(-50%); width: 770px; text-align: center; animation: mc-enter-grid 800ms cubic-bezier(0.75,0,0.3,0.99) both; }
.mc-title { font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 106%; letter-spacing: 0; color: #f2f3e5; margin: 0 0 10px; }
.mc-sub { font-family: var(--font-student-body); font-size: 16px; font-weight: 700; color: #a4a59f; margin: 0 0 61px; }
.mc-grid { display: grid; grid-template-columns: repeat(5, 120px); gap: 20px; width: 680px; margin: 0 auto; }
.mc-em-btn { position: relative; border: none; background: none; padding: 0; cursor: pointer; width: 120px; height: 120px; }
.mc-em-btn img { width: 100%; height: 100%; display: block; object-fit: contain; transition: filter 180ms; }
.mc-em-btn span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-student-display); font-weight: 400; font-size: 20px; letter-spacing: 0; line-height: 1.05; text-transform: uppercase; color: #1f1f25; text-align: center; padding: 0 8px; pointer-events: none; }
.mc-em-check { position: absolute; top: 11px; right: 11px; width: 36px; height: 36px; display: none; place-items: center; z-index: 5; pointer-events: none; }
.mc-em-check img { width: 100%; height: 100%; display: block; }
.mc-em-btn.sel .mc-em-check { display: grid; }
.mc-grid.maxed .mc-em-btn:not(.sel) { pointer-events: none; cursor: default; }
.mc-grid.maxed .mc-em-btn:not(.sel) img { filter: brightness(0.35) saturate(0.4); }
.mc-cta { position: absolute; bottom: 56px; left: 50%; transform: translateX(-50%); z-index: 20; animation: mc-enter 800ms cubic-bezier(0.75,0,0.3,0.99) 100ms both; }
.mc-btn-continue { width: 270px; height: 48px; background: #f2f3e5; color: #1f1f25; font-family: var(--font-student-body); font-size: 16px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: opacity 120ms; }
.mc-btn-continue:active { opacity: 0.85; }
@keyframes mc-enter { from { transform: translateX(-50%) translateY(300px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
@keyframes mc-enter-grid { from { opacity: 0; transform: translateX(-50%) translateY(300px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes mc-em-shake { 0%,100% { transform: translateY(0); } 15% { transform: translateY(-8px); } 30% { transform: translateY(6px); } 45% { transform: translateY(-5px); } 60% { transform: translateY(4px); } 75% { transform: translateY(-2px); } }
.mc-grid.shake { animation: mc-em-shake 480ms cubic-bezier(0.36,0.07,0.19,0.97) both; }

/* ── Detail screen (:150-256) ─────────────────────────────────────────── */
.mc-ed-shape { position: absolute; pointer-events: none; z-index: 0; }
.mc-ed-shape img { width: 100%; height: 100%; display: block; }
.mc-ed-title { position: absolute; top: 104px; left: 0; right: 0; font-family: var(--font-student-display); font-weight: 400; font-size: 80px; line-height: 106%; letter-spacing: 0; color: #f2f3e5; text-align: center; margin: 0; z-index: 5; }
.mc-ed-slider-wrap { position: absolute; top: 304px; left: 50%; transform: translateX(-50%); z-index: 5; }
.mc-ed-chips-section { position: absolute; top: 568px; left: 50%; transform: translateX(-50%); text-align: center; z-index: 5; width: 700px; display: none; }

/* ── Nav row (detail / why / sleep) (:238-256) ────────────────────────── */
.mc-ed-nav { position: absolute; bottom: 56px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; z-index: 20; }
.mc-btn-back { width: 48px; height: 48px; border-radius: 8px; background: rgba(255,255,255,0.12); border: none; cursor: pointer; display: grid; place-items: center; transition: opacity 120ms; }
.mc-btn-back:active { opacity: 0.75; }
.mc-btn-next { width: 200px; height: 48px; background: #f2f3e5; color: #1f1f25; font-family: var(--font-student-body); font-size: 16px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: opacity 120ms; }
.mc-btn-next:active { opacity: 0.85; }

/* ── Why screen (:262-349) ────────────────────────────────────────────── */
.mc-why-deco { position: absolute; pointer-events: none; z-index: 0; }
.mc-why-deco img { width: 100%; height: 100%; display: block; object-fit: contain; }
.mc-why-title { position: absolute; top: 116px; left: 0; right: 0; padding: 0 200px; font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 106%; letter-spacing: 1px; color: #f2f3e5; text-align: center; margin: 0; z-index: 5; }
.mc-why-grid { position: absolute; top: 248px; left: 50%; transform: translateX(-50%); width: 764px; z-index: 5; display: grid; grid-template-columns: repeat(4, 179px); gap: 16px; }
.mc-why-block { background: #2f2f37; border: 1px solid rgba(92,92,101,0.3); border-radius: 8px; height: 94px; width: 179px; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background 160ms, border-color 160ms; }
.mc-why-block:hover { background: #3a3a44; }
.mc-why-block.sel { background: #3a3a44; border: 3px solid #f2f3e5; }
.mc-why-icon { width: 40px; height: 40px; flex-shrink: 0; background: #2b2b32; border: 1px solid rgba(92,92,101,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.mc-why-emoji { font-size: 18px; line-height: 1; }
.mc-why-label { font-family: var(--font-student-body); font-size: 14px; font-weight: 600; color: #f2f3e5; text-align: center; line-height: 1.3; }
.mc-why-block--add .mc-why-label { color: #a4a59f; }
.mc-why-block--input { grid-column: span 2; width: auto; flex-direction: row; gap: 10px; padding: 0 12px; cursor: default; }
.mc-why-block--input:hover { background: #2f2f37; }
.mc-why-input-field { flex: 1; background: none; border: none; outline: none; color: #f2f3e5; font-family: var(--font-student-body); font-size: 14px; font-weight: 600; min-width: 0; }
.mc-why-input-field::placeholder { color: #a4a59f; }
.mc-why-confirm-btn { width: 36px; height: 36px; background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 120ms; }
.mc-why-confirm-btn:active { opacity: 0.75; }
.mc-why-picker-overlay { position: absolute; inset: 0; z-index: 150; }
.mc-why-emoji-picker { position: absolute; background: #2b2b32; border: 1px solid #444450; border-radius: 12px; width: 282px; z-index: 200; box-shadow: 0 8px 32px rgba(0,0,0,0.7); overflow: hidden; }
.mc-why-picker-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 8px; max-height: 228px; overflow-y: auto; }
.mc-why-picker-grid button { background: none; border: none; font-size: 24px; line-height: 1; padding: 5px 2px; border-radius: 6px; cursor: pointer; transition: background 80ms; text-align: center; }
.mc-why-picker-grid button:hover { background: #3a3a44; }

/* ── Sleep screen (:534-576) ──────────────────────────────────────────── */
.mc-sleep-sub { position: absolute; top: 76px; left: 0; right: 0; font-family: var(--font-student-body); font-size: 15px; font-weight: 500; color: #a4a59f; text-align: center; z-index: 5; }
.mc-sleep-title { position: absolute; top: 116px; left: 0; right: 0; font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 106%; letter-spacing: 1px; color: #f2f3e5; text-align: center; margin: 0; z-index: 5; }
.mc-sleep-slider-wrap { position: absolute; top: 308px; left: 50%; transform: translateX(-50%); z-index: 5; }
.mc-sleep.s-sleep-exiting .mc-sleep-sub, .mc-sleep.s-sleep-exiting .mc-sleep-title { transform: translateY(400px); opacity: 0; transition: transform 700ms cubic-bezier(0.75,0,0.3,0.99), opacity 400ms ease; }
.mc-sleep.s-sleep-exiting .mc-sleep-slider-wrap { transform: translateX(-50%) translateY(400px); opacity: 0; transition: transform 700ms cubic-bezier(0.75,0,0.3,0.99), opacity 400ms ease; }
.mc-sleep.s-sleep-exiting .mc-ed-nav { transform: translateX(-50%) translateY(400px); opacity: 0; transition: transform 700ms cubic-bezier(0.75,0,0.3,0.99) 60ms, opacity 400ms ease 60ms; }

/* ── Done screen (:553-654) ───────────────────────────────────────────── */
.mc-done-blob { position: absolute; pointer-events: none; z-index: 0; left: -33px; top: -390px; width: 1188px; height: 1599px; }
.mc-done-center { position: absolute; left: 50%; top: calc(50% - 17px); transform: translate(-50%, calc(-50% + 200px)); display: flex; flex-direction: column; align-items: center; gap: 36px; z-index: 5; opacity: 0; }
.mc-done-top-group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mc-reward-row { display: flex; align-items: center; justify-content: center; gap: 12px; }
.mc-reward-plus { font-family: var(--font-student-display); font-weight: 400; font-size: 32px; line-height: 40px; letter-spacing: -0.8px; color: #f2f3e5; }
.mc-spark-badge { position: relative; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; }
.mc-spark-badge img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.mc-spark-badge img:nth-child(1) { animation: mc-spark-c1 6400ms linear 1600ms infinite; }
.mc-spark-badge img:nth-child(2) { opacity: 0; animation: mc-spark-c2 6400ms linear 1600ms infinite; }
.mc-spark-badge img:nth-child(3) { opacity: 0; animation: mc-spark-c3 6400ms linear 1600ms infinite; }
.mc-spark-badge img:nth-child(4) { opacity: 0; animation: mc-spark-c4 6400ms linear 1600ms infinite; }
@keyframes mc-spark-c1 { 0% { opacity: 1; } 25% { opacity: 0; } 75% { opacity: 0; } 100% { opacity: 1; } }
@keyframes mc-spark-c2 { 0% { opacity: 0; } 25% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 0; } }
@keyframes mc-spark-c3 { 0% { opacity: 0; } 50% { opacity: 1; } 75% { opacity: 0; } 100% { opacity: 0; } }
@keyframes mc-spark-c4 { 0% { opacity: 0; } 75% { opacity: 1; } 100% { opacity: 0; } }
.mc-done-card { width: 200px; height: 298px; border-radius: 19px; overflow: hidden; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.5); flex-shrink: 0; }
.mc-done-title { font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 1.06; letter-spacing: 0; color: #f2f3e5; text-align: center; margin: 0; }
.mc-done-cta { position: absolute; top: 721px; left: 50%; transform: translateX(-50%); z-index: 20; opacity: 0; }
.mc-done.done-entered .mc-done-center { transform: translate(-50%, -50%); opacity: 1; transition: transform 700ms cubic-bezier(0.75,0,0.3,0.99) 200ms, opacity 400ms ease 200ms; }
.mc-done.done-entered .mc-done-cta { opacity: 1; transition: opacity 500ms ease 450ms; }
.mc-done.done-exiting .mc-done-center { transform: translate(-50%, calc(-50% - 300px)); opacity: 0; transition: transform 800ms cubic-bezier(0.75,0,0.3,0.99), opacity 500ms ease; }
.mc-done.done-exiting .mc-done-cta { opacity: 0; transition: opacity 300ms ease; }
`
