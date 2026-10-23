import { cn } from "~/lib/utils";
import type { RiskTone } from "~/lib/watchlist";

interface RiskBadgeProps {
  level: RiskTone;
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const config: Record<RiskTone, { bg: string; text: string; label: string }> = {
    urgent: { bg: "bg-destructive-dim", text: "text-destructive", label: "URGENT" },
    elevated: { bg: "bg-destructive-dim", text: "text-destructive", label: "NEEDS SUPPORT" },
    moderate: { bg: "bg-warning-dim", text: "text-warning", label: "SOME CONCERN" },
    monitor: { bg: "bg-success-dim", text: "text-success", label: "DOING OK" },
  };

  const c = config[level];

  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide whitespace-nowrap",
      c.bg, c.text
    )}>
      {c.label}
    </span>
  );
}
