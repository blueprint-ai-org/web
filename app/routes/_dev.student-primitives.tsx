import { useEffect, useState } from "react";

import {
  AuthCta,
  AuthField,
  AuthFormError,
} from "~/components/dashboard/student/auth/AuthPrimitives";
import { ArcSlider, type ArcStop } from "~/components/dashboard/student/arc-slider/ArcSlider";
import { Sidebar } from "~/components/dashboard/student/chrome/Sidebar";
import { SupportPanel } from "~/components/dashboard/student/chrome/SupportPanel";
import { StudentStage } from "~/components/dashboard/student/stage/StudentStage";
import { EMOTIONS } from "~/lib/student/emotions";
import { studentStorage } from "~/lib/student/storage";

export function meta() {
  return [{ title: "Student primitives (dev smoke)" }];
}

// ── Demo slider configs (canonical versions land in Phases 4/5) ──────────────

const MOOD_STOPS: ArcStop[] = [
  { emoji: "😞", label: "Bad" },
  { emoji: "😕", label: "Ugh" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😄", label: "Great" },
];

const HAPPY = EMOTIONS.happy;
const HAPPY_STOPS: ArcStop[] = HAPPY.emojis.map((emoji, i) => ({
  emoji,
  label: HAPPY.levels[i],
}));

const SLEEP_STOPS: ArcStop[] = [
  { emoji: "😩", label: "Terrible" },
  { emoji: "😔", label: "Hard to fall asleep" },
  { emoji: "😕", label: "Not great" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😌", label: "Pretty good" },
  { emoji: "🙂", label: "Slept well" },
  { emoji: "😄", label: "Woke up feeling great" },
];

type Variant = "5-stop" | "3-stop" | "7-stop sleep";

/**
 * Which sheet is showing. The stage is a fixed 1194×834 artboard with
 * `overflow: hidden` — the slider + storage content already fills it, so the
 * auth primitives get their own sheet rather than being appended off the
 * bottom edge where no screenshot could reach them.
 */
type Sheet = "sliders" | "auth";

export default function StudentPrimitivesSmoke() {
  if (!import.meta.env.DEV) {
    return (
      <main style={{ padding: 32 }}>
        <p>Disabled in production.</p>
      </main>
    );
  }

  return <PrimitivesSheet />;
}

function PrimitivesSheet() {
  const [sheet, setSheet] = useState<Sheet>("sliders");
  const [variant, setVariant] = useState<Variant>("3-stop");
  const [committed, setCommitted] = useState<number>(0);
  const [live, setLive] = useState<{ index: number; normalized: number }>({
    index: 0,
    normalized: 0,
  });

  useEffect(() => {
    document.body.classList.add("student-dark");
    return () => document.body.classList.remove("student-dark");
  }, []);

  return (
    <StudentStage data-testid="student-primitives-stage">
      <Sidebar />
      <SupportPanel />

      <main
        style={{
          position: "absolute",
          left: 152,
          right: 24,
          top: 56,
          bottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          color: "#f2f3e5",
          fontFamily: "var(--font-student-body)",
        }}
      >
        <header>
          <h1
            style={{
              fontFamily: "var(--font-student-display)",
              fontSize: 40,
              margin: 0,
              lineHeight: 1.06,
            }}
          >
            Student primitives
          </h1>
          <p style={{ margin: "6px 0 0", color: "#8e8b85", fontSize: 14 }}>
            Stage · chrome · arc slider · storage adapter · auth primitives — dev smoke sheet.
          </p>
        </header>

        {/* Sheet switcher */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["sliders", "auth"] as Sheet[]).map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`sheet-${s}`}
              onClick={() => setSheet(s)}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "1px solid #36363f",
                cursor: "pointer",
                fontFamily: "var(--font-student-body)",
                fontSize: 13,
                fontWeight: 600,
                background: sheet === s ? "#f2f3e5" : "transparent",
                color: sheet === s ? "#1f1f25" : "#a4a59f",
              }}
            >
              {s === "sliders" ? "Sliders & storage" : "Auth primitives"}
            </button>
          ))}
        </div>

        {sheet === "auth" && <AuthPrimitivesSheet />}

        {sheet === "sliders" && (
          <>
        {/* Arc slider variant switcher */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["5-stop", "3-stop", "7-stop sleep"] as Variant[]).map((v) => (
            <button
              key={v}
              type="button"
              data-testid={`variant-${v}`}
              onClick={() => setVariant(v)}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-student-body)",
                fontSize: 13,
                fontWeight: 500,
                background: variant === v ? "#f08b31" : "#2f2f37",
                color: variant === v ? "#1f1f25" : "#f2f3e5",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          {variant === "5-stop" && (
            <ArcSlider
              key="5-stop"
              stops={MOOD_STOPS}
              gradient={[
                { offset: 0, color: "#945218" },
                { offset: 100, color: "#F08B31" },
              ]}
              defaultValue={2}
              thumbColor="#f08b31"
              trackStrokeWidth={80}
              fillStrokeWidth={56}
              thumbSize={116}
              thumbBorderWidth={11}
              thumbFontSize={60}
              dotHideMode="fill-aware"
              endCaps={{ trackRadius: 40, fillRadius: 28 }}
              pillBottom={40}
              pillMinWidth={174}
              pillHeight={58}
              ariaLabel="Baseline mood"
              onChange={setCommitted}
              onInput={(index, _angle, normalized) => setLive({ index, normalized })}
            />
          )}
          {variant === "3-stop" && (
            <ArcSlider
              key="3-stop"
              stops={HAPPY_STOPS}
              gradient={[
                { offset: 0, color: HAPPY.gradDark },
                { offset: 100, color: HAPPY.color },
              ]}
              defaultValue={1}
              thumbColor={HAPPY.color}
              ariaLabel="Happy intensity"
              onChange={setCommitted}
              onInput={(index, _angle, normalized) => setLive({ index, normalized })}
            />
          )}
          {variant === "7-stop sleep" && (
            <ArcSlider
              key="7-stop"
              stops={SLEEP_STOPS}
              gradient={[
                { offset: 0, color: "#2A315D" },
                { offset: 100, color: "#3F50B8" },
              ]}
              defaultValue={3}
              thumbColor="#3f50b8"
              dotRadius={6}
              ariaLabel="Sleep quality"
              onChange={setCommitted}
              onInput={(index, _angle, normalized) => setLive({ index, normalized })}
            />
          )}
        </div>

        <p style={{ margin: 0, fontSize: 13, color: "#8e8b85" }}>
          committed index: <strong style={{ color: "#f2f3e5" }}>{committed}</strong> · live index:{" "}
          <strong style={{ color: "#f2f3e5" }}>{live.index}</strong> · normalized:{" "}
          <strong style={{ color: "#f2f3e5" }}>{live.normalized.toFixed(2)}</strong>
        </p>

        <StorageRoundTrip />
          </>
        )}
      </main>
    </StudentStage>
  );
}

