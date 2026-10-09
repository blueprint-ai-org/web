import { useState } from "react";
import {
  colors, typography, radius, shadows,
  statusStyles, vibeStyles,
  chartDefaults, gradients,
  type VibeLevel, type StatusLevel,
} from "~/lib/tokens";
import { ChartCanvas } from "~/lib/echarts/ChartCanvas";

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const PERIODS: {
  key: string;
  label: string;
  subject: string;
  students: number;
  vibe: string;
  vibeLevel: VibeLevel;
  note: string;
}[] = [
  { key: "P1", label: "Period 1", subject: "Math",    students: 28, vibe: "Tense",   vibeLevel: "amber", note: "Slightly elevated — exam anxiety likely."        },
  { key: "P2", label: "Period 2", subject: "English", students: 27, vibe: "Calm",    vibeLevel: "green", note: "Good energy today. Strong baseline."             },
  { key: "P3", label: "Period 3", subject: "Science", students: 29, vibe: "Stressed",vibeLevel: "red",   note: "Highest stress this week — act on this one."    },
  { key: "P4", label: "Period 4", subject: "History", students: 28, vibe: "Calm",    vibeLevel: "green", note: "Stable. No flags this week."                    },
];

const FOCUS_CARDS: {
  who: string;
  why: string;
  action: string;
  level: StatusLevel;
}[] = [
  { who: "Emily Martinez",     why: "Mood down 3 weeks in a row. Quiet in P1 yesterday.",              action: "Check in before class",  level: "elevated" },
  { who: "Dani Garcia",        why: "Missed Monday & Tuesday. Engagement dropped 30%.",                action: "Welcome back warmly",    level: "monitor"  },
  { who: "Period 3 · Science", why: "Room stress is elevated — 7 students flagged tense this morning.",action: "Plan a reset moment",    level: "info"     },
];

const SLIPPING: {
  initials: string;
  name: string;
  period: string;
  detail: string;
  trend: string;
  level: StatusLevel;
}[] = [
  { initials: "EM", name: "Emily Martinez", period: "P1", detail: "Mood –18 pts · GPA 3.6 → 2.8",      trend: "3 wks ↓",  level: "elevated" },
  { initials: "DG", name: "Dani Garcia",    period: "P3", detail: "Absent 4 days · engagement 38%",     trend: "2 wks ↓",  level: "elevated" },
  { initials: "KL", name: "Kyle Lee",       period: "P1", detail: "Stopped participating · mood flat",  trend: "10 days ↓",level: "monitor"  },
  { initials: "SR", name: "Sofia Reyes",    period: "P4", detail: "Sleep pattern changed · tired in AM",trend: "1 wk ↓",   level: "monitor"  },
];

const ENGAGEMENT = [
  { period: "P1", thisWeek: 58, lastWeek: 66 },
  { period: "P2", thisWeek: 72, lastWeek: 70 },
  { period: "P3", thisWeek: 48, lastWeek: 61 },
  { period: "P4", thisWeek: 65, lastWeek: 64 },
];

// Reference unused tokens to keep imports stable for follow-up phases.
void shadows;
void gradients;
void statusStyles;

