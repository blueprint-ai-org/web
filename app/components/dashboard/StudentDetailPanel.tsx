import type { Student } from "~/lib/dashboard-data";
import { ChartCanvas, defineOption } from "~/lib/echarts/ChartCanvas";

interface StudentDetailPanelProps {
  student: Student;
  onClose: () => void;
}

export function StudentDetailPanel({ student, onClose }: StudentDetailPanelProps) {
  const radarData = [
    { metric: "Self-Regulation", score: student.mood > 60 ? 70 : 40 },
    { metric: "Help-Seeking", score: student.engagement > 50 ? 65 : 30 },
    { metric: "Adaptability", score: 55 },
    { metric: "Grit", score: student.engagement },
    { metric: "Optimism", score: student.mood },
    { metric: "Social Awareness", score: student.mood > 50 ? 60 : 35 },
  ];

  const radarOption = defineOption({
    tooltip: { trigger: "item" },
    radar: {
      indicator: radarData.map((d) => ({ name: d.metric, max: 100 })),
      shape: "polygon",
      splitNumber: 4,
      axisName: { color: "hsl(var(--muted-foreground))", fontSize: 9 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: radarData.map((d) => d.score),
            name: student.name,
            symbol: "circle",
            symbolSize: 4,
            areaStyle: { color: "rgba(139,92,246,0.25)" },
            lineStyle: { color: "#8b5cf6", width: 2 },
            itemStyle: { color: "#8b5cf6" },
          },
        ],
      },
    ],
  });

  return (
    <div className="bg-surface rounded-xl border border-border p-5 mt-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-sm font-bold text-primary-foreground">
            {student.avatar}
          </div>
          <div>
            <div className="text-base font-bold text-foreground">{student.name}</div>
            <div className="text-xs text-muted-foreground">{student.grade} Grade • Student Detail View</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-card border border-border text-muted-foreground rounded-md px-2.5 py-1 cursor-pointer text-xs hover:bg-card-hover transition-colors"
        >
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Explainable Inference */}
        <div className="bg-card rounded-lg p-3.5">
          <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">Explainable Inference</div>
          <div className="text-[13px] text-foreground mb-2">
            <span className="font-semibold">Why this may be happening:</span>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Difficulty managing sustained academic pressure. Multiple behavioral signals converging over the past 14 days suggest emerging emotional safety concern.
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Confidence</span>
            <div className="flex-1 h-1 bg-border rounded-sm">
              <div
                className={`h-full rounded-sm ${student.confidence > 80 ? "bg-success" : "bg-warning"}`}
                style={{ width: `${student.confidence}%` }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">{student.confidence}%</span>
          </div>
        </div>

        {/* Contributing Factors */}
        <div className="bg-card rounded-lg p-3.5">
          <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">Contributing Factors</div>
          {student.factors.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-destructive" : i === 1 ? "bg-chart-orange" : "bg-warning"}`} />
              <span className="text-xs text-foreground">{f}</span>
            </div>
          ))}
          <div className="mt-2.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1 font-medium">Protective Factors</div>
          {student.protective.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs text-success">{f}</span>
            </div>
          ))}
        </div>

        {/* EI Dimensions */}
        <div className="bg-card rounded-lg p-3.5">
          <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">EI Dimensions</div>
          <ChartCanvas height={140} option={radarOption} />
        </div>
      </div>

      {/* Recommended Support */}
      <div className="bg-card rounded-lg p-3.5">
        <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide font-medium">Recommended Support</div>
        <div className="grid grid-cols-4 gap-2.5">
          <div className="bg-surface rounded-md p-2.5 border border-primary/20">
            <div className="text-[11px] font-semibold text-primary-light mb-1">Urgency Tier</div>
            <div className="text-sm font-bold text-foreground">{student.risk === "elevated" ? "Elevated" : "Moderate"}</div>
            <div className="text-[10px] text-muted-foreground">Outreach within {student.risk === "elevated" ? "24-48 hrs" : "3-5 days"}</div>
          </div>
          <div className="bg-surface rounded-md p-2.5">
            <div className="text-[11px] font-semibold text-info mb-1">Responder</div>
            <div className="text-sm font-bold text-foreground">{student.risk === "elevated" ? "Counselor" : "Teacher"}</div>
            <div className="text-[10px] text-muted-foreground">Primary contact</div>
          </div>
          <div className="bg-surface rounded-md p-2.5">
            <div className="text-[11px] font-semibold text-success mb-1">What's Worked</div>
            <div className="text-xs text-foreground">Nature journals</div>
            <div className="text-[10px] text-muted-foreground">Recovery +52% prior</div>
          </div>
          <div className="bg-surface rounded-md p-2.5">
            <div className="text-[11px] font-semibold text-chart-pink mb-1">Intervention</div>
            <div className="text-xs text-foreground">Structured check-in</div>
            <div className="text-[10px] text-muted-foreground">Moderate intensity</div>
          </div>
        </div>
      </div>
    </div>
  );
}