/**
 * Auth primitives in every state (Phase 5).
 *
 * The static columns cover idle / error / disabled / password+hint and the
 * banner. The **live** field and CTA at the bottom carry the two remaining
 * states — focus and pending — and exist for the accessibility assertions
 * specifically: they let `aria-invalid`, `aria-describedby` and the CTA's
 * `disabled` attribute be observed *flipping* on one persistent DOM node, which
 * is a stronger claim than two nodes that happen to differ.
 *
 * Everything must fit the stage's 834px artboard (`overflow: hidden`) — a state
 * pushed past the bottom edge is a state no screenshot can reach.
 */
function AuthPrimitivesSheet() {
  const [liveError, setLiveError] = useState(false);
  const [livePending, setLivePending] = useState(false);

  return (
    <section
      data-testid="auth-primitives"
      style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {/* ── AuthField states ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SheetLabel>AuthField</SheetLabel>
          <AuthField
            name="demo-idle"
            label="Email address"
            type="email"
            placeholder="you@school.edu"
            autoComplete="off"
          />
          <AuthField
            name="demo-error"
            label="Email address"
            type="email"
            defaultValue="sam@school"
            autoComplete="off"
            error="That doesn't look like an email address."
          />
          <AuthField
            name="demo-disabled"
            label="Password (disabled)"
            type="password"
            defaultValue="correct horse"
            autoComplete="off"
            disabled
          />
        </div>

        {/* ── Banner + password/hint ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SheetLabel>AuthFormError</SheetLabel>
          <AuthFormError message="That email and password don't match. Check them and try again." />
          <SheetLabel>AuthField · password + hint</SheetLabel>
          <AuthField
            name="demo-password"
            label="Password"
            type="password"
            defaultValue="correct horse"
            autoComplete="off"
            hint="Use at least 8 characters."
          />
        </div>
      </div>

      {/* ── AuthCta states + the live a11y rig ── */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 28, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SheetLabel>AuthCta · idle</SheetLabel>
          <AuthCta label="Log in" type="button" inline />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SheetLabel>AuthCta · pending</SheetLabel>
          <AuthCta label="Log in" type="button" pending inline />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SheetLabel>AuthCta · disabled</SheetLabel>
          <AuthCta label="Log in" type="button" disabled inline />
        </div>
      </div>

      <div
        data-testid="auth-live-rig"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 20,
          background: "#2f2f37",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ width: 340 }}>
          <AuthField
            id="auth-live-field"
            name="demo-live"
            label="Live field — click to focus, toggle to error"
            type="email"
            defaultValue="sam@school.edu"
            autoComplete="off"
            error={liveError ? "That doesn't look like an email address." : undefined}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 26 }}>
          <DevButton onClick={() => setLiveError((v) => !v)}>
            toggle error ({String(liveError)})
          </DevButton>
          <DevButton onClick={() => setLivePending((v) => !v)}>
            toggle pending ({String(livePending)})
          </DevButton>
        </div>
        <div style={{ paddingTop: 26 }}>
          <AuthCta label="Log in" type="button" pending={livePending} width={200} inline />
        </div>
      </div>
    </section>
  );
}

