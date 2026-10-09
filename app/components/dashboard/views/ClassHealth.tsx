import { useState } from "react";
import { classClimateData } from "~/lib/dashboard-data";
import { cn } from "~/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { TrendingUp, TrendingDown } from "lucide-react";

const grades = ["4th", "5th", "6th", "7th", "8th"] as const;

const teachersByGrade: Record<string, string[]> = {
  "4th": ["Mrs. Patterson", "Mr. Davis", "Ms. Rivera"],
  "5th": ["Mrs. Thompson", "Mr. Lee", "Ms. Carter"],
  "6th": ["Mrs. Johnson", "Mr. Williams", "Ms. Nguyen"],
  "7th": ["Mrs. Martinez", "Mr. Clark", "Ms. Robinson"],
  "8th": ["Mrs. Adams", "Mr. Hernandez", "Ms. Patel"],
};

const allTeachers = [...new Set(Object.values(teachersByGrade).flat())];

// Action suggestions per dimension
const actionHints: Record<string, string> = {
  "Emotional\nSafety": "Students feel safe expressing themselves. Reinforce trust-building rituals.",
  "Engagement": "Participation is declining — consider varying activity formats or adding choice.",
  "Stress\nLevel": "Stress is elevated. Consider pacing adjustments or a class-wide decompression activity.",
  "Resilience": "Bounce-back is fragile. Normalize setbacks and celebrate recovery in class.",
  "Connection": "Peer bonds are strong. Leverage group work and collaborative projects.",
};

