import { use, init, graphic } from "echarts/core";
import {
  LineChart,
  BarChart,
  RadarChart,
  ScatterChart,
} from "echarts/charts";
import {
  GridComponent,
  PolarComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

import { ClientOnly } from "~/components/ClientOnly";
import { baseOption, type ThemeMode } from "./base-option";

// ── Echarts tree-shaken registration (runs once at module load) ─────────────
//
// Funnel every echarts module import through THIS file. Individual chart
// components never import from `echarts/*` directly — they only render
// <ChartCanvas option={…} />.
use([
  LineChart,
  BarChart,
  RadarChart,
  ScatterChart,
  GridComponent,
  PolarComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

// Re-export `graphic` + `init` so chart authors can build gradients without
// adding another `echarts/core` import in component files.
export { graphic, init };

// `defineOption` is an identity helper that gives call sites full
// `EChartsOption` typing without forcing them to import the type.
export function defineOption(option: EChartsOption): EChartsOption {
  return option;
}

// ── Deep merge (simple) ─────────────────────────────────────────────────────
//
// echarts itself ships a `zrUtil.merge` but using a local helper keeps the
// dependency surface narrow.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Local deep-merge: replaces arrays wholesale (matches notMerge: true); avoids pulling in zrUtil.
function deepMerge<T>(base: T, override: T): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override ?? base) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const a = (base as Record<string, unknown>)[key];
    const b = (override as Record<string, unknown>)[key];
    if (isPlainObject(a) && isPlainObject(b)) {
      out[key] = deepMerge(a, b);
    } else {
      out[key] = b;
    }
  }
  return out as T;
}

// ── ChartCanvas ─────────────────────────────────────────────────────────────

export interface ChartCanvasProps {
  option: EChartsOption;
  height?: number | string;
  themeMode?: ThemeMode;
  className?: string;
}

/**
 * Renders an echarts chart with the shared base option preset merged in.
 *
 * SSR-safe: the actual <ReactECharts> mount happens inside <ClientOnly>,
 * so server renders emit a skeleton fallback rather than chart DOM.
 */
export function ChartCanvas({
  option,
  height = 220,
  themeMode = "dark",
  className,
}: ChartCanvasProps) {
  const merged = useMemo(
    () => deepMerge(baseOption(themeMode), option),
    [option, themeMode],
  );

  return (
    <ClientOnly
      fallback={
        <div
          className="animate-pulse bg-card rounded-lg"
          style={{ height, width: "100%" }}
        />
      }
    >
      <ReactECharts
        option={merged}
        style={{ height, width: "100%" }}
        notMerge
        lazyUpdate
        className={className}
      />
    </ClientOnly>
  );
}
