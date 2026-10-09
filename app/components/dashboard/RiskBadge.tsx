import { cn } from "~/lib/utils";

interface RiskBadgeProps {
  level: "urgent" | "elevated" | "moderate" | "monitor";
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const config = {
    urgent: { bg: "bg-destructive-dim", text: "text-destructive", label: "URGENT" },
    elevated: { bg: "bg-destructive-dim", text: "text-destructive", label: "NEEDS SUPPORT" },
    moderate: { bg: "bg-warning-dim", text: "text-warning", label: "SOME CONCERN" },
    monitor: { bg: "bg-success-dim", text: "text-success", label: "DOING OK" },
  };

  const c = config[level] || config.monitor;

  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide whitespace-nowrap",
      c.bg, c.text
    )}>
      {c.label}
    </span>
  );
}
