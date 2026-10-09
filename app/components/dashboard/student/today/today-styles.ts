/**
 * Class-based CSS for the Today hub — only what inline styles can't express:
 * `:hover` card states (`today:177-184`), the eye-overlay hide-on-done rule
 * (`today:192`), and the spark-badge crossfade keyframes (`today:95-98`).
 * Layout/positioning is done with inline styles on the elements (the codebase's
 * prototype-port convention). Namespaced `th-`. Rendered once via a `<style>`.
 */

export const TODAY_CSS = `
.th-card { position: relative; width: 237px; height: 353px; border-radius: 19px; overflow: hidden; flex-shrink: 0; transition: transform 140ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease; }
.th-card-img { width: 100%; height: 100%; display: block; object-fit: fill; border-radius: 19px; }
.th-card.sleepy { cursor: pointer; opacity: 0.45; }
.th-card.sleepy:hover { transform: scale(1.025); opacity: 1; }
.th-card.hero { opacity: 1; }
.th-card.hero:hover { transform: scale(1.025); opacity: 1; }
.th-card.done { cursor: pointer; }
.th-card.done:hover { transform: scale(1.025); }
.th-eye-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; }
.th-card.done .th-eye-overlay { display: none; }

.th-summary-btn { transition: background 140ms ease, opacity 120ms; }
.th-summary-btn:hover { background: rgba(255,255,255,0.06); }
.th-summary-btn:active { opacity: 0.75; }

.th-ov-back:active, .th-ov-edit:active { opacity: 0.7; }
.th-ov-back { transition: opacity 120ms; }

.th-spark-badge { position: relative; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.th-spark-badge img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.th-spark-badge img:nth-child(1) { animation: th-spark-c1 6400ms linear 1600ms infinite; }
.th-spark-badge img:nth-child(2) { opacity: 0; animation: th-spark-c2 6400ms linear 1600ms infinite; }
.th-spark-badge img:nth-child(3) { opacity: 0; animation: th-spark-c3 6400ms linear 1600ms infinite; }
.th-spark-badge img:nth-child(4) { opacity: 0; animation: th-spark-c4 6400ms linear 1600ms infinite; }
@keyframes th-spark-c1 { 0% { opacity: 1; } 25% { opacity: 0; } 75% { opacity: 0; } 100% { opacity: 1; } }
@keyframes th-spark-c2 { 0% { opacity: 0; } 25% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 0; } }
@keyframes th-spark-c3 { 0% { opacity: 0; } 50% { opacity: 1; } 75% { opacity: 0; } 100% { opacity: 0; } }
@keyframes th-spark-c4 { 0% { opacity: 0; } 75% { opacity: 1; } 100% { opacity: 0; } }
`