function StrengthConcernCards() {
  const sorted = [...classClimateData].sort((a, b) => b.value - a.value);
  const strengths = sorted.slice(0, 2);
  const concerns = sorted.slice(-2).reverse();

  return (
    <div className="space-y-3">
      {/* Strengths */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={13} className="text-success" />
          <span className="text-[10px] font-semibold text-success uppercase tracking-wide">Strongest Areas</span>
        </div>
        <div className="space-y-2">
          {strengths.map((d) => (
            <div key={d.name} className="bg-success/8 border border-success/15 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-foreground">{d.name.replace("\n", " ")}</span>
                <span className="text-sm font-extrabold text-success">{d.value}</span>
              </div>
              <div className="h-1 w-full bg-border/50 rounded-full mb-2">
                <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${d.value}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">{actionHints[d.name]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Concerns */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown size={13} className="text-destructive" />
          <span className="text-[10px] font-semibold text-destructive uppercase tracking-wide">Areas of Concern</span>
        </div>
        <div className="space-y-2">
          {concerns.map((d) => {
            const isLow = d.value < 50;
            return (
              <div key={d.name} className={cn("border rounded-lg p-3", isLow ? "bg-destructive/8 border-destructive/15" : "bg-warning/8 border-warning/15")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{d.name.replace("\n", " ")}</span>
                  <span className={cn("text-sm font-extrabold", isLow ? "text-destructive" : "text-warning")}>{d.value}</span>
                </div>
                <div className="h-1 w-full bg-border/50 rounded-full mb-2">
                  <div className={cn("h-full rounded-full transition-all duration-500", isLow ? "bg-destructive" : "bg-warning")} style={{ width: `${d.value}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{actionHints[d.name]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ClassHealth() {
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const studentsByCategory: Record<string, { name: string; grade: string; initials: string; detail: string }[]> = {
    "Thriving": [
      { name: "Sophia R.", grade: "5th", initials: "SR", detail: "Consistent positive mood, high engagement" },
      { name: "Liam T.", grade: "5th", initials: "LT", detail: "Strong peer connections, active participation" },
      { name: "Ava K.", grade: "4th", initials: "AK", detail: "Improving trend, resilient coping" },
      { name: "Noah P.", grade: "6th", initials: "NP", detail: "Leadership qualities, supports peers" },
      { name: "Mia J.", grade: "5th", initials: "MJ", detail: "High emotional safety, self-regulated" },
      { name: "Ethan W.", grade: "4th", initials: "EW", detail: "Engaged, positive sleep patterns" },
      { name: "Isabella C.", grade: "6th", initials: "IC", detail: "Creative outlet active, stable mood" },
      { name: "Lucas H.", grade: "5th", initials: "LH", detail: "Consistent check-in streak" },
    ],
    "Stable": [
      { name: "Olivia M.", grade: "6th", initials: "OM", detail: "Steady engagement, no flags" },
      { name: "James B.", grade: "5th", initials: "JB", detail: "Moderate mood, consistent attendance" },
      { name: "Charlotte D.", grade: "4th", initials: "CD", detail: "Slight mood dip, recovering" },
      { name: "Benjamin F.", grade: "6th", initials: "BF", detail: "Average participation, no concerns" },
      { name: "Amelia S.", grade: "5th", initials: "AS", detail: "Stable sleep, moderate engagement" },
      { name: "Henry L.", grade: "4th", initials: "HL", detail: "Neutral check-ins, steady" },
      { name: "Harper N.", grade: "6th", initials: "HN", detail: "Social connections stable" },
      { name: "Alexander G.", grade: "5th", initials: "AG", detail: "Slightly below baseline, monitoring" },
      { name: "Ella V.", grade: "4th", initials: "EV", detail: "Consistent, no trend changes" },
      { name: "Daniel Q.", grade: "6th", initials: "DQ", detail: "Average across all metrics" },
      { name: "Grace Z.", grade: "5th", initials: "GZ", detail: "Mild stress, coping well" },
    ],
    "Emerging Concern": [
      { name: "Mason R.", grade: "5th", initials: "MR", detail: "Mood declining 5 days, skipping check-ins" },
      { name: "Chloe T.", grade: "6th", initials: "CT", detail: "Engagement drop 25%, sleep disrupted" },
      { name: "Logan K.", grade: "4th", initials: "LK", detail: "Peer conflict reported, withdrawing" },
      { name: "Zoe P.", grade: "5th", initials: "ZP", detail: "Assignment delays increasing" },
      { name: "Jack W.", grade: "6th", initials: "JW", detail: "Mood neutral 8+ days, low energy" },
      { name: "Lily A.", grade: "4th", initials: "LA", detail: "New avoidance pattern detected" },
    ],
    "Elevated Risk": [
      { name: "Emily M.", grade: "5th", initials: "EM", detail: "Multiple signals active, 3-week decline" },
      { name: "Dani G.", grade: "6th", initials: "DG", detail: "Disengaged 10+ days, mood critical" },
      { name: "Alex R.", grade: "5th", initials: "AR", detail: "Sleep disruption + engagement collapse" },
    ],
  };

  const distributionData = [
    { label: "Thriving", count: 8, pct: 29, colorClass: "bg-success", textClass: "text-success" },
    { label: "Stable", count: 11, pct: 39, colorClass: "bg-info", textClass: "text-info" },
    { label: "Emerging Concern", count: 6, pct: 21, colorClass: "bg-warning", textClass: "text-warning" },
    { label: "Elevated Risk", count: 3, pct: 11, colorClass: "bg-destructive", textClass: "text-destructive" },
  ];

  return (
    <div className="space-y-5 w-full">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Teacher:</span>
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-white/5 border-border">
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {allTeachers.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-5">
      {/* Strengths & Concerns — replaces radar chart */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="text-sm font-bold text-foreground mb-1">Class Emotional Climate</div>
        <div className="text-[11px] text-muted-foreground mb-3">Period 3 • AP English • 28 Students</div>
        <StrengthConcernCards />
      </div>

      {/* Class Distribution */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="text-sm font-bold text-foreground mb-3">Class Distribution</div>
        <div className="grid grid-cols-2 gap-2.5">
          {distributionData.map((d, i) => (
            <button
              key={i}
              onClick={() => setSelectedCategory(selectedCategory === d.label ? null : d.label)}
              className={cn(
                "bg-card rounded-lg p-3 border-l-[3px] text-left transition-all cursor-pointer",
                d.colorClass.replace("bg-", "border-"),
                selectedCategory === d.label ? "ring-1 ring-primary/40 bg-card-hover" : "hover:bg-card-hover"
              )}
            >
              <div className={`text-[22px] font-extrabold ${d.textClass}`}>{d.count}</div>
              <div className="text-[11px] text-foreground font-medium">{d.label}</div>
              <div className="text-[10px] text-muted-foreground">{d.pct}% of class</div>
            </button>
          ))}
        </div>

        {/* Student list drawer */}
        {selectedCategory && studentsByCategory[selectedCategory] && (
          <div className="mt-3 border border-border/50 rounded-lg overflow-hidden animate-in slide-in-from-top-1 duration-200">
            <div className="px-3 py-2 bg-card/50 border-b border-border/50 flex items-center justify-between">
              <span className={cn("text-xs font-bold", distributionData.find(d => d.label === selectedCategory)?.textClass)}>
                {selectedCategory} — {studentsByCategory[selectedCategory].length} students
              </span>
              <button onClick={() => setSelectedCategory(null)} className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {studentsByCategory[selectedCategory].map((s) => {
                const catData = distributionData.find(d => d.label === selectedCategory);
                return (
                  <div key={s.name} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/20 last:border-0 hover:bg-card/50 transition-colors">
                    <div className={cn(
                      "w-[28px] h-[28px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                      selectedCategory === "Thriving" && "bg-success/15 text-success",
                      selectedCategory === "Stable" && "bg-info/15 text-info",
                      selectedCategory === "Emerging Concern" && "bg-warning/15 text-warning",
                      selectedCategory === "Elevated Risk" && "bg-destructive/15 text-destructive",
                    )}>
                      {s.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{s.detail}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{s.grade}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!selectedCategory && (
          <div className="mt-3.5 bg-card rounded-lg p-3">
            <div className="text-[11px] font-semibold text-primary-light mb-1.5">Support Guidance</div>
            <div className="text-xs text-muted-foreground leading-snug">
              Consider a class-wide stress management activity. Exam week is a contributing contextual modifier. 3 students warrant individual check-ins.
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
