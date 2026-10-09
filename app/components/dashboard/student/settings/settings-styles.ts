/**
 * Scoped CSS for the settings page — ONLY the pseudo-class / pseudo-element /
 * state rules the prototype expressed in its stylesheet (`settings.html:29-164`)
 * that inline React styles can't. All geometry stays inline in `SettingsPage`.
 * Class names are namespaced `st-*` to avoid collisions with other stages.
 */
export const SETTINGS_CSS = `
/* Back button hover (settings.html:36) */
.st-back-btn:hover { background: rgba(255,255,255,0.22); }

/* Avatar option ring + hover + selected (settings.html:88-96) */
.st-avatar-opt::after {
  content: ''; position: absolute; inset: 0; border-radius: 99px;
  border: 10px solid #444450; pointer-events: none; transition: border-color 160ms;
}
.st-avatar-opt:hover { transform: scale(1.06); }
.st-avatar-opt.selected::after { border-color: #f2f3e5; }

/* Toggle knob + off position (settings.html:129-136) */
.st-toggle::after {
  content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%;
  background: #fff; top: 2px; right: 2px; transition: right 160ms, left 160ms;
}
.st-toggle.off::after { right: auto; left: 2px; }

/* Save button active + disabled (settings.html:163-164) */
.st-save-btn:active { opacity: 0.85; }
.st-save-btn:disabled { background: #2b2b35; color: rgba(242,243,229,0.3); cursor: default; }

/* Log-out button (credential sessions only — no prototype counterpart).
   Deliberately quieter than Save: the ghost fill of an inactive tab, lifting to
   full cream text on hover so it reads as reachable but never as the primary
   action on the page. */
.st-logout-btn:hover { background: #36363f; color: #f2f3e5; }
.st-logout-btn:active { opacity: 0.85; }
`
