import { cn } from "~/lib/utils";

// Mock data based on GrowthFeedbackEngine types
interface RecommendedSupport {
  icon: string;
  title: string;
  description: string;
  reason: string;
  frequency: string;
  category: string;
  is_active: boolean;
  efficacy_score: number | null;
}

interface RecoveryMetric {
  dimension: string;
  recovery_pct: number;
  is_fully_recovered: boolean;
}

interface GrowthFeedbackCardProps {
  className?: string;
}

export function GrowthFeedbackCard({ className }: GrowthFeedbackCardProps) {
  // Mock growth assessment data
  const phase = "building_momentum";
  const phaseDays = 14;
  const momentum = {
    composite: 67,
    sustainability: 58,
    fragility: 42,
  };

  const recommendedSupports: RecommendedSupport[] = [
    {
      icon: "🎵",
      title: "Listen to music",
      description: "Music as instant stress regulation.",
      reason: "Used 2 times for instant stress relief.",
      frequency: "As needed",
      category: "creative",
      is_active: false,
      efficacy_score: 60
    },
    {
      icon: "🧘",
      title: "Meditative breathing",
      description: "Short mindfulness practice to sustain mood stability.",
      reason: "Mindfulness shown to reduce mood volatility by 35%.",
      frequency: "Daily (5 min)",
      category: "mindfulness",
      is_active: true,
      efficacy_score: 74
    },
    {
      icon: "🌙",
      title: "Regular bedtime practice",
      description: "Consistent sleep/wake schedule.",
      reason: "Sleep consistency amplifies recovery.",
      frequency: "Daily",
      category: "routine",
      is_active: false,
      efficacy_score: 82
    },
  ];

  const recoveryMetrics: RecoveryMetric[] = [
    { dimension: "mood", recovery_pct: 72, is_fully_recovered: false },
    { dimension: "sleep", recovery_pct: 89, is_fully_recovered: false },
    { dimension: "engagement", recovery_pct: 45, is_fully_recovered: false },
  ];

  const nextMilestone = "🎯 Next: 21 days — the habit formation threshold.";
  const regressionRisk = { level: "watch", score: 32 };

  const phaseLabels: Record<string, { label: string; color: string }> = {
    crisis_recovery: { label: "Crisis Recovery", color: "text-destructive" },
    early_rebound: { label: "Early Rebound", color: "text-warning" },
    building_momentum: { label: "Building Momentum", color: "text-primary" },
    sustained_growth: { label: "Sustained Growth", color: "text-success" },
    thriving: { label: "Thriving", color: "text-success" },
    plateau: { label: "Plateau", color: "text-muted-foreground" },
    fragile_gain: { label: "Fragile Gain", color: "text-warning" },
  };

  const currentPhase = phaseLabels[phase] || phaseLabels.plateau;

  return (
    <div className={cn("bg-surface rounded-xl border border-border p-4", className)}>
      {/* Header with Phase & Momentum */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-foreground">Prevention & Growth</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xs font-semibold", currentPhase.color)}>
              {currentPhase.label}
            </span>
            <span className="text-[10px] text-muted-foreground">• Day {phaseDays}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Momentum Mini Gauge */}
          <div className="flex flex-col items-center">
            <div className="relative w-10 h-10">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                <circle
                  cx="20" cy="20" r="16"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeDasharray={`${momentum.composite * 1.005} 100.5`}
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="text-[11px] font-bold text-foreground">{momentum.composite}</span>
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5">Momentum</span>
          </div>
          {/* Regression Risk Indicator */}
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2",
              regressionRisk.level === "low" && "border-success/50 bg-success/10",
              regressionRisk.level === "watch" && "border-warning/50 bg-warning/10",
              regressionRisk.level === "caution" && "border-chart-orange/50 bg-chart-orange/10",
              regressionRisk.level === "warning" && "border-destructive/50 bg-destructive/10"
            )}>
              <span className={cn(
                "text-[11px] font-bold",
                regressionRisk.level === "low" && "text-success",
                regressionRisk.level === "watch" && "text-warning",
                regressionRisk.level === "caution" && "text-chart-orange",
                regressionRisk.level === "warning" && "text-destructive"
              )}>{regressionRisk.score}</span>
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5">Risk</span>
          </div>
        </div>
      </div>

      {/* Recovery Metrics */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs">📈</span>
          <span className="text-xs font-semibold text-foreground">Recovery Progress</span>
        </div>
        <div className="space-y-2">
          {recoveryMetrics.map((metric, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-20 capitalize">{metric.dimension}</span>
              <div className="flex-1 h-1.5 bg-border rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    metric.recovery_pct >= 80 ? "bg-success" :
                    metric.recovery_pct >= 50 ? "bg-primary" : "bg-warning"
                  )}
                  style={{ width: `${Math.min(100, metric.recovery_pct)}%` }}
                />
              </div>
              <span className={cn(
                "text-[11px] font-semibold w-10 text-right",
                metric.is_fully_recovered ? "text-success" : "text-foreground"
              )}>
                {metric.recovery_pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Supports */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs">📋</span>
          <span className="text-xs font-semibold text-foreground">Recommended Supports</span>
          <span className="text-[10px] text-muted-foreground ml-auto">›</span>
        </div>

        <div className="space-y-1.5">
          {recommendedSupports.map((support, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-md bg-card/50 border border-border/50">
              <div className={cn(
                "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] mt-0.5 flex-shrink-0",
                support.is_active
                  ? "bg-success/20 border-success text-success"
                  : "border-border text-muted-foreground"
              )}>
                {support.is_active ? "✓" : ""}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{support.icon}</span>
                  <span className="text-xs font-medium text-foreground">{support.title}</span>
                  {support.efficacy_score && (
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {support.efficacy_score}% eff.
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{support.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvement Note */}
      <div className="bg-card rounded-md px-2.5 py-2 mb-3 border border-border/50">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">✨</span>
          <span className="text-[10px] text-muted-foreground">
            Regular bedtime practice improved last Thursday
          </span>
        </div>
      </div>

      {/* Next Milestone */}
      <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
        <span className="text-xs text-foreground">{nextMilestone}</span>
      </div>

      {/* Sustainability / Fragility Bar */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">Fragility</span>
        <div className="flex-1 h-1.5 bg-border rounded-full">
          <div
            className="h-full bg-gradient-to-r from-success via-warning to-destructive rounded-full"
            style={{ width: `${momentum.fragility}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-warning">{momentum.fragility}%</span>
      </div>
    </div>
  );
}