// ─────────────────────────────────────────────────────────────────────────────
// Inline style helpers — all values from brandingGuidelines
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: colors.background,
    color: colors.foreground,
    fontFamily: typography.fontFamily,
    fontSize: "14px",
    WebkitFontSmoothing: "antialiased" as const,
    padding: "clamp(1rem, 2vw, 2rem)",
  } as React.CSSProperties,

  shell: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    gap: "clamp(1rem, 1.6vw, 1.5rem)",
  } as React.CSSProperties,

  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.base,
    padding: "1rem",
    boxShadow: shadows.glass,
  } as React.CSSProperties,

  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    letterSpacing: typography.tracking.normal,
    color: colors.foreground,
    marginBottom: "2px",
  } as React.CSSProperties,

  cardSub: {
    fontSize: typography.size.sm,
    color: colors.muted,
    marginBottom: "0.75rem",
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: typography.size.xs,
    textTransform: "uppercase" as const,
    letterSpacing: typography.tracking.wider,
    color: colors.muted,
    marginBottom: "0.5rem",
  } as React.CSSProperties,

  select: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.base,
    color: colors.foreground,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.base,
    padding: "6px 26px 6px 10px",
    cursor: "pointer",
    outline: "none",
  } as React.CSSProperties,

  divider: {
    height: "1px",
    background: colors.border,
  } as React.CSSProperties,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FocusCard({ card, done, onToggle }: { card: typeof FOCUS_CARDS[0]; done: boolean; onToggle: () => void }) {
  const borderColor = done ? colors.success :
    card.level === "elevated" ? colors.danger :
    card.level === "monitor"  ? colors.warning :
    colors.info;
  const tagBg =
    card.level === "elevated" ? colors.dangerBg :
    card.level === "monitor"  ? colors.warningBg :
    colors.infoBg;
  const tagColor =
    card.level === "elevated" ? colors.danger :
    card.level === "monitor"  ? colors.warning :
    colors.info;

  return (
    <div style={{
      background: done ? colors.successBg : colors.surface,
      border: `1px solid ${done ? colors.successBorder : colors.border}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: radius.base,
      padding: "0.75rem 0.875rem",
      opacity: done ? 0.75 : 1,
      transition: "background 0.2s, border-color 0.2s, opacity 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <button
          onClick={onToggle}
          aria-label={done ? "Mark as not done" : "Mark complete"}
          style={{
            flexShrink: 0,
            marginTop: 1,
            width: 16, height: 16,
            borderRadius: 4,
            border: `1.5px solid ${done ? colors.success : colors.border}`,
            background: done ? colors.success : "transparent",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            padding: 0,
            fontSize: 11,
            lineHeight: 1,
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {done ? "✓" : ""}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: typography.size.md,
            fontWeight: typography.weight.medium,
            color: colors.foreground,
            marginBottom: "3px",
            textDecoration: done ? "line-through" : "none",
          }}>
            {card.who}
          </p>
          <p style={{
            fontSize: typography.size.sm,
            color: colors.muted,
            lineHeight: String(typography.leading.snug),
            textDecoration: done ? "line-through" : "none",
          }}>
            {card.why}
          </p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: "7px",
            padding: "2px 8px", borderRadius: radius.sm,
            fontSize: typography.size.xs, fontWeight: typography.weight.medium,
            letterSpacing: typography.tracking.wide,
            background: done ? colors.successBg : tagBg,
            color: done ? colors.success : tagColor,
          }}>
            {done ? "✓ Done" : card.action}
          </span>
        </div>
      </div>
    </div>
  );
}

function PeriodCard({
  period, selected, onClick,
}: {
  period: typeof PERIODS[0];
  selected: boolean;
  onClick: () => void;
}) {
  const v = vibeStyles[period.vibeLevel];
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? colors.primaryBg : colors.surface,
        border: `1px solid ${selected ? colors.primary : colors.border}`,
        borderRadius: radius.base,
        padding: "0.625rem 0.75rem",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <p style={{
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: selected ? colors.primary : colors.foreground,
        marginBottom: "1px",
      }}>
        {period.label}
      </p>
      <p style={{ fontSize: typography.size.xs, color: colors.muted, marginBottom: "8px" }}>
        {period.subject} · {period.students} students
      </p>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "2px 9px", borderRadius: radius.full,
        fontSize: typography.size.sm, fontWeight: typography.weight.medium,
        ...parseBgText(v.pill),
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: parseDot(v.dot), flexShrink: 0 }} />
        {period.vibe}
      </span>
      <p style={{ fontSize: typography.size.xs, color: colors.muted, marginTop: "6px", lineHeight: String(typography.leading.snug) }}>
        {period.note}
      </p>
    </div>
  );
}

function SlippingRow({ s }: { s: typeof SLIPPING[0] }) {
  const avatarBg   = s.level === "elevated" ? colors.dangerBg  : colors.warningBg;
  const avatarColor= s.level === "elevated" ? colors.danger    : colors.warning;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px 0", borderBottom: `1px solid ${colors.border}` }}
         className="last-of-type:border-0">
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: typography.size.xs, fontWeight: typography.weight.semibold, flexShrink: 0 }}>
        {s.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: typography.size.base, fontWeight: typography.weight.medium, color: colors.foreground }}>{s.name} · {s.period}</p>
        <p style={{ fontSize: typography.size.xs, color: colors.muted, marginTop: 1 }}>{s.detail}</p>
      </div>
      <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.danger, flexShrink: 0 }}>
        {s.trend}
      </span>
    </div>
  );
}

// Tiny helpers to extract background/color from vibeStyles class strings
// (since we're using inline styles rather than Tailwind in this file)
function parseBgText(classStr: string): { background: string; color: string } {
  const parts = classStr.match(/hsl\([^)]+\)/g) ?? [];
  return { background: parts[0] ?? "transparent", color: parts[1] ?? "inherit" };
}
function parseDot(classStr: string): string {
  return (classStr.match(/hsl\([^)]+\)/) ?? [])[0] ?? "transparent";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function TeacherWellbeing() {
  const [selectedPeriod, setSelectedPeriod] = useState("P1");
  const [selectedGrade,  setSelectedGrade]  = useState("6");
  const [selectedClass,  setSelectedClass]  = useState("all");
  const [actionDone,     setActionDone]     = useState(false);
  const [doneFocus, setDoneFocus] = useState<Record<string, boolean>>({});

  const visiblePeriods = selectedClass === "all"
    ? PERIODS
    : PERIODS.filter((p) => p.key === selectedClass);

  // Echarts bar chart option for the engagement panel.
  // The recharts <Cell> per-bar coloring maps to `itemStyle.color` on each
  // datum; "this-week-down-vs-last-week" cells flag red, others use the
  // primary violet. The "last week" series stays a uniform muted blue.
  const lastWeekBarColor = "hsl(217 30% 32%)";
  const engagementOption = {
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: chartDefaults.tooltip.backgroundColor,
      borderColor: chartDefaults.tooltip.borderColor,
      borderWidth: chartDefaults.tooltip.borderWidth,
      textStyle: { color: chartDefaults.tooltip.titleColor, fontSize: 12 },
      axisPointer: { type: "shadow" as const, shadowStyle: { color: chartDefaults.axis.cursor.fill } },
      valueFormatter: (v: number | string) => `${v}%`,
    },
    grid: { left: 30, right: 8, top: 8, bottom: 24, containLabel: false },
    xAxis: {
      type: "category" as const,
      data: ENGAGEMENT.map((e) => e.period),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.muted, fontSize: 11, fontFamily: typography.fontFamily },
    },
    yAxis: {
      type: "value" as const,
      min: 30,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: chartDefaults.axis.grid.stroke } },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        fontFamily: typography.fontFamily,
        formatter: (v: number) => `${v}%`,
      },
    },
    series: [
      {
        name: "This week",
        type: "bar" as const,
        barWidth: 16,
        barGap: "20%",
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: ENGAGEMENT.map((e) => ({
          value: e.thisWeek,
          itemStyle: {
            color: e.thisWeek < e.lastWeek ? colors.danger : colors.primary,
            borderRadius: [4, 4, 0, 0] as [number, number, number, number],
          },
        })),
      },
      {
        name: "Last week",
        type: "bar" as const,
        barWidth: 16,
        itemStyle: {
          color: lastWeekBarColor,
          borderRadius: [4, 4, 0, 0],
        },
        data: ENGAGEMENT.map((e) => e.lastWeek),
      },
    ],
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: colors.primaryBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.primary, flexShrink: 0 }}>
              MR
            </div>
            <div>
              <h1 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.medium, letterSpacing: typography.tracking.tight, color: colors.foreground, lineHeight: 1.2 }}>
                Ms. Rivera
              </h1>
              <p style={{ fontSize: typography.size.xs, color: colors.muted, marginTop: 2 }}>
                Thursday, Apr 16 · Intelligence Layer
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={S.select}>
              <option value="6">Grade 6</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
            </select>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={S.select}>
              <option value="all">All classes</option>
              <option value="P1">Period 1 · Math</option>
              <option value="P2">Period 2 · English</option>
              <option value="P3">Period 3 · Science</option>
              <option value="P4">Period 4 · History</option>
            </select>
          </div>
        </div>

        {/* ── Walk in knowing ────────────────────────────────────────────── */}
        <div>
          <p style={S.sectionLabel}>Walk in knowing today</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            {FOCUS_CARDS.map((c) => (
              <FocusCard
                key={c.who}
                card={c}
                done={!!doneFocus[c.who]}
                onToggle={() => setDoneFocus((p) => ({ ...p, [c.who]: !p[c.who] }))}
              />
            ))}
          </div>
        </div>

        {/* ── Suggested action ───────────────────────────────────────────── */}
        {!actionDone ? (
          <div style={{ background: `hsl(252 30% 19%)`, border: `1px solid ${colors.primaryBorder}`, borderRadius: radius.base, padding: "11px 15px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: typography.size.base, fontWeight: typography.weight.medium, color: colors.primary, marginBottom: 2 }}>
                Suggested for Period 3 today
              </p>
              <p style={{ fontSize: typography.size.sm, color: colors.muted, lineHeight: String(typography.leading.snug) }}>
                Start with 2 min of silent journaling before the lesson — reduces group stress by ~25% on high-tension days.
              </p>
            </div>
            <button
              onClick={() => setActionDone(true)}
              style={{ flexShrink: 0, padding: "5px 13px", background: colors.primary, border: "none", borderRadius: radius.sm, color: "#fff", fontFamily: typography.fontFamily, fontSize: typography.size.sm, fontWeight: typography.weight.medium, cursor: "pointer" }}
            >
              Mark done
            </button>
          </div>
        ) : (
          <div style={{ background: colors.successBg, border: `1px solid ${colors.successBorder}`, borderRadius: radius.base, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: colors.success, fontSize: 13 }}>✓</span>
            <p style={{ fontSize: typography.size.base, color: colors.success }}>Done — no more actions flagged for today.</p>
          </div>
        )}

        {/* ── Room temperature ───────────────────────────────────────────── */}
        <div>
          <p style={S.sectionLabel}>Room temperature by period</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {visiblePeriods.map((p) => (
              <PeriodCard
                key={p.key}
                period={p}
                selected={selectedPeriod === p.key}
                onClick={() => setSelectedPeriod(p.key)}
              />
            ))}
          </div>
        </div>

        <div style={S.divider} />

        {/* ── Bottom grid ────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>

          {/* Quietly slipping */}
          <div style={S.card}>
            <p style={S.cardTitle}>Quietly slipping</p>
            <p style={S.cardSub}>Mood + grades both declining</p>
            {SLIPPING.map((s) => <SlippingRow key={s.name} s={s} />)}
          </div>

          {/* Engagement chart */}
          <div style={S.card}>
            <p style={S.cardTitle}>Engagement this week</p>
            <p style={S.cardSub}>vs last week per period</p>

            {/* Legend */}
            <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: typography.size.xs, color: colors.muted }}>
              {[
                { label: "This week", color: colors.primary },
                { label: "Last week", color: lastWeekBarColor },
              ].map((l) => (
                <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
                  {l.label}
                </span>
              ))}
            </div>

            <ChartCanvas height={220} option={engagementOption} />
          </div>

        </div>
      </div>
    </div>
  );
}
