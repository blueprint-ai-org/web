import { useState } from "react";
import { cn } from "~/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreKey = "emotional_safety" | "stress_regulation" | "engagement_resilience";

interface ScoreTier {
  min: number;
  max: number;
  label: string;
  color: string;
  bg: string;
  action: string;
}

interface ScoreDimension {
  key: ScoreKey;
  title: string;
  subtitle: string;
  range: string;
  whatItMeasures: string;
  derivedFrom: string[];
  tiers: ScoreTier[];
  counselorQuestion: string;
  isBalanceDial?: boolean;
}

// ─── Score Definitions ────────────────────────────────────────────────────────

const DIMENSIONS: ScoreDimension[] = [
  {
    key: "emotional_safety",
    title: "Emotional Safety",
    subtitle: "How safe do students feel expressing emotions?",
    range: "0–100",
    whatItMeasures:
      "The degree to which students feel psychologically safe enough to express distress, ask for help, and engage honestly with check-ins. A declining score means students are self-censoring — a warning sign that precedes disengagement and crisis.",
    derivedFrom: [
      "Daily mood check-in response rate",
      "Sentiment of self-reported responses",
      "Frequency of 'skipped' or neutral check-ins",
      "Peer interaction patterns over 14 days",
    ],
    tiers: [
      { min: 80, max: 100, label: "Healthy", color: "#34d399", bg: "rgba(52,211,153,0.1)", action: "Maintain current environment. Celebrate what's working." },
      { min: 60, max: 79,  label: "Moderate concern", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", action: "Review recent class events. Check for peer conflict or teacher relationship strain." },
      { min: 40, max: 59,  label: "Elevated concern", color: "#fb923c", bg: "rgba(251,146,60,0.1)", action: "Conduct classroom pulse check. Consider anonymous feedback survey." },
      { min: 0,  max: 39,  label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.1)", action: "Escalate to counseling team. Possible systemic issue — bullying, trauma exposure, or unsafe dynamics." },
    ],
    counselorQuestion: "Are students willing to tell us how they really feel?",
  },
  {
    key: "stress_regulation",
    title: "Stress / Regulation Balance",
    subtitle: "Is stress outpacing students' ability to cope?",
    range: "Balance dial — no single score",
    whatItMeasures:
      "A ratio between detected stress load and observed coping capacity. It is not a single number — it is a directional signal. When the arc skews warm (orange/red), stress is accumulating faster than students can regulate. When cool (green/teal), coping mechanisms are keeping pace.",
    derivedFrom: [
      "Self-reported stress levels across check-ins",
      "Completion rate of regulation activities (breathing, journaling)",
      "Behavioral indicators: avoidance, outbursts, withdrawal",
      "Academic performance signals from connected systems",
    ],
    tiers: [
      { min: 67, max: 100, label: "Regulated", color: "#34d399", bg: "rgba(52,211,153,0.1)", action: "Students are coping adequately. Monitor for sudden shifts." },
      { min: 34, max: 66,  label: "Approaching limit", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", action: "Introduce proactive regulation supports. Consider scheduling optional check-in groups." },
      { min: 0,  max: 33,  label: "Overloaded", color: "#ef4444", bg: "rgba(239,68,68,0.1)", action: "Students are in stress overload. Intervention needed — reduce academic pressure where possible and increase emotional support touchpoints." },
    ],
    counselorQuestion: "Do students have enough coping capacity for what they're carrying?",
    isBalanceDial: true,
  },
  {
    key: "engagement_resilience",
    title: "Engagement Resilience",
    subtitle: "When students disengage, do they come back?",
    range: "0–100",
    whatItMeasures:
      "Measures bounce-back rate after a disengagement event. A low score doesn't just mean students are disengaged — it means students who drop off are staying off. This is one of the strongest early predictors of chronic absenteeism and crisis escalation.",
    derivedFrom: [
      "Re-engagement rate within 7 days of a missed check-in streak",
      "Activity return rate after a 3+ day absence",
      "Response to outreach messages (platform or counselor)",
      "Longitudinal mood recovery patterns",
    ],
    tiers: [
      { min: 70, max: 100, label: "Strong resilience", color: "#34d399", bg: "rgba(52,211,153,0.1)", action: "Students are self-correcting. Light monitoring is sufficient." },
      { min: 40, max: 69,  label: "Fragile", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", action: "Students need prompting to return. Increase outreach cadence after any disengagement event." },
      { min: 20, max: 39,  label: "Low resilience", color: "#fb923c", bg: "rgba(251,146,60,0.1)", action: "High risk of chronic disengagement. Proactive 1:1 check-ins recommended before students fully withdraw." },
      { min: 0,  max: 19,  label: "Critical — intervene", color: "#ef4444", bg: "rgba(239,68,68,0.1)", action: "Students are not returning after disengagement. This class or cohort needs immediate counselor attention." },
    ],
    counselorQuestion: "When a student disappears, what are the odds they come back on their own?",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTier(score: number, tiers: ScoreTier[]): ScoreTier {
  return tiers.find((t) => score >= t.min && score <= t.max) ?? tiers[tiers.length - 1];
}

// ─── Score Ring (mini) ────────────────────────────────────────────────────────

function MiniRing({ score, color, size = 40 }: { score: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill="#f1f5f9" fontSize={11} fontWeight={700}>
        {score}
      </text>
    </svg>
  );
}

// ─── Tier Bar ─────────────────────────────────────────────────────────────────

function TierBar({ tiers, currentScore }: { tiers: ScoreTier[]; currentScore?: number }) {
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#334155", textTransform: "uppercase", marginBottom: 6 }}>
        Score ranges
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((t) => {
          const isCurrent = currentScore !== undefined && currentScore >= t.min && currentScore <= t.max;
          return (
            <div
              key={t.label}
              style={{
                background: isCurrent ? t.bg : "rgba(255,255,255,0.02)",
                border: isCurrent ? `0.5px solid ${t.color}44` : "0.5px solid rgba(255,255,255,0.05)",
                borderRadius: 8,
                padding: "8px 12px",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isCurrent ? 5 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? t.color : "#475569" }}>{t.label}</span>
                </div>
                <span style={{ fontSize: 10, color: "#334155" }}>{t.min}–{t.max}</span>
              </div>
              {isCurrent && (
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0 14px", lineHeight: 1.5 }}>
                  {t.action}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dimension Panel ──────────────────────────────────────────────────────────

function DimensionPanel({ dim, currentScore }: { dim: ScoreDimension; currentScore?: number }) {
  const tier = currentScore !== undefined && !dim.isBalanceDial
    ? getTier(currentScore, dim.tiers)
    : null;

  return (
    <div style={{ padding: "16px 20px 20px" }}>
      {/* Score + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        {currentScore !== undefined && !dim.isBalanceDial ? (
          <MiniRing score={currentScore} color={tier?.color ?? "#60a5fa"} size={52} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3L17 10L10 17M17 10H3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{dim.title}</p>
          <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 0", lineHeight: 1.4 }}>{dim.subtitle}</p>
          {tier && (
            <span style={{ display: "inline-block", marginTop: 5, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: tier.bg, color: tier.color }}>
              {tier.label}
            </span>
          )}
        </div>
      </div>

      {/* Counselor question */}
      <div style={{ background: "rgba(99,130,220,0.08)", border: "0.5px solid rgba(99,130,220,0.2)", borderRadius: 8, padding: "9px 12px", marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#4f6cbd", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>The question this answers</p>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>"{dim.counselorQuestion}"</p>
      </div>

      {/* What it measures */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#334155", textTransform: "uppercase", marginBottom: 6 }}>What it measures</p>
        <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{dim.whatItMeasures}</p>
      </div>

      {/* Derived from */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#334155", textTransform: "uppercase", marginBottom: 6 }}>Derived from</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {dim.derivedFrom.map((d) => (
            <div key={d} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#334155", marginTop: 6, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tier bar */}
      <TierBar tiers={dim.tiers} currentScore={!dim.isBalanceDial ? currentScore : undefined} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ScoreExplainerProps {
  emotionalSafety?: number;
  engagementResilience?: number;
  className?: string;
}

export function ScoreExplainer({
  emotionalSafety = 63,
  engagementResilience = 18,
  className,
}: ScoreExplainerProps) {
  const [activeKey, setActiveKey] = useState<ScoreKey | null>(null);

  const scores: Record<ScoreKey, number | undefined> = {
    emotional_safety: emotionalSafety,
    stress_regulation: undefined,
    engagement_resilience: engagementResilience,
  };

  const activeDim = DIMENSIONS.find((d) => d.key === activeKey);

  return (
    <div className={cn("font-sans", className)}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Emotional Insight & Early Risk</p>
            <p style={{ fontSize: 10, color: "#334155", margin: "2px 0 0" }}>Tap any score to understand what you're reading</p>
          </div>
        </div>
        <span style={{ fontSize: 11, color: "#334155" }}>Total Class</span>
      </div>

      {/* Score circles — tap to expand */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
        {DIMENSIONS.map((dim) => {
          const score = scores[dim.key];
          const isActive = activeKey === dim.key;
          const tier = score !== undefined && !dim.isBalanceDial ? getTier(score, dim.tiers) : null;
          const ringColor = tier?.color ?? "#60a5fa";

          return (
            <button
              key={dim.key}
              onClick={() => setActiveKey(isActive ? null : dim.key)}
              style={{
                background: isActive ? "rgba(99,130,220,0.08)" : "rgba(255,255,255,0.02)",
                border: isActive ? "1px solid rgba(99,130,220,0.3)" : "0.5px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "14px 8px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              {score !== undefined && !dim.isBalanceDial ? (
                <MiniRing score={score} color={ringColor} size={52} />
              ) : (
                /* Balance dial — gradient arc, no number */
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="23" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                  <circle cx="26" cy="26" r="23" fill="none" stroke="url(#balGrad)" strokeWidth="5" strokeDasharray="72 72" strokeLinecap="round" transform="rotate(-90 26 26)" />
                  <defs>
                    <linearGradient id="balGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <text x="26" y="30" textAnchor="middle" fill="#94a3b8" fontSize="16">⚖</text>
                </svg>
              )}
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 11, color: isActive ? "#94a3b8" : "#475569", margin: 0, lineHeight: 1.3 }}>
                  {dim.title.split("/").map((part, i) => <span key={i}>{part}{i < dim.title.split("/").length - 1 && "/"}<br/>
                  </span>)}
                </p>
                {tier && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: tier.color, marginTop: 3, display: "block" }}>
                    {tier.label}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 9, color: "#1e3a5f", fontWeight: 600 }}>
                {isActive ? "▲ less" : "▼ explain"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded panel */}
      {activeDim && (
        <div
          style={{
            marginTop: 8,
            background: "#0f1420",
            border: "0.5px solid rgba(99,130,220,0.25)",
            borderRadius: 12,
            overflow: "hidden",
            animation: "expandIn 0.18s ease",
          }}
        >
          <DimensionPanel dim={activeDim} currentScore={scores[activeDim.key]} />
          <div style={{ padding: "0 20px 16px" }}>
            <button
              onClick={() => setActiveKey(null)}
              style={{ fontSize: 11, color: "#334155", background: "transparent", border: "none", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}
            >
              ▲ Collapse
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes expandIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
