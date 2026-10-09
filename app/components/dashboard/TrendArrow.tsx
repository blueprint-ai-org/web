import { cn } from "~/lib/utils";

interface TrendArrowProps {
  trend: "declining" | "stable" | "improving";
}

export function TrendArrow({ trend }: TrendArrowProps) {
  const config = {
    declining: { symbol: "↓", color: "text-destructive" },
    stable: { symbol: "→", color: "text-warning" },
    improving: { symbol: "↑", color: "text-success" },
  };

  const c = config[trend] || config.stable;

  return (
    <span className={cn("font-bold text-sm", c.color)}>
      {c.symbol}
    </span>
  );
}
