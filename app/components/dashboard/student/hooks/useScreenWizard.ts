import { useCallback, useRef, useState } from "react";

/**
 * In-route screen state machine — the React replacement for the prototype's
 * `goTo(id)` active-class switcher, copy-pasted across 9 wizard pages (research
 * §D "duplicated JS", e.g. `mood-checkin.html`, `onboarding.html`,
 * `recap.html`). It tracks the active screen index, the previous index, the
 * navigation `direction` (for direction-aware slide/curtain choreography), and
 * a `transitioning` flag that stays `true` for `transitionMs` so pages can hang
 * exit/enter phase classes on it.
 *
 * The number of screens can grow at runtime (mood check-in builds one detail
 * screen per selected emotion) — `count` is read on each navigation, so pass
 * the current total.
 */

export interface ScreenWizard {
  index: number;
  previousIndex: number | null;
  /** `1` forward, `-1` back, `0` initial. */
  direction: 1 | -1 | 0;
  transitioning: boolean;
  goTo: (next: number) => void;
  next: () => void;
  back: () => void;
}

export function useScreenWizard(opts: {
  count: number;
  initial?: number;
  transitionMs?: number;
}): ScreenWizard {
  const { count, initial = 0, transitionMs = 360 } = opts;

  const [index, setIndex] = useState(initial);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const [transitioning, setTransitioning] = useState(false);
  const timer = useRef<number | null>(null);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      setIndex((current) => {
        if (clamped === current) return current;
        setPreviousIndex(current);
        setDirection(clamped > current ? 1 : -1);
        setTransitioning(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(
          () => setTransitioning(false),
          transitionMs,
        );
        return clamped;
      });
    },
    [count, transitionMs],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const back = useCallback(() => goTo(index - 1), [goTo, index]);

  return { index, previousIndex, direction, transitioning, goTo, next, back };
}
