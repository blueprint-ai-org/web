import {
  sleepData,
  engagementData,
  gradeTrajectoryData,
  effortPatternsData,
  environmentalContext,
  disengagementIndicators,
  sociologicalPatterns,
} from "~/lib/dashboard-data";
import { MoodBaselineChart, AttendanceChart } from "~/components/dashboard/BaselineCharts";
import { TrendArrow } from "../TrendArrow";
import { PreventionGrowthCard } from "../PreventionGrowthCard";
import { cn } from "~/lib/utils";
import { ChartCanvas, graphic } from "~/lib/echarts/ChartCanvas";
import { colors } from "~/lib/tokens";

// Echarts replaces recharts + chart.js entirely. All chart subtrees mount
// through <ChartCanvas>, which already provides <ClientOnly> SSR guarding.

// Chart palette — concrete hsl strings from tokens.ts. ECharts paints on
// canvas and cannot resolve `var(--...)`; passing a CSS variable string
// would render as black.
const C = {
  primary: colors.primary,
  primaryDim: "hsl(252 91% 68% / 0.7)",
  success: colors.success,
  destructive: colors.danger,
  warning: colors.warning,
  muted: colors.muted,
  border: colors.border,
  surface: colors.surface,
  card: colors.surface,
  chartCyan: colors.chart.cyan,
  chartPink: colors.chart.pink,
  foreground: colors.foreground,
} as const;

