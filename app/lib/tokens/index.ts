// ─────────────────────────────────────────────────────────────────────────────
// BP Core — Design Token Reference
// Source of truth for all colors, typography, radius, and shadow values.
// Import from this file everywhere — never hardcode hex/hsl values in components.
// ─────────────────────────────────────────────────────────────────────────────

// ── Colors ───────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  background:     "hsl(230 35% 14%)",   // deep navy canvas
  surface:        "hsl(217 37% 17%)",   // card / panel surface
  surfaceHover:   "hsl(216 34% 21%)",   // card hover state
  surfaceSubtle:  "hsl(217 30% 20%)",   // inset / recessed surface

  // Text
  foreground:     "hsl(214 32% 91%)",   // primary body text
  muted:          "hsl(215 20% 55%)",   // secondary / label text
  placeholder:    "hsl(215 20% 40%)",   // input placeholder

  // Border
  border:         "hsl(217 30% 25%)",   // default border
  borderSubtle:   "hsl(217 30% 20%)",   // hairline / divider

  // Primary — Violet
  primary:        "hsl(252 91% 68%)",   // #7C5CFF  — buttons, links, active states
  primaryLight:   "hsl(263 70% 73%)",   // lighter violet for highlights
  primaryBg:      "hsl(252 40% 18%)",   // violet tinted surface (selected cards)
  primaryBorder:  "hsl(252 40% 28%)",   // violet border (action bars)

  // Accent gradient  — use as CSS: `background: linear-gradient(135deg, ${colors.primary}, ${colors.accentPink})`
  accentPink:     "hsl(330 81% 71%)",   // gradient endpoint

  // Status
  success:        "hsl(160 60% 55%)",   // stable / positive / thriving
  successBg:      "hsl(160 30% 18%)",
  successBorder:  "hsl(160 30% 25%)",

  warning:        "hsl(43 96% 56%)",    // moderate / monitor
  warningBg:      "hsl(43 25% 18%)",
  warningBorder:  "hsl(43 40% 28%)",

  danger:         "hsl(0 72% 71%)",     // elevated risk / destructive
  dangerBg:       "hsl(0 25% 20%)",
  dangerBorder:   "hsl(0 25% 28%)",

  info:           "hsl(217 91% 68%)",   // informational / neutral highlight
  infoBg:         "hsl(217 40% 20%)",
  infoBorder:     "hsl(217 40% 28%)",

  // Chart accents
  chart: {
    violet: "hsl(252 91% 68%)",         // primary series
    cyan:   "hsl(187 85% 53%)",         // secondary series
    pink:   "hsl(330 81% 71%)",         // tertiary / accent
    orange: "hsl(27 96% 61%)",          // quaternary / warning series
    blue:   "hsl(217 91% 68%)",         // info series
  },

  // Blueprint palette — counselor dashboards (on bg #0B1220)
  blueprint: {
    bg:     "#0B1220",
    violet: "#7C5CFF",
    blue:   "#4DA3FF",
    mint:   "#3DD9B3",
    amber:  "#F6C453",
    coral:  "#FF7A7A",
  },
} as const;

// ── Typography ────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",

  // Font sizes (rem)
  size: {
    xs:   "0.625rem",   // 10px — labels, badges, caps
    sm:   "0.6875rem",  // 11px — secondary text, notes
    base: "0.75rem",    // 12px — body, list items
    md:   "0.8125rem",  // 13px — card titles, table rows
    lg:   "0.9375rem",  // 15px — section headings
    xl:   "1rem",       // 16px — page headings
    "2xl":"1.125rem",   // 18px — hero numbers
  },

  // Weights — DM Sans supports 100–1000
  weight: {
    light:   300,
    regular: 400,
    medium:  500,
    semibold:600,
  },

  // Letter spacing — Apple-style tight headings
  tracking: {
    tight:  "-0.02em",  // headings h1–h2
    normal: "-0.01em",  // card titles
    wide:   "0.05em",   // uppercase labels / caps
    wider:  "0.07em",   // small caps badges
  },

  // Line height
  leading: {
    tight:  1.25,
    snug:   1.4,
    normal: 1.6,
  },
} as const;

// ── Radius ────────────────────────────────────────────────────────────────────

