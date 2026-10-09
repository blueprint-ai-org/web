import { useState } from "react";
import { cn } from "~/lib/utils";
import { ChartCanvas, graphic, defineOption } from "~/lib/echarts/ChartCanvas";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviationAlert {
  severity: "critical" | "warning" | "positive";
  label: string;
  description: string;
}

interface MoodBaselineChartProps {
  data: number[];           // 7 daily mood scores
  labels: string[];         // ["Mon","Tue",...] — must match data length
  baseline: number;         // personal baseline score
  deviationThreshold?: number; // points below baseline to flag (default 10)
  className?: string;
}

interface AttendanceChartProps {
  attendance: number[];     // weekly attendance % per week
  variability: number[];    // variability index per week
  labels: string[];         // ["Wk 1","Wk 2",...]
  thresholdPct?: number;    // district threshold (default 90)
  className?: string;
}

// ─── Deviation Detection ──────────────────────────────────────────────────────

function detectMoodDeviations(
  data: number[],
  labels: string[],
  baseline: number,
  threshold: number
): DeviationAlert[] {
  const alerts: DeviationAlert[] = [];

  // Find sustained dips below baseline - threshold
  let dipStart = -1;
  let dipEnd = -1;
  let lowestVal = Infinity;
  let lowestDay = "";

  for (let i = 0; i < data.length; i++) {
    const diff = data[i] - baseline;
    if (diff < -threshold) {
      if (dipStart === -1) dipStart = i;
      dipEnd = i;
      if (data[i] < lowestVal) {
        lowestVal = data[i];
        lowestDay = labels[i];
      }
    }
  }

  if (dipStart !== -1) {
    const days = dipEnd - dipStart + 1;
    const drop = Math.round(baseline - lowestVal);
    alerts.push({
      severity: drop > 15 ? "critical" : "warning",
      label: `Significant dip — ${labels[dipStart]}${dipEnd > dipStart ? ` to ${labels[dipEnd]}` : ""}`,
      description: `Mood dropped ${drop} points below personal baseline (${baseline} → ${Math.round(lowestVal)}). ${days >= 3 ? `Sustained ${days}-day deviation exceeds threshold.` : "Single-day deviation — monitor closely."}`,
    });
  }

  // Detect recovery (last 2 points trending up after a dip)
  const last = data[data.length - 1];
  const secondLast = data[data.length - 2];
  if (dipEnd !== -1 && last > secondLast && last > lowestVal + 5) {
    alerts.push({
      severity: "positive",
      label: `Recovery trend — ${labels[data.length - 1]} rebound`,
      description: `Score climbing from low of ${Math.round(lowestVal)} toward baseline. Positive trajectory — continue monitoring.`,
    });
  }

  // Mild opening flag
  const openingDiff = data[0] - baseline;
  if (openingDiff < 0 && openingDiff > -threshold) {
    alerts.push({
      severity: "warning",
      label: `Mild deviation — ${labels[0]}`,
      description: `Opening score ${Math.abs(Math.round(openingDiff))} points below baseline. Worth monitoring if pattern continues.`,
    });
  }

  return alerts;
}

function detectAttendanceDeviations(
  attendance: number[],
  variability: number[],
  labels: string[],
  threshold: number
): DeviationAlert[] {
  const alerts: DeviationAlert[] = [];

  // Threshold crossing
  const crossIdx = attendance.findIndex((v) => v < threshold);
  if (crossIdx !== -1) {
    const current = attendance[attendance.length - 1];
    alerts.push({
      severity: "critical",
      label: `Threshold crossed — ${labels[crossIdx]}`,
      description: `Attendance fell below ${threshold}% district threshold at ${labels[crossIdx]} and has not recovered. Currently at ${Math.round(current)}%${current < 75 ? " — chronic absenteeism territory." : "."}`,
    });
  }

  // Variability spike
  const varStart = variability[0];
  const varEnd = variability[variability.length - 1];
  if (varEnd > varStart * 2) {
    alerts.push({
      severity: "critical",
      label: `Variability spike — ${labels[Math.floor(variability.length / 2)]}–${labels[variability.length - 1]}`,
      description: `Variability index rising sharply (${Math.round(varStart)} → ${Math.round(varEnd)}) while attendance falls. Unpredictable pattern makes proactive intervention harder.`,
    });
  }

  // Crossover event — when variability index exceeds attendance decline rate
  for (let i = 1; i < attendance.length; i++) {
    if (variability[i] >= attendance[i] - attendance[0] + varStart && variability[i] > variability[i - 1] + 5) {
      alerts.push({
        severity: "warning",
        label: `Crossover event — ${labels[i]}`,
        description: `Variability index rate of change exceeded attendance drop rate this week. Strong predictor of continued decline without intervention.`,
      });
      break;
    }
  }

  return alerts;
}

