import { useState } from "react";
import { toast } from "sonner";
import { students, type Student } from "~/lib/dashboard-data";
import { RiskBadge } from "./RiskBadge";
import { TrendArrow } from "./TrendArrow";
import { StudentDetailPanel } from "./StudentDetailPanel";
import { GrowthFeedbackCard } from "./GrowthFeedbackCard";
import { EscalateModal } from "~/components/dashboard/EscalateModal";
import { cn } from "~/lib/utils";

export function RiskWatchlist() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [escalateStudent, setEscalateStudent] = useState<Student | null>(null);
  const [escalationStatuses, setEscalationStatuses] = useState<Record<string, { status: string; action: string }>>({});

  const ctaConfig = {
    elevated: { label: "Take Action", className: "bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30" },
    moderate: { label: "Keep an Eye", className: "bg-warning/20 text-warning hover:bg-warning/30 border-warning/30" },
    monitor: { label: "On Track", className: "bg-success/20 text-success hover:bg-success/30 border-success/30" },
    urgent: { label: "Intervene", className: "bg-destructive/30 text-destructive hover:bg-destructive/40 border-destructive/40" },
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-3.5">
        <div className="text-sm font-bold text-foreground">Students Who May Need Extra Support</div>
        <div className="text-[11px] text-muted-foreground">Updated 8 minutes ago</div>
      </div>

      <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
        <div className="min-w-[820px]">

      {/* Table Header */}
      <div className="grid grid-cols-[200px_100px_110px_180px_80px_110px] gap-3 py-2 px-3 bg-card rounded-md mb-2">
        {["Student", "Support Level", "Current State", "Direction", "Confidence", "Next Step"].map((header) => (
          <span key={header} className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
            {header}
          </span>
        ))}
      </div>

      {/* Student Rows */}
      {[...students].sort((a, b) => b.riskScore - a.riskScore).map((s) => {
        const escalation = escalationStatuses[s.id];
        const cta = escalation
          ? escalation.status === "resolved"
            ? { label: "✅ Resolved", className: "bg-success/20 text-success border-success/30 cursor-default" }
            : { label: "🔄 In Progress", className: "bg-primary/20 text-primary border-primary/30" }
          : ctaConfig[s.risk] || ctaConfig.monitor;

        return (
          <div
            key={s.id}
            onClick={() => setSelectedStudent(selectedStudent?.id === s.id ? null : s)}
            className={cn(
              "grid grid-cols-[200px_100px_110px_180px_80px_110px] gap-3 py-2.5 px-3 rounded-md cursor-pointer items-center border-b border-border/20 transition-colors",
              selectedStudent?.id === s.id ? "bg-card-hover" : "hover:bg-card/50"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "w-[30px] h-[30px] flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-foreground",
                s.risk === "elevated" && "gradient-avatar-elevated",
                s.risk === "moderate" && "gradient-avatar-moderate",
                s.risk === "monitor" && "gradient-avatar-monitor"
              )}>
                {s.avatar}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">{s.name}</div>
                <div className="text-[10px] text-muted-foreground">{s.grade}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-[40px] h-1 bg-border rounded-sm flex-shrink-0">
                <div
                  className={cn(
                    "h-full rounded-sm",
                    s.riskScore > 70 ? "bg-destructive" : s.riskScore > 50 ? "bg-warning" : "bg-success"
                  )}
                  style={{ width: `${s.riskScore}%` }}
                />
              </div>
              <span className="text-[13px] font-bold text-foreground">{s.riskScore}</span>
            </div>
            <div><RiskBadge level={s.risk} /></div>
            <div className="flex items-center gap-1">
              <TrendArrow trend={s.trend} />
              <span className="text-[11px] text-muted-foreground">
                {s.trend === "declining"
                  ? "Needs a little attention lately"
                  : s.trend === "improving"
                  ? "Getting better"
                  : "Holding steady"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">{s.confidence}%</div>
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEscalateStudent(s);
                }}
                className={cn(
                  "w-full px-2 py-1 text-[10px] font-semibold rounded border transition-colors whitespace-nowrap text-center",
                  cta.className
                )}
              >
                {cta.label}
              </button>
            </div>
          </div>
        );
      })}
        </div>
      </div>


      {selectedStudent && (
        <StudentDetailPanel
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {escalateStudent && (
        <EscalateModal
          student={escalateStudent}
          onClose={() => setEscalateStudent(null)}
          onActionLogged={({ action, slot, status }) => {
            const actionLabel = action.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            const statusLabel = status === "resolved" ? "Resolved" : "In Progress";
            setEscalationStatuses(prev => ({
              ...prev,
              [escalateStudent.id]: { status, action },
            }));
            toast.success(`Escalation ${statusLabel}`, {
              description: `${actionLabel} for ${escalateStudent.name} scheduled: ${slot}`,
            });
            setEscalateStudent(null);
          }}
        />
      )}

      <GrowthFeedbackCard className="mt-4" />
    </div>
  );
}
