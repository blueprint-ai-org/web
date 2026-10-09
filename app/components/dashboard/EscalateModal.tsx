import { useState } from "react";
import { Textarea } from "~/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { Student } from "~/lib/dashboard-data";

interface EscalateModalProps {
  student: Student;
  onClose: () => void;
  onActionLogged: (data: { action: string; slot: string; notes: string; status: string }) => void;
}

const actions = [
  { id: "parent-contact", label: "Contact Parent/Guardian", icon: "📞" },
  { id: "counselor-referral", label: "Counselor Referral", icon: "🗣️" },
  { id: "admin-flag", label: "Flag for Admin Review", icon: "🚩" },
  { id: "wellness-check", label: "Schedule Wellness Check", icon: "💚" },
];

const timeSlots = [
  "Today — Morning",
  "Today — Afternoon",
  "Tomorrow — Morning",
  "Tomorrow — Afternoon",
  "This Week",
];

export function EscalateModal({ student, onClose, onActionLogged }: EscalateModalProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("in-progress");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Escalate — {student.name}
          </DialogTitle>
          <DialogDescription>
            Risk Score: {student.riskScore} · Choose an action and preferred timing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</span>
            <div className="grid grid-cols-2 gap-2">
              {actions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAction(a.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors text-left",
                    selectedAction === a.id
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-card border-border text-foreground hover:bg-card-hover"
                  )}
                >
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timing</span>
            <div className="flex flex-wrap gap-1.5">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium border transition-colors",
                    selectedSlot === slot
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</span>
            <Textarea
              placeholder="Add context, observations, or next steps..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-card border-border text-foreground text-xs min-h-[72px] resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
            <div className="flex gap-2">
              {[
                { id: "in-progress", label: "In Progress", icon: "🔄" },
                { id: "resolved", label: "Resolved", icon: "✅" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors",
                    selectedStatus === s.id
                      ? s.id === "resolved"
                        ? "bg-success/15 border-success/40 text-success"
                        : "bg-primary/15 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedAction || !selectedSlot}
            onClick={() => {
              if (selectedAction && selectedSlot) {
                onActionLogged({ action: selectedAction, slot: selectedSlot, notes, status: selectedStatus });
              }
            }}
            className="bg-destructive/90 hover:bg-destructive text-destructive-foreground"
          >
            Confirm Escalation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