// ─── Alert Strip ──────────────────────────────────────────────────────────────

function AlertStrip({ alerts }: { alerts: DeviationAlert[] }) {
  const [expanded, setExpanded] = useState(false);
  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  const positiveCount = alerts.filter(a => a.severity === "positive").length;

  const styles = {
    critical: {
      bg: "rgba(239,68,68,0.07)",
      border: "rgba(239,68,68,0.2)",
      dot: "#ef4444",
      labelColor: "#ef4444",
    },
    warning: {
      bg: "rgba(245,158,11,0.07)",
      border: "rgba(245,158,11,0.18)",
      dot: "#f59e0b",
      labelColor: "#f59e0b",
    },
    positive: {
      bg: "rgba(52,211,153,0.07)",
      border: "rgba(52,211,153,0.18)",
      dot: "#34d399",
      labelColor: "#34d399",
    },
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "rgba(255,255,255,0.03)",
          border: "0.5px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>
            {alerts.length} deviation{alerts.length > 1 ? "s" : ""} detected
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {criticalCount > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />}
            {warningCount > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />}
            {positiveCount > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />}
          </div>
        </div>
        <span style={{ fontSize: 10, color: "#64748b", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }} className="animate-in slide-in-from-top-1 duration-200">
          {alerts.map((alert, i) => {
            const s = styles[alert.severity];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: s.bg,
                  border: `0.5px solid ${s.border}`,
                  borderRadius: 8,
                  padding: "9px 12px",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: s.dot,
                    flexShrink: 0,
                    marginTop: 3,
                  }}
                />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: s.labelColor, margin: "0 0 2px" }}>
                    {alert.label}
                  </p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.45 }}>
                    {alert.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
          <div
            style={{
              width: 20,
              height: 2,
              background: item.dashed ? "transparent" : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
              borderRadius: 2,
            }}
          />
          {item.label}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(239,68,68,0.3)", border: "1.5px solid #ef4444" }} />
        Flagged point
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(52,211,153,0.3)", border: "1.5px solid #34d399" }} />
        Recovery
      </div>
    </div>
  );
}

// ─── Mood Baseline Chart (echarts rewrite) ────────────────────────────────────

