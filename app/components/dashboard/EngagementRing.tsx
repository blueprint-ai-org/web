interface EngagementRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  gradientId?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function EngagementRing({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  gradientId = "engagement-gradient",
  gradientFrom = "#7C5CFF",
  gradientTo = "#4DA3FF",
}: EngagementRingProps) {
  const radius = size / 2;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={size} width={size} className="-rotate-90">
        <circle
          stroke="rgba(255,255,255,0.06)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={`url(#${gradientId})`}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease-out" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
      </svg>
      {label !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-2xl font-semibold tracking-tight text-white">{value}</span>
          {label && <span className="text-[10px] text-blueprint-muted mt-0.5">{label}</span>}
        </div>
      )}
    </div>
  );
}
