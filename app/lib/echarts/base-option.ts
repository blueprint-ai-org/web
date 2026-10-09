import type { EChartsOption } from "echarts";
import { colors, typography } from "~/lib/tokens";

export type ThemeMode = "dark" | "light";

/**
 * Returns the shared chart chrome (text colors, axis styling, tooltip).
 * Charts merge this with their own `series`/`xAxis`/`yAxis` etc.
 *
 * Source of truth is `~/lib/tokens`. The token export is `colors.surface`
 * (not `colors.card`) — that's intentional, the prototype's
 * `brandingGuidelines.ts` used "surface" naming.
 */
export function baseOption(_mode: ThemeMode = "dark"): EChartsOption {
  return {
    textStyle: {
      fontFamily: typography.fontFamily,
      color: colors.foreground,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      textStyle: {
        color: colors.foreground,
        fontFamily: typography.fontFamily,
        fontSize: 12,
      },
    },
    grid: {
      left: 8,
      right: 12,
      top: 16,
      bottom: 24,
      containLabel: true,
    },
    xAxis: {
      axisLine: { lineStyle: { color: colors.border } },
      axisTick: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.muted, fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      axisLine: { lineStyle: { color: colors.border } },
      axisTick: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
  };
}