export function MoodBaselineChart({
  data,
  labels,
  baseline,
  deviationThreshold = 10,
  className,
}: MoodBaselineChartProps) {
  const alerts = detectMoodDeviations(data, labels, baseline, deviationThreshold);

  const minVal = Math.min(...data, baseline) - 10;
  const maxVal = Math.max(...data, baseline) + 10;
  const minIdx = data.indexOf(Math.min(...data));
  const lastIdx = data.length - 1;
  const isRecovering = data[lastIdx] > data[minIdx] + 5;

  const areaGradient = new graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: "rgba(139,92,246,0.18)" },
    { offset: 1, color: "rgba(139,92,246,0.01)" },
  ]);

  const option = defineOption({
    tooltip: {
      trigger: "axis",
      backgroundColor: "#0f1420",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      textStyle: { color: "#f1f5f9", fontSize: 12 },
      formatter: (params: unknown) => {
        const p = Array.isArray(params) ? params[0] : params;
        const v = (p as { value: number }).value;
        const name = (p as { name: string }).name;
        const diff = Math.round(v - baseline);
        const sign = diff >= 0 ? "+" : "";
        return `<div style="font-weight:600;color:#f1f5f9">${name}</div>
                <div style="color:#94a3b8">Score: ${Math.round(v)} (${sign}${diff} vs baseline)</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
      axisTick: { show: false },
      axisLabel: { color: "#475569", fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: Math.floor(minVal / 10) * 10,
      max: Math.ceil(maxVal / 10) * 10,
      interval: 10,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#475569", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    series: [
      {
        type: "line",
        smooth: 0.45,
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { color: "#8b5cf6", width: 2.5 },
        areaStyle: { color: areaGradient },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "rgba(71,85,105,0.5)", type: "dashed", width: 1.5 },
          label: {
            color: "#475569",
            fontSize: 10,
            formatter: `Baseline (${baseline})`,
          },
          data: [{ yAxis: baseline }],
        },
        data: data.map((v, i) => {
          if (i === minIdx) {
            return {
              value: v,
              symbolSize: 14,
              itemStyle: {
                color: "#ef4444",
                borderColor: "rgba(239,68,68,0.4)",
                borderWidth: 3,
              },
            };
          }
          if (i === lastIdx && isRecovering) {
            return {
              value: v,
              symbolSize: 14,
              itemStyle: {
                color: "#34d399",
                borderColor: "rgba(52,211,153,0.4)",
                borderWidth: 3,
              },
            };
          }
          return {
            value: v,
            itemStyle: { color: "#8b5cf6" },
          };
        }),
      },
    ],
  });

  return (
    <div className={cn("", className)}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 3 }}>
        Mood Baseline & Volatility
      </p>
      <p style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>
        7-day mood trajectory vs personal baseline — deviations auto-detected
      </p>
      <Legend
        items={[
          { color: "#8b5cf6", label: "Mood score" },
          { color: "rgba(71,85,105,0.8)", label: `Baseline (${baseline})`, dashed: true },
        ]}
      />
      <ChartCanvas height={220} option={option} />
      <AlertStrip alerts={alerts} />
    </div>
  );
}

// ─── Attendance Chart (echarts rewrite) ───────────────────────────────────────

export function AttendanceChart({
  attendance,
  variability,
  labels,
  thresholdPct = 90,
  className,
}: AttendanceChartProps) {
  const alerts = detectAttendanceDeviations(attendance, variability, labels, thresholdPct);

  // Find threshold crossing index for flagging
  const crossIdx = attendance.findIndex((v) => v < thresholdPct);
  // Find crossover point
  let crossoverIdx = -1;
  for (let i = 1; i < attendance.length; i++) {
    if (variability[i] >= attendance[i] - attendance[0] + variability[0] + 5) {
      crossoverIdx = i;
      break;
    }
  }

  const attendanceGradient = new graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: "rgba(52,211,153,0.15)" },
    { offset: 1, color: "rgba(52,211,153,0.01)" },
  ]);

  const option = defineOption({
    tooltip: {
      trigger: "axis",
      backgroundColor: "#0f1420",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      textStyle: { color: "#f1f5f9", fontSize: 12 },
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params];
        const name = (arr[0] as { name: string }).name;
        const lines = arr.map((p) => {
          const r = p as { seriesName?: string; value: number; color?: string };
          if (r.seriesName === "Attendance") {
            return `<div style="color:#94a3b8">Attendance: ${Math.round(r.value)}%</div>`;
          }
          if (r.seriesName === "Variability") {
            return `<div style="color:#94a3b8">Variability: ${Math.round(r.value)}</div>`;
          }
          return "";
        });
        return `<div style="font-weight:600;color:#f1f5f9">${name}</div>${lines.join("")}`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
      axisTick: { show: false },
      axisLabel: { color: "#475569", fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: "value",
        position: "left",
        min: 60,
        max: 105,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#475569",
          fontSize: 11,
          formatter: (v: number) => `${Math.round(v)}%`,
        },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
      },
      {
        type: "value",
        position: "right",
        min: 0,
        max: 40,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#f59e0b", fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Attendance",
        type: "line",
        yAxisIndex: 0,
        smooth: 0.4,
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { color: "#34d399", width: 2.5 },
        areaStyle: { color: attendanceGradient },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "rgba(239,68,68,0.4)", type: "dashed", width: 1.5 },
          label: {
            color: "rgba(239,68,68,0.6)",
            fontSize: 10,
            formatter: `${thresholdPct}% threshold`,
          },
          data: [{ yAxis: thresholdPct }],
        },
        data: attendance.map((v, i) => {
          if (i === crossIdx) {
            return {
              value: v,
              symbolSize: 14,
              itemStyle: {
                color: "#ef4444",
                borderColor: "rgba(239,68,68,0.4)",
                borderWidth: 3,
              },
            };
          }
          return {
            value: v,
            itemStyle: { color: "#34d399" },
          };
        }),
      },
      {
        name: "Variability",
        type: "line",
        yAxisIndex: 1,
        smooth: 0.4,
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { color: "#f59e0b", width: 2 },
        data: variability.map((v, i) => {
          if (i === crossoverIdx) {
            return {
              value: v,
              symbolSize: 14,
              itemStyle: {
                color: "#f59e0b",
                borderColor: "rgba(245,158,11,0.4)",
                borderWidth: 3,
              },
            };
          }
          return {
            value: v,
            itemStyle: { color: "#f59e0b" },
          };
        }),
      },
    ],
  });

  return (
    <div className={cn("", className)}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 3 }}>
        Attendance & Variability
      </p>
      <p style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>
        6-week attendance rate with variability index — threshold at {thresholdPct}%
      </p>
      <Legend
        items={[
          { color: "#34d399", label: "Attendance rate" },
          { color: "#f59e0b", label: "Variability index" },
          { color: "rgba(239,68,68,0.6)", label: "Below threshold", dashed: true },
        ]}
      />
      <ChartCanvas height={220} option={option} />
      <AlertStrip alerts={alerts} />
    </div>
  );
}