export function StudentWellbeing() {
  // ── Sleep bar chart ──────────────────────────────────────────────────────
  const sleepOption = {
    grid: { left: 30, right: 8, top: 8, bottom: 24, containLabel: false },
    xAxis: {
      type: "category" as const,
      data: sleepData.map((d) => d.day),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 11 },
    },
    yAxis: {
      type: "value" as const,
      min: 0,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.muted, fontSize: 10 },
    },
    series: [
      {
        name: "Hours",
        type: "bar" as const,
        data: sleepData.map((d) => d.hours),
        itemStyle: {
          color: C.chartCyan,
          opacity: 0.7,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  // ── Grade trajectory area chart ──────────────────────────────────────────
  const gradeOption = {
    grid: { left: 30, right: 14, top: 8, bottom: 24, containLabel: false },
    xAxis: {
      type: "category" as const,
      data: gradeTrajectoryData.map((d) => d.month),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 11 },
    },
    yAxis: {
      type: "value" as const,
      min: 2.0,
      max: 4.0,
      interval: 0.5,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.muted, fontSize: 10 },
    },
    series: [
      {
        name: "Actual GPA",
        type: "line" as const,
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        data: gradeTrajectoryData.map((d) => d.gpa),
        lineStyle: { color: C.chartPink, width: 2.5 },
        itemStyle: { color: C.chartPink, borderColor: C.surface, borderWidth: 2 },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "hsla(330, 81%, 71%, 0.25)" },
            { offset: 1, color: "hsla(330, 81%, 71%, 0.02)" },
          ]),
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: C.muted, type: "dashed", width: 1 },
          data: [
            {
              yAxis: 3.5,
              label: {
                formatter: "Expected 3.5",
                position: "end",
                color: C.muted,
                fontSize: 9,
              },
            },
          ],
        },
      },
    ],
  };

  // ── Effort patterns horizontal bar chart ─────────────────────────────────
  const effortOption = {
    grid: { left: 56, right: 10, top: 8, bottom: 22, containLabel: false },
    xAxis: {
      type: "value" as const,
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.muted, fontSize: 10 },
    },
    yAxis: {
      type: "category" as const,
      data: effortPatternsData.map((d) => d.subject),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 10 },
    },
    series: [
      {
        name: "Effort",
        type: "bar" as const,
        barWidth: 6,
        data: effortPatternsData.map((d) => d.effort),
        itemStyle: { color: C.primary, borderRadius: [0, 4, 4, 0] },
      },
      {
        name: "Completion",
        type: "bar" as const,
        barWidth: 6,
        data: effortPatternsData.map((d) => d.completion),
        itemStyle: { color: C.success, borderRadius: [0, 4, 4, 0] },
      },
      {
        name: "Participation",
        type: "bar" as const,
        barWidth: 6,
        data: effortPatternsData.map((d) => d.participation),
        itemStyle: { color: C.chartCyan, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };

  // ── Sociological radar ───────────────────────────────────────────────────
  const radarOption = {
    radar: {
      indicator: sociologicalPatterns.map((p) => ({ name: p.pattern, max: 100 })),
      splitLine: { lineStyle: { color: C.border } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: C.border } },
      axisName: { color: C.muted, fontSize: 8 },
    },
    series: [
      {
        type: "radar" as const,
        data: [
          {
            name: "Current",
            value: sociologicalPatterns.map((p) => p.current),
            lineStyle: { color: C.primary, width: 2 },
            areaStyle: { color: "hsla(252, 91%, 68%, 0.25)" },
            itemStyle: { color: C.primary },
          },
          {
            name: "Previous",
            value: sociologicalPatterns.map((p) => p.previous),
            lineStyle: { color: C.muted, width: 1, type: "dashed" as const },
            areaStyle: { color: "transparent" },
            itemStyle: { color: C.muted },
          },
        ],
      },
    ],
  };

  // ── Engagement multi-line chart ──────────────────────────────────────────
  const engagementOption = {
    grid: { left: 32, right: 10, top: 8, bottom: 24, containLabel: false },
    xAxis: {
      type: "category" as const,
      data: engagementData.map((d) => d.week),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 11 },
    },
    yAxis: {
      type: "value" as const,
      min: 30,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.muted, fontSize: 10 },
    },
    series: [
      {
        name: "Login Frequency",
        type: "line" as const,
        smooth: true,
        data: engagementData.map((d) => d.login),
        lineStyle: { color: C.primary, width: 2 },
        itemStyle: { color: C.primary },
        symbol: "circle",
        symbolSize: 6,
      },
      {
        name: "Assignment Completion",
        type: "line" as const,
        smooth: true,
        data: engagementData.map((d) => d.assignment),
        lineStyle: { color: C.success, width: 2 },
        itemStyle: { color: C.success },
        symbol: "circle",
        symbolSize: 6,
      },
      {
        name: "Participation",
        type: "line" as const,
        smooth: true,
        data: engagementData.map((d) => d.participation),
        lineStyle: { color: C.chartPink, width: 2 },
        itemStyle: { color: C.chartPink },
        symbol: "circle",
        symbolSize: 6,
      },
    ],
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Mood Baseline & Volatility */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <MoodBaselineChart
          data={[71, 66, 59, 56, 53, 61, 67]}
          labels={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]}
          baseline={72}
          deviationThreshold={10}
        />
      </div>

      {/* Sleep Trend */}
      <div className="bg-surface rounded-xl border border-border p-4 flex flex-col">
        <div className="text-sm font-bold text-foreground mb-1">Sleep Trend Delta</div>
        <div className="text-[11px] text-muted-foreground mb-3">Hours of sleep and quality score</div>
        <div className="flex-1 min-h-0">
          <ChartCanvas height={200} option={sleepOption} />
        </div>
      </div>

      {/* Attendance & Variability */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <AttendanceChart
          attendance={[98, 94, 88, 82, 79, 72]}
          variability={[6, 8, 14, 20, 24, 29]}
          labels={["Wk 1","Wk 2","Wk 3","Wk 4","Wk 5","Wk 6"]}
          thresholdPct={90}
        />
      </div>

      {/* Grade Trajectory */}
      <div className="bg-surface rounded-xl border border-border p-4 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold text-foreground">Grade Trajectory & Performance</div>
          <div className="text-[10px] text-destructive font-semibold">↓ 1.0 GPA drop since Sep</div>
        </div>
        <div className="text-[11px] text-muted-foreground mb-3">GPA trend vs expected baseline (3.5)</div>
        <div className="flex-1 min-h-0">
          <ChartCanvas height={200} option={gradeOption} />
        </div>
        <div className="mt-2 p-2 bg-destructive/8 border border-destructive/15 rounded-lg">
          <div className="text-[10px] text-destructive font-semibold">⚠️ Consistent decline — GPA dropped from 3.6 to 2.6 over 6 months. Correlates with engagement and attendance patterns.</div>
        </div>
      </div>

      {/* Engagement & Effort Patterns */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="text-sm font-bold text-foreground mb-1">Engagement & Effort Patterns</div>
        <div className="text-[11px] text-muted-foreground mb-3">Subject-level effort, completion & participation</div>
        <ChartCanvas height={180} option={effortOption} />
      </div>

      {/* Environmental Context */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="text-sm font-bold text-foreground mb-1">Environmental & Location Context</div>
        <div className="text-[11px] text-muted-foreground mb-3">Contextual factors influencing wellbeing</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Setting", value: environmentalContext.setting, icon: "🏙️" },
            { label: "School Size", value: environmentalContext.schoolSize, icon: "🏫" },
            { label: "Class Size", value: `${environmentalContext.classSize} students`, icon: "👥" },
            { label: "Transit Time", value: environmentalContext.transitTime, icon: "🚌" },
          ].map((item, i) => (
            <div key={i} className="bg-card rounded-lg p-2.5 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{item.icon}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</span>
              </div>
              <div className="text-xs font-semibold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-card rounded-lg p-2.5 border border-border">
            <div className="text-[10px] text-muted-foreground mb-1">Resource Access</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-border rounded-full">
                <div className="h-full bg-primary rounded-full" style={{ width: `${environmentalContext.resourceAccess}%` }} />
              </div>
              <span className="text-xs font-bold text-foreground">{environmentalContext.resourceAccess}%</span>
            </div>
          </div>
          <div className="bg-card rounded-lg p-2.5 border border-border">
            <div className="text-[10px] text-muted-foreground mb-1">Community Support</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-border rounded-full">
                <div className="h-full bg-success rounded-full" style={{ width: `${environmentalContext.communitySupport}%` }} />
              </div>
              <span className="text-xs font-bold text-foreground">{environmentalContext.communitySupport}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disengagement & Dissociation Indicators */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="text-sm font-bold text-foreground mb-1">Disengagement & Dissociation Indicators</div>
        <div className="text-[11px] text-muted-foreground mb-3">Behavioral signals of withdrawal patterns</div>
        <div className="space-y-2.5">
          {disengagementIndicators.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-[100px] text-xs text-foreground truncate">{item.indicator}</div>
              <div className="flex-1 h-2 bg-border rounded-full relative">
                <div
                  className="absolute top-0 h-full bg-muted-foreground/30 rounded-full"
                  style={{ width: `${item.baseline}%` }}
                />
                <div
                  className={cn(
                    "absolute top-0 h-full rounded-full",
                    item.trend === "declining" ? "bg-destructive" : "bg-warning"
                  )}
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <div className="flex items-center gap-1 w-[60px]">
                <TrendArrow trend={item.trend === "declining" ? "declining" : item.trend === "increasing" ? "improving" : "stable"} />
                <span className="text-[11px] font-semibold text-muted-foreground">{item.value}%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-card rounded-lg border border-destructive/30">
          <div className="text-[10px] text-destructive font-semibold mb-1">⚠️ Alert</div>
          <div className="text-[11px] text-muted-foreground">Multiple disengagement signals detected. Help-seeking behavior significantly below baseline.</div>
        </div>
      </div>

      {/* Sociological Behaviors & Patterns */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="text-sm font-bold text-foreground mb-1">Sociological Behaviors & Patterns</div>
        <div className="text-[11px] text-muted-foreground mb-3">Social movement and interaction patterns</div>
        <div className="grid grid-cols-2 gap-3">
          <ChartCanvas height={140} option={radarOption} />
          <div className="space-y-1.5">
            {sociologicalPatterns.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground truncate flex-1">{item.pattern}</span>
                <span className={cn(
                  "font-semibold",
                  item.change < 0 ? "text-destructive" : "text-success"
                )}>
                  {item.change > 0 ? "+" : ""}{item.change}%
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <div className="text-[10px] text-warning font-semibold">Social Isolation Risk</div>
              <div className="text-[10px] text-muted-foreground">Peer network shrinkage detected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Trend - Full Width */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="text-sm font-bold text-foreground mb-1">Engagement Trend Delta</div>
        <div className="text-[11px] text-muted-foreground mb-3">6-week engagement trajectory across dimensions</div>
        <ChartCanvas height={200} option={engagementOption} />
      </div>

      {/* Prevention & Growth */}
      <PreventionGrowthCard />
    </div>
  );
}
