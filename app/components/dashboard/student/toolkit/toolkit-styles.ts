/**
 * Scoped CSS for the toolkit cluster — only the bits inline styles cannot
 * express: hidden scrollbars, `:hover`/`:active`/`:disabled` affordances, and
 * the video scrubber's `::-webkit-slider-*` pseudo-elements + `--pct` track
 * gradient (`toolkit-video.html:244-255`). Layout/geometry stays inline on the
 * elements (the today-hub / journal convention).
 */

export const TOOLKIT_HOME_CSS = `
/* Hidden scrollbars (my-toolkit.html:79; category-inspired) */
.tk-scroll { scrollbar-width: none; }
.tk-scroll::-webkit-scrollbar { width: 0; display: none; }

/* Filter pills (my-toolkit.html:97-106) */
.tk-filter-pill { transition: background 120ms, color 120ms; cursor: pointer; }
.tk-filter-pill:not(.active):hover { color: #f2f3e5; }

/* Tiles + hearts (my-toolkit.html:143-153, 190-193, 240) */
.tk-tile { cursor: pointer; }
.tk-featured { transition: transform 140ms cubic-bezier(0.34,1.56,0.64,1); }
.tk-featured:hover { transform: scale(1.01); }
.tk-category { transition: transform 140ms cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; }
.tk-category:hover { transform: scale(1.04); }
.tk-heart { transition: transform 120ms; cursor: pointer; }
.tk-heart:active { transform: scale(0.9); }

/* Explore controls (my-toolkit.html:241-262) */
.tk-explore { transition: opacity 120ms; cursor: pointer; }
.tk-explore:active { opacity: 0.7; }
.tk-explore-back { transition: opacity 120ms; cursor: pointer; }
.tk-explore-back:active { opacity: 0.7; }
`

export const CATEGORY_CSS = `
.cat-scroll { scrollbar-width: none; }
.cat-scroll::-webkit-scrollbar { display: none; }
.cat-back { transition: background 140ms; cursor: pointer; }
.cat-back:hover { background: rgba(255,255,255,0.22); }
.cat-tile { transition: transform 140ms cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; }
.cat-tile:hover { transform: scale(1.015); }
.cat-heart { transition: transform 120ms; cursor: pointer; }
.cat-heart:hover { transform: scale(1.1); }
`

export const VIDEO_CSS = `
/* Play button (toolkit-video.html:36-45) */
.vf-play { transition: transform 120ms, opacity 120ms; cursor: pointer; }
.vf-play:hover { transform: translate(-50%, -50%) scale(1.08); }
.vf-play:active { opacity: 0.8; }

/* Feedback choice blocks (toolkit-video.html:111-132) */
.fb-block { transition: background 140ms, border-color 140ms; cursor: pointer; }
.fb-block:hover { background: #3a3a44; }
.fb-block.selected { background: #444454; border-color: rgba(242,243,229,0.4); }

/* Primary buttons (toolkit-video.html:147-148, 179) */
.fb-btn { transition: opacity 120ms; cursor: pointer; }
.fb-btn:active { opacity: 0.8; }
.fb-btn:disabled { opacity: 0.4; cursor: default; }
.why-skip { transition: opacity 120ms; cursor: pointer; }
.why-skip:active { opacity: 0.7; }
.why-continue { transition: opacity 120ms; cursor: pointer; }
.why-continue:active { opacity: 0.8; }
.why-textarea::placeholder { color: #6b6b76; }

/* Video scrubber (toolkit-video.html:244-255) */
.vf-progress-wrap { opacity: 0; transition: opacity 200ms; }
.vf-overlay:hover .vf-progress-wrap { opacity: 1; }
.vf-progress { -webkit-appearance: none; appearance: none; background: transparent; outline: none; cursor: pointer; }
.vf-progress::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; cursor: pointer; margin-top: -5px;
}
.vf-progress::-webkit-slider-runnable-track {
  background: linear-gradient(to right, #fff var(--pct, 0%), rgba(255,255,255,0.25) var(--pct, 0%));
  border-radius: 2px; height: 4px;
}
.vf-progress::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%; background: #fff; border: none; cursor: pointer;
}
.vf-progress::-moz-range-track { background: rgba(255,255,255,0.25); border-radius: 2px; height: 4px; }
`