function SheetLabel({ children }: { children: React.ReactNode }) {
  return (
    <strong
      style={{
        fontFamily: "var(--font-student-body)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        color: "#8e8b85",
      }}
    >
      {children}
    </strong>
  );
}

/**
 * Exercises the storage adapter's two representative behaviours:
 *  - a one-shot flag (`bp_fresh_start`, consume = read+remove);
 *  - a JSON-array key (`bp_today_sections`, default `["mood"]`, append).
 * Values also console.log so the QA criterion can be verified from devtools.
 */
function StorageRoundTrip() {
  const [freshStart, setFreshStart] = useState<boolean | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const push = (line: string) => {
    // eslint-disable-next-line no-console
    console.log(`[student-primitives] ${line}`);
    setLog((l) => [line, ...l].slice(0, 6));
  };

  const refresh = () => {
    setFreshStart(studentStorage.getFreshStart());
    setSections(studentStorage.getTodaySections());
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section
      data-testid="storage-roundtrip"
      style={{
        marginTop: "auto",
        background: "#2f2f37",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <strong style={{ fontSize: 13 }}>Storage round-trip</strong>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <DevButton
          onClick={() => {
            studentStorage.setFreshStart(true);
            push("setFreshStart(true)");
            refresh();
          }}
        >
          set bp_fresh_start
        </DevButton>
        <DevButton
          onClick={() => {
            const v = studentStorage.consumeFreshStart();
            push(`consumeFreshStart() → ${v}`);
            refresh();
          }}
        >
          consume flag
        </DevButton>
        <DevButton
          onClick={() => {
            const next = studentStorage.addTodaySection(`sec-${Date.now() % 1000}`);
            push(`addTodaySection → [${next.join(", ")}]`);
            refresh();
          }}
        >
          add section
        </DevButton>
        <DevButton
          onClick={() => {
            studentStorage.setTodaySections(["mood"]);
            push("reset sections → [mood]");
            refresh();
          }}
        >
          reset sections
        </DevButton>
      </div>

      <div style={{ fontSize: 12, color: "#a4a59f", lineHeight: 1.6 }}>
        <div>
          bp_fresh_start (flag): <strong style={{ color: "#f2f3e5" }}>{String(freshStart)}</strong>
        </div>
        <div>
          bp_today_sections (array): <strong style={{ color: "#f2f3e5" }}>[{sections.join(", ")}]</strong>
        </div>
        {log.length > 0 && (
          <div style={{ marginTop: 6, opacity: 0.8 }}>last: {log[0]}</div>
        )}
      </div>
    </section>
  );
}

function DevButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid #36363f",
        background: "#1f1f25",
        color: "#f2f3e5",
        fontFamily: "var(--font-student-body)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
