/**
 * Class-based CSS for the day summary (`summary.html`'s `<style>` block),
 * ported verbatim and namespaced `sum-` to avoid collisions (the prototype's
 * generic `.back-btn`/`.date-nav` are renamed `.sum-back`/`.sum-date-nav`).
 * `var(--font-body)`/`var(--font-display)` map to the student
 * tokens. Rendered once by {@link Summary} via a `<style>` element — the same
 * component-scoped-stylesheet pattern as the mood check-in flow (`MOOD_CSS`).
 *
 * The unused `.sum-collection-btn` from the prototype CSS is dropped (no element
 * in the prototype markup references it).
 */

export const SUMMARY_CSS = `
/* ── Back button (:28-36) ───────────────────────────────────────────────── */
.sum-back {
  position: absolute; left: 24px; top: 48px;
  width: 48px; height: 48px;
  background: #2b2b32; border: 1px solid #444450; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; z-index: 10; box-sizing: border-box;
  transition: opacity 120ms;
}
.sum-back:active { opacity: 0.7; }

/* ── Date navigator (:39-59) ────────────────────────────────────────────── */
.sum-date-nav {
  position: absolute; top: 52px; left: 50%; transform: translateX(-50%);
  width: 200px; height: 50px;
  background: #2b2b32; border: 1px solid #444450; border-radius: 100px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px; z-index: 10; box-sizing: border-box;
}
.sum-date-arrow {
  background: none; border: none;
  color: #a4a59f; font-size: 20px;
  cursor: pointer; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; flex-shrink: 0;
  transition: background 100ms; line-height: 1;
}
.sum-date-arrow:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
.sum-date-arrow:disabled { opacity: 0.22; cursor: default; }
.sum-date-label {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #f2f3e5; text-align: center; flex: 1;
}

/* ── Content area + grid (:62-72) ───────────────────────────────────────── */
.sum-content {
  position: absolute; top: 166px; left: 100px; width: 994px; bottom: 80px;
  overflow: hidden;
}
.sum-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 20px; height: 100%;
}

/* ── Cards (:87-107) ────────────────────────────────────────────────────── */
.sum-card {
  background: #2b2b32; border: 1px solid #444450; border-radius: 20px;
  padding: 36px; box-sizing: border-box; min-width: 0;
}
.sum-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 16px; border-bottom: 1px solid #444450;
  margin-bottom: 24px;
}
.sum-hdr-left { display: flex; align-items: center; gap: 12px; }
.sum-icon { width: 24px; height: 24px; display: block; flex-shrink: 0; }
.sum-section-title {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #f2f3e5; line-height: 20px;
}
.sum-edit {
  font-family: var(--font-student-body); font-size: 14px; font-weight: 500;
  color: #a4a59f; background: none; border: none; cursor: pointer; padding: 0;
}

/* ── Mood: emotion tiles (:110-124) ─────────────────────────────────────── */
.sum-emotions-row { display: flex; gap: 24px; align-items: center; }
.sum-emotion-tile {
  position: relative; width: 120px; height: 120px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.sum-emotion-tile img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: block; object-fit: contain;
}
.sum-emotion-label {
  position: relative; z-index: 1;
  font-family: var(--font-student-display); font-weight: 400; font-size: 16px;
  color: #1f1f25; text-align: center; line-height: 1.1;
  pointer-events: none;
}

/* ── Text sections (:127-146) ───────────────────────────────────────────── */
.sum-question {
  font-family: var(--font-student-body); font-size: 14px; font-weight: 500;
  color: #a4a59f; line-height: 1.45; margin: 0 0 16px;
}
.sum-answer {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #f2f3e5; line-height: 1.5; margin: 0;
}
.sum-text {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #f2f3e5; line-height: 1.5; margin: 0;
}
.sum-emoji-circle {
  width: 78px; height: 78px; border-radius: 50%;
  background: #36363f; border: 2px solid #444450;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px; margin-top: 8px;
}

/* ── Mood card interactivity (:149-151) ─────────────────────────────────── */
.sum-card.sum-mood-card { cursor: pointer; }
.sum-card.sum-mood-card:hover { border-color: #5a5a6a; }
.sum-card.sum-card-empty { opacity: 0.5; }

/* ── Mood overlay (:154-246) ────────────────────────────────────────────── */
.sum-mood-ov {
  position: absolute; inset: 0; background: #1f1f25; z-index: 50;
  opacity: 0; pointer-events: none;
  transition: opacity 220ms ease;
  display: flex; flex-direction: column;
}
.sum-mood-ov.open { opacity: 1; pointer-events: all; }
.sum-mood-ov-back {
  position: absolute; left: 24px; top: 48px;
  width: 48px; height: 48px;
  background: #2b2b32; border: 1px solid #444450; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; z-index: 6; box-sizing: border-box;
  transition: opacity 120ms;
}
.sum-mood-ov-back:active { opacity: 0.7; }
.sum-mood-ov-body {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 48px;
}
.sum-mood-ov-hdr { display: flex; align-items: center; gap: 12px; }
.sum-mood-ov-icon { width: 32px; height: 32px; display: block; }
.sum-mood-ov-title {
  font-family: var(--font-student-body); font-size: 20px; font-weight: 500;
  color: #f2f3e5;
}
.sum-mood-ov-date {
  font-family: var(--font-student-body); font-size: 14px; font-weight: 500;
  color: #a4a59f; margin-left: 8px;
}
.sum-mood-ov-emotions {
  display: flex; gap: 40px; align-items: center; justify-content: center;
}
.sum-mood-ov-tile {
  position: relative; width: 160px; height: 160px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.sum-mood-ov-tile img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: block; object-fit: contain;
}
.sum-mood-ov-label {
  position: relative; z-index: 1;
  font-family: var(--font-student-display); font-weight: 400; font-size: 20px;
  color: #1f1f25; text-align: center;
}
.sum-mood-ov-chips {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: 600px;
}
.sum-mood-ov-chip {
  font-family: var(--font-student-body); font-size: 13px; font-weight: 500;
  color: #f2f3e5; background: #2b2b32; border: 1px solid #444450;
  border-radius: 100px; padding: 8px 16px;
}
.sum-mood-ov-reasons {
  display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%;
}
.sum-mood-ov-reasons-label {
  font-family: var(--font-student-body); font-size: 13px; font-weight: 500;
  color: #a4a59f; text-transform: uppercase; letter-spacing: 0.8px;
}
.sum-mood-ov-reasons-row {
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
}
.sum-mood-ov-reason {
  display: flex; align-items: center; gap: 10px;
  background: #2b2b32; border: 2px solid #f2f3e5;
  border-radius: 12px; padding: 10px 18px;
  font-family: var(--font-student-body); font-size: 14px; font-weight: 500;
  color: #f2f3e5; pointer-events: none;
}
.sum-mood-ov-reason-emoji { font-size: 18px; line-height: 1; }
.sum-mood-ov-edit {
  height: 48px; padding: 0 32px; min-width: 220px;
  background: #f2f3e5; color: #1f1f25;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  border-radius: 8px; border: none; cursor: pointer; letter-spacing: -0.1px;
  transition: opacity 120ms;
}
.sum-mood-ov-edit:active { opacity: 0.8; }
`
