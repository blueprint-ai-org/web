import { useCallback, useEffect, useRef } from "react";

/**
 * Manage a `requestAnimationFrame` loop with start/stop/cleanup — the substrate
 * for the prototype's hand-rolled rAF systems (googly-eye pupil wander +
 * eyelid tweens `today.html:1142-1214`, the spring-physics spark swarm
 * `journey.html:1234-1337`, the video scrubber `toolkit-video.html:526-538`).
 *
 * The callback is stored in a ref, so it always sees fresh state/props without
 * restarting the loop. `frame(time, delta)` receives the `performance.now()`
 * timestamp and the ms elapsed since the previous frame. The loop is cancelled
 * automatically on unmount.
 *
 * @example
 * const { start, stop } = useRafLoop((t, dt) => { pupil.x += (target - pupil.x) * 0.1; });
 * useEffect(() => { start(); return stop; }, [start, stop]);
 */
export function useRafLoop(
  frame: (time: number, delta: number) => void,
): { start: () => void; stop: () => void; isRunning: () => boolean } {
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const rafId = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    lastTime.current = null;
  }, []);

  const start = useCallback(() => {
    if (rafId.current !== null) return; // already running
    const tick = (time: number) => {
      const delta = lastTime.current === null ? 0 : time - lastTime.current;
      lastTime.current = time;
      frameRef.current(time, delta);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  }, []);

  const isRunning = useCallback(() => rafId.current !== null, []);

  useEffect(() => stop, [stop]);

  return { start, stop, isRunning };
}
