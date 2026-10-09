import { cn } from "~/lib/utils";

interface PreventionGrowthCardProps {
  className?: string;
  showTierLabel?: boolean;
}

export function PreventionGrowthCard({ className, showTierLabel = true }: PreventionGrowthCardProps) {
  const recommendedSupports = [
    { icon: "🎵", label: "Listen to music", detail: "Instant stress 2 times", checked: false },
    { icon: "🧘", label: "Meditative breathing", detail: "", checked: true },
  ];

  return (
    <div className={cn("bg-surface rounded-xl border border-border p-4", className)}>
      <div className="text-sm font-bold text-foreground mb-3">
        {showTierLabel && <span className="text-primary">Tier 3. </span>}Prevention & Growth
      </div>

      {/* Recommended Supports */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs">📋</span>
          <span className="text-xs font-semibold text-foreground">Recommended Supports</span>
          <span className="text-[10px] text-muted-foreground ml-auto">›</span>
        </div>

        <div className="space-y-1.5 pl-1">
          {recommendedSupports.map((support, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center text-[8px]",
                support.checked
                  ? "bg-success/20 border-success text-success"
                  : "border-border text-muted-foreground"
              )}>
                {support.checked ? "✓" : ""}
              </div>
              <span className="text-xs text-foreground">{support.icon} {support.label}.</span>
              {support.detail && (
                <span className="text-[10px] text-muted-foreground">{support.detail}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Improvement Note */}
      <div className="bg-card rounded-md px-2.5 py-1.5 mb-3 border border-border/50">
        <span className="text-[10px] text-muted-foreground">
          Regular bedtime practice improved last Thursday
        </span>
        <span className="text-[10px] text-muted-foreground ml-1">∨</span>
      </div>

      {/* Recovery Time */}
      <div className="flex items-center gap-2">
        <span className="text-xs">📈</span>
        <span className="text-xs text-foreground">Recovery time</span>
        <span className="text-xs font-semibold text-destructive">-32%</span>
        <div className="flex-1 h-1.5 bg-border rounded-full mx-1 max-w-[60px]">
          <div className="h-full w-[65%] bg-gradient-to-r from-chart-cyan to-primary rounded-full" />
        </div>
        <span className="text-xs font-semibold text-success">+19%</span>
      </div>
    </div>
  );
}
