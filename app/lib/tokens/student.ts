// ─────────────────────────────────────────────────────────────────────────────
// BP Core — Student Design Token Reference
//
// Source of truth for the Student persona: colors, typography, radius, spacing,
// shadows. Mirrors the shape of `~/lib/tokens` (the adult/staff SoT) but with
// Figma values from "Blueprint Hand-off" node 433-3956.
//
// JS values are concrete hex strings (not `var(...)`) so canvas-rendered
// charts and inline `style={{ … }}` work without resolving CSS custom
// properties at runtime.
//
// CSS-utility equivalents live in `app/app.css` `@theme` (token names follow
// `--color-student-*`). Keep both in sync — Tailwind utilities consume the
// CSS vars, while React inline styles / SVG fills / ECharts read these.
// ─────────────────────────────────────────────────────────────────────────────

// ── Colors ───────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces & text
  bg:             "#1f1f25",      // Colors/Neutral/Warm/1100 — page bg
  surface:        "#2f2f37",      // Blueprint/Gray/500 — elevated card on dark bg
  surfaceCream:   "#f2f3e5",      // Colors/Neutral/Warm/50 — cream button / hero
  surfaceInverse: "#0f0f0f",      // Dynamic/Fill/Inverse — deepest surface
  fillSecondary:  "rgba(255, 255, 255, 0.16)", // #ffffff29
  foreground:     "#ffffff",      // Labels/Primary - Dark
  muted:          "#a4a59f",      // Blueprint/Gray/100
  onPrimary:      "#1f1f25",      // text on cream button
  onSecondary:    "#ededed",
  border:         "#36363f",      // Blueprint/Gray/400

  // Category accents (mood/check-in/journal/sleep rail + sparks)
  mood:    "#b38aff",             // Blueprint/Purple/400
  survey:  "#49aee1",             // Blueprint/Light blue/400
  journal: "#58b880",             // Blueprint/Green/300
  sleep:   "#b8c0ed",             // Blueprint/Dark blue/300
  accent:  "#ffbb25",             // Blueprint/Light Orange/400

  // Blueprint vivid stops — full palette
  blueprint: {
    purple:      { 300: "#c4a3ff", 400: "#b38aff", 500: "#7040c8" },
    coral:       { 100: "#fce8e1", 200: "#f3beaf", 400: "#e65800", 700: "#a83a00", 900: "#541d00" },
    pink:        { 400: "#e768b0" },
    orange:      { 400: "#f08b31" },
    lightOrange: { 100: "#fff4d6", 400: "#ffbb25", 700: "#b87810", 900: "#5c3b08" },
    yellow:      { 400: "#fdda3c" },
    green:       { 100: "#d1edd9", 300: "#58b880", 400: "#219653", 700: "#136534", 900: "#1a5e36" },
    lightBlue:   { 100: "#e3f4fc", 300: "#88c9eb", 400: "#49aee1", 700: "#2479a8", 900: "#0f3d57" },
    darkBlue:    { 200: "#cbd1f5", 300: "#b8c0ed", 400: "#3f50b8", 500: "#384078" },
    gray:        { 100: "#a4a59f", 300: "#444450", 400: "#36363f", 500: "#2f2f37", 600: "#2b2b32" },
  },

  // Edge / hairline overlays (replaces `border-white/{5,10,60}` patterns)
  edge: {
    low:    "rgba(255, 255, 255, 0.05)",
    medium: "rgba(255, 255, 255, 0.10)",
    strong: "rgba(255, 255, 255, 0.60)",
  },

  // Image overlays
  scrim:   "rgba(0, 0, 0, 0.30)",
  onImage: "rgba(255, 255, 255, 0.90)",

  // Success state (watched/done badges)
  success:       "#58b880",
  successMuted:  "rgba(88, 184, 128, 0.20)",

  // Donate flow palette (DonateSparksModal — beyond the M5 locked map)
  accentLight:        "#ffd97a",
  danger:             "#ff9a9a",
  charityMusic:       "#ff6b6b",
  charityMentor:      "#5aa9ff",
  charityOpportunity: "#5fd6a3",
} as const;

// ── Gradients ─────────────────────────────────────────────────────────────────

export const gradients = {
  // Brand-warm — sparks accent → pink → orange. Mirrors `--gradient-student-warm`.
  warm: "linear-gradient(to right, #ffbb25, #e768b0, #f08b31)",
} as const;

// ── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  // Families — display is Anton (Google OFL); body is Barlow (Google OFL) with
  // an Inter / system fallback. Both Google fonts are loaded in `app/root.tsx`.
  display: '"Anton", "Bebas Neue", "Oswald", ui-sans-serif, system-ui, sans-serif',
  body:    '"Barlow", "Inter", ui-sans-serif, system-ui, sans-serif',

  // Sizes (px) — Figma "Font/Size/*" tokens
  size: {
    250: 10,
    300: 12,
    400: 16,
    500: 20,
    600: 24,
    800: 32,
    // Display sizes used by hero titles
    displayMd: 64,
    displayLg: 80,
  },

  // Weights — Anton ships only weight 400 but Figma maps "Title" to weight 520;
  // browsers will snap to the nearest available weight (400). DIN Alternate
  // bold = 700.
  weight: {
    body:    480,
    bold:    700,
    display: 520,
  },

  // Letter spacing (px)
  tracking: {
    tight200: -0.8,
    tight100: -0.4,
    tight25:  -0.1,
    normal:    0,
    wide25:   +0.1,
  },

  // Line heights (px for fixed, multiplier for display)
  leading: {
    tight:     16,
    normal:    20,
    snug:      22,
    loose:     40,
    displayMd: 1.12,
    displayLg: 1.06,
  },
} as const;

// ── Radius ───────────────────────────────────────────────────────────────────

export const radius = {
  sm:   6,
  base: 10,
  md:   12,
  lg:   14,
  pill: 9999,
} as const;

// ── Spacing — Figma `Gap/*` tokens ───────────────────────────────────────────

export const gap = {
  0: 0,
  2: 2,
  4: 6,
  9: 16,
} as const;

// ── Control & form sizes (Figma `Components/Control/*`, `Components/Forms/*`) ─

export const controlSize = {
  small:   16,
  medium:  20,
  xxlarge: 32,
} as const;

export const formSize = {
  small: 32,
  large: 48,
} as const;

// ── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  control: "0 1px 1px rgba(20, 21, 26, 0.03)",
  elevationMedium: [
    "0 1px 0 0 rgba(0, 0, 0, 0.08)",
    "0 8px 24px 0 rgba(0, 0, 0, 0.07)",
    "0 4px 4px 0 rgba(0, 0, 0, 0.05)",
    "0 2px 2px 0 rgba(0, 0, 0, 0.04)",
    "0 1px 1px 0 rgba(0, 0, 0, 0.03)",
    "0 0 0 1px rgba(0, 0, 0, 0.08)",
  ].join(", "),
} as const;

// ── Category helper — quick lookup for dashboard rail colors ─────────────────

export type StudentCategory = "mood" | "survey" | "journal" | "sleep";

export const categoryColor: Record<StudentCategory, string> = {
  mood:    colors.mood,
  survey:  colors.survey,
  journal: colors.journal,
  sleep:   colors.sleep,
};
