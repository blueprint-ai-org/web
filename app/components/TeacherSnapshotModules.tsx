import { useState } from "react";
import type { JSX } from "react";
import { Info, X, Activity, AlertTriangle, TrendingDown, BarChart3, TrendingUp, ChevronDown, type LucideIcon } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ClassInfo {
  period: number;
  name: string;
  studentCount: number;
}

interface TeacherSnapshotModulesProps {
  classInfo: ClassInfo;
  onModuleClick?: (moduleId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAILWIND CLASS GROUPS — inlined replacements for the former .eq-* stylesheet
// ═══════════════════════════════════════════════════════════════════════════════
//
// These constants stand in for the .eq-* CSS classes that used to live in
// the prototype's external glassmorphic-modules stylesheet. Keeping them as
// named constants (rather than re-pasting the same long Tailwind chain at
// every call site) preserves readability while still being pure utility
// classes — no extra CSS file required.

// .eq-dashboard
const EQ_DASHBOARD = "w-full";
// .eq-dashboard__grid (responsive: 1/2/3 columns at sm/lg breakpoints)
const EQ_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch";

// .eq-card-wrapper
const EQ_CARD_WRAPPER = "relative flex min-w-0 overflow-visible";
// .eq-card — glassmorphic surface
const EQ_CARD =
  "relative flex flex-col w-full min-w-0 text-left p-3.5 rounded-[20px] " +
  "bg-white/[0.04] border border-white/[0.08] cursor-pointer overflow-visible " +
  "backdrop-blur-md transition-[background,border-color,box-shadow,transform] duration-300 " +
  "hover:bg-white/[0.07] hover:border-white/[0.14] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:-translate-y-px " +
  "flex-1";
// .eq-card__header
const EQ_CARD_HEADER = "flex items-center justify-between mb-3";
// .eq-card__info-btn
const EQ_INFO_BTN =
  "w-[22px] h-[22px] rounded-full flex items-center justify-center " +
  "bg-transparent border-0 text-white/25 cursor-pointer shrink-0 " +
  "transition-[color,background] duration-200 hover:text-white/70 hover:bg-white/[0.06]";

// .eq-tooltip__backdrop
const EQ_TOOLTIP_BACKDROP =
  "fixed inset-0 z-40 bg-[rgba(11,18,32,0.5)] backdrop-blur-[4px]";
// .eq-tooltip — desktop: absolutely positioned dropdown below the card.
// Mobile (<640px): centered fixed modal.
const EQ_TOOLTIP =
  "absolute z-50 top-full mt-2.5 left-0 right-auto " +
  "w-[min(360px,calc(100vw-32px))] max-h-[min(420px,calc(100vh-120px))] overflow-y-auto " +
  "p-[18px] rounded-[18px] bg-[rgba(18,24,42,0.95)] border border-white/[0.08] " +
  "shadow-[0_10px_30px_rgba(0,0,0,0.35),0_0_40px_rgba(124,92,255,0.08)] backdrop-blur-md overscroll-contain " +
  "max-sm:!fixed max-sm:!top-1/2 max-sm:!left-1/2 max-sm:!right-auto max-sm:!mt-0 " +
  "max-sm:!-translate-x-1/2 max-sm:!-translate-y-1/2 max-sm:!w-[calc(100vw-24px)] " +
  "max-sm:!max-w-[380px] max-sm:!max-h-[calc(100vh-80px)] max-sm:!p-4 max-sm:!rounded-2xl";
// .eq-tooltip__close
const EQ_TOOLTIP_CLOSE =
  "absolute top-4 right-4 p-1 rounded-full bg-transparent border-0 text-white/40 " +
  "cursor-pointer transition-[color,background] duration-200 hover:text-white/80 hover:bg-white/[0.06]";
// .eq-tooltip__header
const EQ_TOOLTIP_HEADER = "flex items-center gap-2.5 mb-4";
// .eq-tooltip__icon
const EQ_TOOLTIP_ICON = "flex items-center text-blueprint-violet";
// .eq-tooltip__title
const EQ_TOOLTIP_TITLE = "text-[15px] font-semibold text-white/90";
// .eq-tooltip__question
const EQ_TOOLTIP_QUESTION = "text-[13px] italic text-blueprint-violet";

// .eq-tooltip__why-box
const EQ_TOOLTIP_WHY_BOX =
  "mb-4 p-3 rounded-[14px] bg-[rgba(124,92,255,0.06)] border border-[rgba(124,92,255,0.12)]";
// .eq-tooltip__section
const EQ_TOOLTIP_SECTION = "mb-[14px]";
// .eq-tooltip__section-title (base + variants)
const EQ_TOOLTIP_SECTION_TITLE = "text-[10px] font-bold uppercase tracking-[0.08em] mb-[5px]";
const EQ_TOOLTIP_SECTION_TITLE_VIOLET = "text-blueprint-violet";
const EQ_TOOLTIP_SECTION_TITLE_MUTED = "text-white/40";
// .eq-tooltip__text
const EQ_TOOLTIP_TEXT = "text-[13px] leading-[1.6] text-white/60";

// .eq-tooltip__list
const EQ_TOOLTIP_LIST = "list-none p-0 m-0";
// .eq-tooltip__list-item
const EQ_TOOLTIP_LIST_ITEM =
  "flex items-start gap-1.5 text-[13px] text-white/50 mb-1";
// .eq-tooltip__list-bullet
const EQ_TOOLTIP_LIST_BULLET = "text-blueprint-mint mt-px";

// .eq-tooltip__actions
const EQ_TOOLTIP_ACTIONS = "flex flex-col gap-1.5";
// .eq-tooltip__action
const EQ_TOOLTIP_ACTION =
  "px-3 py-2.5 rounded-[12px] bg-white/[0.04] border border-white/[0.06]";
// .eq-tooltip__action-condition
const EQ_TOOLTIP_ACTION_CONDITION = "text-[11px] font-semibold text-blueprint-amber";
// .eq-tooltip__action-text
const EQ_TOOLTIP_ACTION_TEXT = "text-[13px] text-white/50 mt-0.5";

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLTIP CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TooltipData {
  Icon: LucideIcon;
  title: string;
  question: string;
  whyItMatters: string;
  dataSources: string[];
  actions: { condition: string; action: string }[];
}

const tooltipContent: Record<string, TooltipData> = {
  "mood-pulse": {
    Icon: Activity,
    title: "Emotional Snapshot",
    question: "How are your students really feeling?",
    whyItMatters:
      "Mood is the leading indicator. A student whose mood drops for 3+ days is 4x more likely to disengage academically within 2 weeks. Catching mood shifts early gives you a window to intervene before grades are affected.",
    dataSources: [
      "Daily mood check-ins (emoji selection)",
      "Journaling sentiment analysis",
      "Self-reported energy levels",
      "Week-over-week mood trends",
    ],
    actions: [
      { condition: "If struggling > 20%", action: "Consider a class-wide wellness check or adjusted pacing" },
      { condition: "If individual drops 3+ days", action: "Private check-in within 24 hours" },
    ],
  },
  "need-attention": {
    Icon: AlertTriangle,
    title: "Could Use a Check-In",
    question: "Who needs you most right now?",
    whyItMatters:
      "These students have crossed multiple risk thresholds simultaneously. Without intervention, research shows 78% will experience significant academic decline within 3 weeks. Early intervention reduces this to 23%.",
    dataSources: [
      "Composite risk score (engagement + routine + connection)",
      "Attendance pattern anomalies",
      "Assignment submission delays",
      "Mood trend analysis",
    ],
    actions: [
      { condition: "Critical priority (red)", action: "Same-day check-in or counselor referral" },
      { condition: "High priority (orange)", action: "Schedule check-in this week" },
      { condition: "Moderate (yellow)", action: "Monitor and note in next interaction" },
    ],
  },
  "checking-out": {
    Icon: TrendingDown,
    title: "Less Engaged Lately",
    question: "Who's quietly disengaging?",
    whyItMatters:
      "These students haven't failed yet — they're in the 'silent withdrawal' phase. This is your 2-3 week warning window. Any 2 of these signals active simultaneously flags a student: engagement drop >30%, check-in avoidance (3+ consecutive skips), mood trend decline (5+ days), or passivity spike (zero interaction 7+ days).",
    dataSources: [
      "LMS login frequency vs. personal baseline",
      "Assignment submission timing shifts",
      "Discussion participation decline",
      "Resource access patterns",
      "Video completion rates",
      "Daily mood check-in streaks",
    ],
    actions: [
      { condition: "3+ signals (critical)", action: "Same-day outreach — something significant has changed" },
      { condition: "Drop > 40%", action: "Direct outreach — schedule private check-in" },
      { condition: "Drop 20-40%", action: "Casual check-in, look for context clues" },
      { condition: "New flag only", action: "Monitor for 48 hours, then reassess" },
    ],
  },
  "class-engagement": {
    Icon: BarChart3,
    title: "Class Participation",
    question: "Is your class connecting with the material?",
    whyItMatters:
      "Measures how actively students participate across logins, assignments, and discussions. Currently 68% vs. a 75% class baseline — a 7-point gap suggests a class-wide dip, not just individual disengagement. Last week was 74%, so the trend is declining. Systemic factors like exam stress or assignment overload are common drivers.",
    dataSources: [
      "Active participation (login 3+/week, submissions, discussions)",
      "Resource access breadth",
      "Assignment completion rates",
      "Time-on-task patterns",
      "Weekly trend comparison & class baseline deviation",
    ],
    actions: [
      { condition: "Below 60%", action: "Review recent assignments for clarity; consider pacing adjustment" },
      { condition: "Sudden drop (>10%)", action: "Ask students directly — anonymous survey can help" },
      { condition: "Below baseline 2+ weeks", action: "Schedule a class-wide check-in or adjust workload" },
    ],
  },
  "this-week": {
    Icon: TrendingUp,
    title: "This Week",
    question: "Are things getting better or worse?",
    whyItMatters:
      "This is your trend compass. Individual metrics can fluctuate, but the net direction tells you if your overall approach is working. Three consecutive negative weeks is a strong signal to change strategy.",
    dataSources: [
      "Week-over-week composite score changes",
      "Improving vs. declining student counts",
      "Trend velocity analysis",
      "Pattern detection across all metrics",
    ],
    actions: [
      { condition: "Net negative for 2+ weeks", action: "Review intervention strategies; consider class-wide approach" },
      { condition: "Net positive", action: "Document what's working — reinforce successful strategies" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKING OUT DATA
// ═══════════════════════════════════════════════════════════════════════════════

const CHECKING_OUT_SIGNALS = [
  { color: "bg-destructive", label: "Engagement drop >30%", desc: "Less than 30% of activities completed vs. prior 2-week baseline" },
  { color: "bg-amber-500", label: "Check-in avoidance", desc: "Skipped 3+ consecutive daily mood check-ins" },
  { color: "bg-blue-400", label: "Mood trend decline", desc: "Mood score falling for 5+ consecutive days" },
  { color: "bg-amber-500", label: "Passivity spike", desc: "Viewing only, zero interaction for 7+ days" },
];

const CHECKING_OUT_STUDENTS = [
  { initials: "MK", name: "Marcus K.", grade: "5th", drop: -52, signals: [{ label: "Engagement", type: "red" as const }, { label: "Mood decline", type: "amber" as const }, { label: "Avoidance", type: "amber" as const }] },
  { initials: "JS", name: "Jamie S.", grade: "3rd", drop: -41, signals: [{ label: "Engagement", type: "red" as const }, { label: "Passivity", type: "blue" as const }] },
  { initials: "RL", name: "Rosa L.", grade: "7th", drop: -35, signals: [{ label: "Avoidance", type: "amber" as const }, { label: "Passivity", type: "blue" as const }] },
  { initials: "TW", name: "Theo W.", grade: "2nd", drop: -28, signals: [{ label: "Engagement", type: "red" as const }, { label: "Mood decline", type: "amber" as const }] },
  { initials: "AN", name: "Aisha N.", grade: "6th", drop: -19, signals: [{ label: "Avoidance", type: "amber" as const }, { label: "New flag", type: "gray" as const }] },
];

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  MK: { bg: "bg-blue-950", text: "text-blue-400" },
  JS: { bg: "bg-purple-950", text: "text-purple-400" },
  RL: { bg: "bg-red-950", text: "text-red-400" },
  TW: { bg: "bg-green-950", text: "text-green-400" },
  AN: { bg: "bg-amber-950", text: "text-amber-400" },
};

const CHIP_STYLES: Record<string, string> = {
  red: "bg-destructive/15 text-destructive",
  amber: "bg-amber-500/15 text-amber-500",
  blue: "bg-blue-400/15 text-blue-400",
  gray: "bg-white/[0.08] text-muted-foreground",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

interface ModuleConfig {
  id: string;
  tooltipKey: string;
  Icon: LucideIcon;
  tooltipAlign?: "left" | "right";
  render: (props: { showTooltip: boolean; setShowTooltip: (v: boolean) => void; onClick: () => void }) => JSX.Element;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKING OUT MODULE (expandable drawer)
// ═══════════════════════════════════════════════════════════════════════════════

function CheckingOutModule({ showTooltip, setShowTooltip, onClick }: { showTooltip: boolean; setShowTooltip: (v: boolean) => void; onClick: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={`${EQ_CARD_WRAPPER} flex-col`}>
      {/* Card */}
      <div
        className={`${EQ_CARD} cursor-pointer transition-all ${drawerOpen ? "!rounded-b-none !border-b-white/[0.06]" : ""}`}
        onClick={() => setDrawerOpen(v => !v)}
      >
        <div className={EQ_CARD_HEADER}>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={13} strokeWidth={1.5} className="text-blueprint-violet opacity-80" />
            <h3 className="text-[10px] tracking-widest text-blueprint-subtle font-semibold">LESS ENGAGED LATELY</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className={EQ_INFO_BTN}
              onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
            >
              <Info size={14} />
            </button>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${drawerOpen ? "rotate-180" : ""}`} />
          </div>
        </div>

        <div className="text-2xl font-semibold tracking-tight text-white mt-2">
          5 <span className="text-xs text-blueprint-muted font-normal">students</span>
        </div>
        <p className="text-[11px] text-blueprint-amber font-medium mt-2">Engagement down 35% on average</p>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-2 mb-3">
          <div className="h-full rounded-full bg-gradient-to-r from-blueprint-coral to-blueprint-amber" style={{ width: "35%" }} />
        </div>
        <p className="text-[11px] text-destructive font-medium mt-auto">
          3 fewer students since last week
        </p>
      </div>

      {/* Expandable Drawer */}
      {drawerOpen && (
        <div className="bg-[#0f1420] border border-white/[0.08] border-t-white/[0.06] rounded-b-xl overflow-hidden animate-in slide-in-from-top-1 duration-200">
          {/* Drawer header */}
          <div className="px-4 pt-2.5 pb-2 flex justify-between items-center border-b border-white/[0.06]">
            <span className="text-[11px] text-muted-foreground">Ranked by severity</span>
            <span className="text-[10px] bg-white/[0.06] text-muted-foreground px-2 py-0.5 rounded">All grades</span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[30px_1fr_32px_auto_40px] gap-x-2 px-4 py-1.5 border-b border-white/[0.06]">
            <span />
            <span className="text-[10px] font-semibold text-muted-foreground/60">Student</span>
            <span className="text-[10px] font-semibold text-muted-foreground/60">Gr.</span>
            <span className="text-[10px] font-semibold text-muted-foreground/60">Active signals</span>
            <span className="text-[10px] font-semibold text-muted-foreground/60 text-right">Drop</span>
          </div>

          {/* Student rows */}
          {CHECKING_OUT_STUDENTS.map((s, idx) => {
            const av = AVATAR_COLORS[s.initials] || { bg: "bg-slate-800", text: "text-muted-foreground" };
            return (
              <div
                key={s.initials}
                className={`grid grid-cols-[30px_1fr_32px_auto_40px] gap-x-2 px-4 py-2.5 items-center ${idx < CHECKING_OUT_STUDENTS.length - 1 ? "border-b border-white/[0.04]" : ""} ${idx === 0 ? "bg-destructive/[0.04]" : ""}`}
              >
                {/* Avatar */}
                <div className={`w-[30px] h-[30px] rounded-full ${av.bg} ${av.text} flex items-center justify-center text-[10px] font-bold`}>
                  {s.initials}
                </div>
                {/* Name */}
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.grade}</p>
                </div>
                {/* Grade number */}
                <span className="text-[11px] text-muted-foreground">{s.grade.replace(/\D/g, "")}</span>
                {/* Signal chips */}
                <div className="flex gap-1 flex-wrap">
                  {s.signals.map(sig => (
                    <span key={sig.label} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CHIP_STYLES[sig.type]}`}>
                      {sig.label}
                    </span>
                  ))}
                </div>
                {/* Drop % */}
                <span className="text-xs font-bold text-destructive text-right">{s.drop}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip (reuse existing pattern) */}
      {showTooltip && tooltipContent["checking-out"] && (
        <>
          <div className={EQ_TOOLTIP_BACKDROP} onClick={() => setShowTooltip(false)} />
          <div className={EQ_TOOLTIP} style={{ left: "auto", right: 0 }}>
            <button className={EQ_TOOLTIP_CLOSE} onClick={() => setShowTooltip(false)}>
              <X size={14} />
            </button>
            <div className={EQ_TOOLTIP_HEADER}>
              <span className={EQ_TOOLTIP_ICON}><TrendingDown size={20} strokeWidth={1.5} /></span>
              <div>
                <div className={EQ_TOOLTIP_TITLE}>{tooltipContent["checking-out"].title}</div>
                <div className={EQ_TOOLTIP_QUESTION}>{tooltipContent["checking-out"].question}</div>
              </div>
            </div>

            {/* Signal definitions */}
            <div className={EQ_TOOLTIP_WHY_BOX}>
              <div className={`${EQ_TOOLTIP_SECTION_TITLE} ${EQ_TOOLTIP_SECTION_TITLE_VIOLET}`}>🚩 Trigger Signals</div>
              <div className="space-y-2 mt-2">
                {CHECKING_OUT_SIGNALS.map(s => (
                  <div key={s.label} className="flex gap-2 items-start">
                    <div className={`w-[7px] h-[7px] rounded-full mt-1 shrink-0 ${s.color}`} />
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-2 pt-2 border-t border-white/[0.06]">Any 2 signals active simultaneously flags a student.</p>
            </div>

            <div className={EQ_TOOLTIP_WHY_BOX}>
              <div className={`${EQ_TOOLTIP_SECTION_TITLE} ${EQ_TOOLTIP_SECTION_TITLE_VIOLET}`}>💡 Why It Matters</div>
              <p className={EQ_TOOLTIP_TEXT}>{tooltipContent["checking-out"].whyItMatters}</p>
            </div>

            <div>
              <div className={`${EQ_TOOLTIP_SECTION_TITLE} ${EQ_TOOLTIP_SECTION_TITLE_MUTED}`}>What You Can Do</div>
              <div className={EQ_TOOLTIP_ACTIONS}>
                {tooltipContent["checking-out"].actions.map((a, i) => (
                  <div key={i} className={EQ_TOOLTIP_ACTION}>
                    <div className={EQ_TOOLTIP_ACTION_CONDITION}>{a.condition}</div>
                    <div className={EQ_TOOLTIP_ACTION_TEXT}>{a.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const modules: ModuleConfig[] = [
  {
    id: "mood-pulse",
    tooltipKey: "mood-pulse",
    Icon: Activity,
    render: ({ showTooltip, setShowTooltip, onClick }) => (
      <CardShell id="mood-pulse" Icon={Activity} title="EMOTIONAL SNAPSHOT" showTooltip={showTooltip} setShowTooltip={setShowTooltip} onClick={onClick}>
        <div className="text-2xl font-semibold tracking-tight text-white mt-2">
          72 <span className="text-sm text-blueprint-muted font-normal">/100</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex mt-3 mb-3">
          <div className="h-full bg-blueprint-mint" style={{ width: "58%" }} />
          <div className="h-full bg-blueprint-amber" style={{ width: "28%" }} />
          <div className="h-full bg-blueprint-coral" style={{ width: "14%" }} />
        </div>
        <div className="flex justify-between text-[11px] mt-auto">
          <span className="text-blueprint-muted">58% feeling good overall</span>
          <span className="text-blueprint-amber font-medium">4 students having a tough time</span>
        </div>
      </CardShell>
    ),
  },
  {
    id: "need-attention",
    tooltipKey: "need-attention",
    Icon: AlertTriangle,
    render: ({ showTooltip, setShowTooltip, onClick }) => (
      <CardShell id="need-attention" Icon={AlertTriangle} title="COULD USE A CHECK-IN" showTooltip={showTooltip} setShowTooltip={setShowTooltip} onClick={onClick}>
        <div className="text-2xl font-semibold tracking-tight text-white mt-2">
          3 <span className="text-xs text-blueprint-muted font-normal">students</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blueprint-coral/12 text-blueprint-coral">Emily M.</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blueprint-amber/12 text-blueprint-amber">Dani G.</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blueprint-blue/12 text-blueprint-blue">Alex R.</span>
        </div>
        <p className="text-[11px] text-blueprint-coral font-medium mt-auto">1 more student this week</p>
      </CardShell>
    ),
  },
  {
    id: "checking-out",
    tooltipKey: "checking-out",
    Icon: TrendingDown,
    render: ({ showTooltip, setShowTooltip, onClick }) => (
      <CheckingOutModule showTooltip={showTooltip} setShowTooltip={setShowTooltip} onClick={onClick} />
    ),
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CARD SHELL
// ═══════════════════════════════════════════════════════════════════════════════

function CardShell({
  id,
  Icon,
  title,
  tooltipAlign = "left",
  showTooltip,
  setShowTooltip,
  onClick,
  children,
}: {
  id: string;
  Icon: LucideIcon;
  title: string;
  tooltipAlign?: "left" | "right";
  showTooltip: boolean;
  setShowTooltip: (v: boolean) => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tooltip = tooltipContent[id];

  return (
    <div className={EQ_CARD_WRAPPER}>
      <div className={EQ_CARD} onClick={onClick}>
        <div className={EQ_CARD_HEADER}>
          <div className="flex items-center gap-1.5">
            <Icon size={13} strokeWidth={1.5} className="text-blueprint-violet opacity-80" />
            <h3 className="text-[10px] tracking-widest text-blueprint-subtle font-semibold">{title}</h3>
          </div>
          <button
            className={EQ_INFO_BTN}
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(!showTooltip);
            }}
          >
            <Info size={14} />
          </button>
        </div>
        {children}
      </div>

      {showTooltip && tooltip && (
        <>
          <div className={EQ_TOOLTIP_BACKDROP} onClick={() => setShowTooltip(false)} />
          <div className={EQ_TOOLTIP} style={tooltipAlign === "right" ? { left: "auto", right: 0 } : undefined}>
            <button className={EQ_TOOLTIP_CLOSE} onClick={() => setShowTooltip(false)}>
              <X size={14} />
            </button>

            <div className={EQ_TOOLTIP_HEADER}>
              <span className={EQ_TOOLTIP_ICON}><tooltip.Icon size={20} strokeWidth={1.5} /></span>
              <div>
                <div className={EQ_TOOLTIP_TITLE}>{tooltip.title}</div>
                <div className={EQ_TOOLTIP_QUESTION}>{tooltip.question}</div>
              </div>
            </div>

            <div className={EQ_TOOLTIP_WHY_BOX}>
              <div className={`${EQ_TOOLTIP_SECTION_TITLE} ${EQ_TOOLTIP_SECTION_TITLE_VIOLET}`}>
                💡 Why It Matters
              </div>
              <p className={EQ_TOOLTIP_TEXT}>{tooltip.whyItMatters}</p>
            </div>

            <div className={EQ_TOOLTIP_SECTION}>
              <div className={`${EQ_TOOLTIP_SECTION_TITLE} ${EQ_TOOLTIP_SECTION_TITLE_MUTED}`}>
                Data Sources
              </div>
              <ul className={EQ_TOOLTIP_LIST}>
                {tooltip.dataSources.map((source, i) => (
                  <li key={i} className={EQ_TOOLTIP_LIST_ITEM}>
                    <span className={EQ_TOOLTIP_LIST_BULLET}>✓</span>
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className={`${EQ_TOOLTIP_SECTION_TITLE} ${EQ_TOOLTIP_SECTION_TITLE_MUTED}`}>
                What You Can Do
              </div>
              <div className={EQ_TOOLTIP_ACTIONS}>
                {tooltip.actions.map((a, i) => (
                  <div key={i} className={EQ_TOOLTIP_ACTION}>
                    <div className={EQ_TOOLTIP_ACTION_CONDITION}>{a.condition}</div>
                    <div className={EQ_TOOLTIP_ACTION_TEXT}>{a.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TeacherSnapshotModules({
  classInfo,
  onModuleClick,
}: TeacherSnapshotModulesProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <div className={EQ_DASHBOARD}>
      <div className={EQ_GRID}>
        {modules.map((m) => (
          <div key={m.id}>
            {m.render({
              showTooltip: activeTooltip === m.id,
              setShowTooltip: (v) => setActiveTooltip(v ? m.id : null),
              onClick: () => onModuleClick?.(m.id),
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