export const radius = {
  sm:   "6px",
  base: "10px",   // 0.625rem — default for all components
  md:   "12px",
  lg:   "14px",
  full: "9999px", // pills / avatars
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────

export const shadows = {
  glass: "0 10px 30px rgba(0, 0, 0, 0.35)",
  glow:  "0 0 40px rgba(124, 92, 255, 0.25)",
  card:  "0 10px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px hsl(217 30% 25%)",
} as const;

// ── Semantic aliases (Tailwind arbitrary value shortcuts) ─────────────────────
// Use these strings directly in Tailwind classes:
//   className={`bg-[${t.bg}] text-[${t.fg}]`}

export const t = {
  // Surfaces
  bg:          colors.background,
  surf:        colors.surface,
  surfH:       colors.surfaceHover,

  // Text
  fg:          colors.foreground,
  muted:       colors.muted,

  // Border
  border:      colors.border,

  // Primary
  primary:     colors.primary,
  primaryBg:   colors.primaryBg,

  // Status
  success:     colors.success,
  successBg:   colors.successBg,
  warning:     colors.warning,
  warningBg:   colors.warningBg,
  danger:      colors.danger,
  dangerBg:    colors.dangerBg,
  info:        colors.info,
  infoBg:      colors.infoBg,

  // Charts
  chartViolet: colors.chart.violet,
  chartCyan:   colors.chart.cyan,
  chartPink:   colors.chart.pink,
  chartOrange: colors.chart.orange,
  chartBlue:   colors.chart.blue,
} as const;

// ── Status helpers ────────────────────────────────────────────────────────────
// Returns Tailwind class strings for a given risk/status level.

export type StatusLevel = "elevated" | "monitor" | "stable" | "info";

export const statusStyles: Record<StatusLevel, {
  badge: string;
  avatar: string;
  border: string;
  text: string;
}> = {
  elevated: {
    badge:  `bg-[${colors.dangerBg}]  text-[${colors.danger}]`,
    avatar: `bg-[${colors.dangerBg}]  text-[${colors.danger}]`,
    border: `border-l-[${colors.danger}]`,
    text:   `text-[${colors.danger}]`,
  },
  monitor: {
    badge:  `bg-[${colors.warningBg}] text-[${colors.warning}]`,
    avatar: `bg-[${colors.warningBg}] text-[${colors.warning}]`,
    border: `border-l-[${colors.warning}]`,
    text:   `text-[${colors.warning}]`,
  },
  stable: {
    badge:  `bg-[${colors.successBg}] text-[${colors.success}]`,
    avatar: `bg-[${colors.successBg}] text-[${colors.success}]`,
    border: `border-l-[${colors.success}]`,
    text:   `text-[${colors.success}]`,
  },
  info: {
    badge:  `bg-[${colors.infoBg}]    text-[${colors.info}]`,
    avatar: `bg-[${colors.infoBg}]    text-[${colors.info}]`,
    border: `border-l-[${colors.info}]`,
    text:   `text-[${colors.info}]`,
  },
};

// ── Vibe (room temperature) helpers ──────────────────────────────────────────

export type VibeLevel = "green" | "amber" | "red";

export const vibeStyles: Record<VibeLevel, { pill: string; dot: string }> = {
  green: {
    pill: `bg-[${colors.successBg}] text-[${colors.success}]`,
    dot:  `bg-[${colors.success}]`,
  },
  amber: {
    pill: `bg-[${colors.warningBg}] text-[${colors.warning}]`,
    dot:  `bg-[${colors.warning}]`,
  },
  red: {
    pill: `bg-[${colors.dangerBg}] text-[${colors.danger}]`,
    dot:  `bg-[${colors.danger}]`,
  },
};

// ── Gradient ──────────────────────────────────────────────────────────────────

export const gradients = {
  primaryAccent: `linear-gradient(135deg, ${colors.primary}, ${colors.accentPink})`,
  violetGlow:    `radial-gradient(ellipse at top, hsl(252 91% 68% / 0.15), transparent 60%)`,
} as const;

// ── Chart defaults (pass into Recharts) ───────────────────────────────────────

export const chartDefaults = {
  tooltip: {
    backgroundColor: colors.surface,
    borderColor:     colors.border,
    borderWidth:     1,
    titleColor:      colors.foreground,
    bodyColor:       colors.muted,
    titleStyle:      { fontFamily: typography.fontFamily, fontSize: 12 },
    bodyStyle:       { fontFamily: typography.fontFamily, fontSize: 11 },
  },
  axis: {
    tick:   { fill: colors.muted, fontSize: 11, fontFamily: typography.fontFamily },
    grid:   { stroke: "hsl(217 30% 20%)" },
    cursor: { fill: "hsl(217 30% 22%)" },
  },
} as const;
