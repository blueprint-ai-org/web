/**
 * `StagePlaceholder` — the Phase 3 route-scaffold placeholder.
 *
 * Every migrated student page is registered as a route in this phase but its
 * real screen lands in a later phase (see `docs/student-routes.md` for the
 * phase-by-phase fill schedule). Until then each route renders this placeholder
 * inside a {@link StudentStage} so the full URL contract is walkable and QA can
 * assert a 200 + labelled render on every `/preview/student/*` URL.
 *
 * Two flavours, matching the route table's "Stage/full-bleed" column:
 *  - **stage pages** (`chrome`): the six sidebar-bearing hub destinations —
 *    render the in-canvas {@link Sidebar} so the placeholder is navigable to its
 *    siblings;
 *  - **full-bleed pages**: bare stage, no sidebar (modal-like flows).
 */

import { Sidebar } from "./chrome/Sidebar";
import { StudentStage } from "./stage/StudentStage";

export type StagePlaceholderProps = {
  /** Human page name, e.g. `"Today (hub)"`. */
  page: string;
  /** Canonical LTI route path, e.g. `"/student"`. */
  route: string;
  /** Prototype source file this route ports, e.g. `"today.html"`. */
  source: string;
  /** Render the in-canvas Sidebar (sidebar-bearing "stage" pages). */
  chrome?: boolean;
  /** Short scaffold note, e.g. which phase fills the screen in. */
  note?: string;
};

export function StagePlaceholder({
  page,
  route,
  source,
  chrome = false,
  note,
}: StagePlaceholderProps) {
  return (
    <StudentStage>
      {chrome ? <Sidebar /> : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingLeft: chrome ? 152 : 32,
          paddingRight: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          textAlign: "center",
          fontFamily: "var(--font-student-body)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#8e8b85",
          }}
        >
          Phase 3 scaffold
        </span>
        <h1
          className="font-student-display text-student-surface-cream"
          style={{ fontSize: 44, margin: 0, lineHeight: 1.06, textTransform: "uppercase" }}
        >
          {page}
        </h1>
        <code
          style={{
            fontSize: 14,
            color: "#d1cbb8",
            background: "#2f2f37",
            padding: "4px 10px",
            borderRadius: 8,
          }}
        >
          {route}
        </code>
        <p style={{ margin: 0, fontSize: 13, color: "#8e8b85" }}>
          ports <strong style={{ color: "#a4a59f" }}>{source}</strong>
        </p>
        {note ? (
          <p style={{ margin: 0, fontSize: 12, color: "#8e8b85", maxWidth: 520 }}>{note}</p>
        ) : null}
      </div>
    </StudentStage>
  );
}
