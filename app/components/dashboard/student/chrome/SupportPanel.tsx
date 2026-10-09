import { useState } from "react";
import { useNavigate } from "react-router";

import { studentAsset } from "~/assets/student-app";

import { useStudentNavBase } from "../nav/useStudentNavBase";

/**
 * The always-available support drawer, copy-pasted across 7 hub pages (research
 * §D "duplicated JS"; `today.html:334-401,657-697,1251-1261`). A right-edge
 * "Talk" tab opens a 380px panel that slides in from the right over a dimming
 * backdrop; the slide uses the prototype's signature 1200ms anticipation curve
 * (`transform 1200ms cubic-bezier(0.73,-0.01,0.2,0.98)` == the
 * `--ease-student-anticipate` token, `today.html:355`). "Write it out." routes
 * to `/student/support/write` (via {@link useStudentNavBase} so both mounts
 * work).
 *
 * State can be internal (default) or controlled via `open`/`onOpenChange`.
 *
 * Deviation note: the prototype's opener-tab CSS resolves to an off-canvas
 * `left:-64px`; here the always-visible opener is placed on the stage's right
 * edge (its evident visual intent — a left-protruding tab feeding the
 * right-side panel). Exact placement is reconciled against the live Today hub
 * in Phase 6.
 *
 * There is a single tab, not one per state: it sits near the bottom of the right
 * edge ({@link TAB_TOP}) and slides left by the panel width on open, sharing the
 * panel's duration and easing. Rendering a second tab inside the panel — the
 * earlier arrangement — read as a duplicate button, because the panel's own tab
 * resolved to mid-height and so the control appeared to jump on open.
 */

const ANTICIPATE = "cubic-bezier(0.73, -0.01, 0.2, 0.98)";

/** Panel width — also the distance the tab travels when the drawer opens. */
const PANEL_W = 380;

/**
 * Vertical centre of the Talk tab, as a share of the stage height. Near the
 * bottom rather than mid-height so it clears the hub content.
 */
const TAB_TOP = "90%";

export interface SupportPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function TalkTab({
  onClick,
  expanded,
  label = "Talk",
}: {
  onClick: () => void;
  expanded: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      style={{
        position: "absolute",
        left: -64,
        top: TAB_TOP,
        transform: "translateY(-50%)",
        width: 64,
        height: 72,
        background: "#1f1f25",
        border: "1px solid #36363f",
        borderRight: "none",
        borderRadius: "14px 0 0 14px",
        padding: 0,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <img
        src={studentAsset("chat.svg")}
        width={28}
        height={28}
        style={{ display: "block", pointerEvents: "none" }}
        alt=""
      />
      <span
        style={{
          fontFamily: "var(--font-student-body)",
          fontSize: 11,
          fontWeight: 500,
          color: "#a4a59f",
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </button>
  );
}

export function SupportPanel({ open: openProp, onOpenChange }: SupportPanelProps) {
  const base = useStudentNavBase();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      {/*
        The one and only Talk tab: it rests against the stage's right edge and
        rides the panel in and out on the same duration/easing, so the button you
        press to open is the button you press to close. Above the panel + backdrop
        so it stays clickable once the drawer is in.
      */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 36,
          transform: open ? `translateX(-${PANEL_W}px)` : "translateX(0)",
          transition: `transform 1200ms ${ANTICIPATE}`,
        }}
      >
        <TalkTab expanded={open} onClick={() => setOpen(!open)} />
      </div>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 34,
          background: "rgba(0,0,0,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
          transition: "opacity 500ms ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: PANEL_W,
          zIndex: 35,
          background: "#2b2b32",
          borderLeft: "1px solid #36363f",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform 1200ms ${ANTICIPATE}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "52px 24px 20px",
            borderBottom: "1px solid #36363f",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-student-display)",
              fontWeight: 400,
              fontSize: 24,
              lineHeight: 1.1,
              letterSpacing: "0.5px",
              color: "#f2f3e5",
              margin: 0,
            }}
          >
            Need to talk?
          </h2>
          <p
            style={{
              fontFamily: "var(--font-student-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "#737472",
              margin: "6px 0 0",
              lineHeight: 1.4,
            }}
          >
            When things are tough, you are not alone.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "8px 0", flex: 1 }}>
          <SupportItem
            title="Talk to someone."
            sub="A trusted adult at your school is here to help."
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="7" r="3.5" stroke="#f2f3e5" strokeWidth="1.5" />
                <path
                  d="M4 19c0-3.87 3.13-7 7-7h0c3.87 0 7 3.13 7 7"
                  stroke="#f2f3e5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <div style={{ height: 1, background: "#36363f", margin: "4px 0" }} />
          <SupportItem
            title="Write it out."
            sub="We'll make sure someone sees it."
            onClick={() => navigate(`${base}/support/write`)}
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                  stroke="#f2f3e5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <div style={{ height: 1, background: "#36363f", margin: "4px 0" }} />
          <p
            style={{
              fontFamily: "var(--font-student-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "#a4a59f",
              margin: 0,
              padding: "16px 24px",
              lineHeight: 1.5,
            }}
          >
            Need to talk to someone right away? <strong style={{ color: "#f2f3e5" }}>Call 988.</strong>
          </p>
        </div>
      </div>
    </>
  );
}

function SupportItem({
  title,
  sub,
  icon,
  onClick,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 24px",
        cursor: onClick ? "pointer" : "default",
        transition: "background 120ms",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          flexShrink: 0,
          background: "#36363f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontFamily: "var(--font-student-body)",
            fontSize: 16,
            fontWeight: 500,
            color: "#f2f3e5",
            margin: "0 0 3px",
            letterSpacing: "-0.1px",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: "var(--font-student-body)",
            fontSize: 13,
            fontWeight: 500,
            color: "#737472",
            margin: 0,
          }}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}
