import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "~/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar — thin wrapper over `react-day-picker@10` `DayPicker` with
 * Radix-style adult tokens. v10's classNames keys differ from v8; this
 * version uses the v10 surface and overrides only a handful of slots so
 * the calendar visually integrates with our popover surface.
 *
 * Consumers (e.g. `MicroWinPrompt` from step-6) typically pass
 * `mode="single"`, `selected`, `onSelect`.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
