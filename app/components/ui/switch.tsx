import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "~/lib/utils";

type SwitchSize = "default" | "sm";
type SwitchTone = "default" | "success";

const trackSizeClasses: Record<SwitchSize, string> = {
  default: "h-6 w-11",
  sm: "h-5 w-8",
};

const thumbSizeClasses: Record<SwitchSize, string> = {
  default: "h-5 w-5 data-[state=checked]:translate-x-5",
  sm: "h-4 w-4 data-[state=checked]:translate-x-3",
};

const toneCheckedClasses: Record<SwitchTone, string> = {
  default: "data-[state=checked]:bg-primary",
  success: "data-[state=checked]:bg-student-green-400",
};

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    size?: SwitchSize;
    tone?: SwitchTone;
  }
>(({ className, size = "default", tone = "default", ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      trackSizeClasses[size],
      toneCheckedClasses[tone],
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0",
        thumbSizeClasses[size],
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
