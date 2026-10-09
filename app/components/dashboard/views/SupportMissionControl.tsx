import { useState } from "react";
import { cn } from "~/lib/utils";
import { ChevronDown } from "lucide-react";
import TeacherSnapshotModules from "~/components/TeacherSnapshotModules";
import { RiskWatchlist } from "../RiskWatchlist";
import { ScoreExplainer } from "~/components/dashboard/ScoreExplainer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

const grades = ["4th", "5th", "6th", "7th", "8th"] as const;

function EmotionalSafetyExpander({ score }: { score: number }) {
  const [expanded, setExpanded] = useState(false);
  const circumference = 42 * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const level = score >= 80 ? "Healthy" : score >= 60 ? "Moderate Concern" : score >= 40 ? "Elevated Concern" : "Critical";
  const levelColor = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-card/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-[48px] h-[48px] flex-shrink-0">
            <svg width="48" height="48" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" transform="rotate(-90 50 50)"
                className="transition-all duration-700 ease-out" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="text-sm font-extrabold text-foreground">{score}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-foreground">Emotional Safety Score</div>
            <div className={cn("text-[11px] font-semibold", levelColor)}>{level}</div>
          </div>
        </div>
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] text-muted-foreground leading-snug mt-3 mb-3">
            Class-wide emotional safety has declined 12% over 3 weeks. Students may not feel comfortable participating or asking for help.
          </p>
          <div className="space-y-2">
            {[
              { range: "80–100", label: "Healthy", color: "bg-success" },
              { range: "60–79", label: "Moderate concern", color: "bg-warning", active: score >= 60 && score <= 79 },
              { range: "40–59", label: "Elevated concern", color: "bg-orange-400" },
              { range: "0–39", label: "Critical", color: "bg-destructive" },
            ].map((t) => (
              <div key={t.label} className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] border",
                t.active ? "bg-warning/10 border-warning/20" : "bg-transparent border-transparent"
              )}>
                <div className={cn("w-[6px] h-[6px] rounded-full flex-shrink-0", t.color)} />
                <span className={cn("font-semibold", t.active ? "text-warning" : "text-muted-foreground")}>{t.label}</span>
                <span className="text-muted-foreground/60 ml-auto">{t.range}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SupportMissionControl() {
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [supportOpen, setSupportOpen] = useState(false);

  const supportItems = [
    { label: "Schedule check-in with Emily M.", icon: "📞" },
    { label: "Take a look at Dani G.'s sleep patterns", icon: "📊" },
    { label: "Send a quick wellness check to Period 3", icon: "💬" },
    { label: "Update notes for Josten T.", icon: "📝" },
  ];

  return (
    <div className="space-y-5">
      {/* Grade Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Grade:</span>
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-white/5 border-border">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g} value={g}>{g} Grade</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pending to Support — expandable panel above modules */}
      <div className="pending-support rounded-xl border overflow-hidden transition-all">
        <button
          onClick={() => setSupportOpen((v) => !v)}
          className="pending-support__header w-full px-4 py-3 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="pending-support__dot inline-block w-1.5 h-1.5 rounded-full" />
            <span className="pending-support__title text-sm font-bold">Pending to Support</span>
            <span className="pending-support__badge text-[10px] font-semibold px-1.5 py-0.5 rounded">
              {supportItems.length}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={cn(
              "pending-support__chevron transition-transform duration-200",
              supportOpen && "rotate-180"
            )}
          />
        </button>

        {supportOpen && (
          <div className="pending-support__body px-4 pb-4 pt-0 border-t animate-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col gap-1.5 mt-3">
              {supportItems.map((a, i) => (
                <div
                  key={i}
                  className="pending-support__item flex items-center gap-2.5 py-2 px-2.5 rounded-md cursor-pointer border transition-colors"
                >
                  <span className="text-sm">{a.icon}</span>
                  <span className="pending-support__item-label text-xs flex-1">{a.label}</span>
                  <span className="pending-support__arrow text-[10px]">→</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Teacher Snapshot Modules */}
      <TeacherSnapshotModules
        classInfo={{ period: 3, name: "AP English", studentCount: 28 }}
        onModuleClick={(moduleId) => console.log("Module clicked:", moduleId)}
      />

      {/* Risk Watchlist (full width) */}
      <RiskWatchlist />
    </div>
  );
}
