import { useCallback } from "react";

import { useStudentStageScale } from "../stage/StudentStage";

/**
 * FLIP-style element flight: measure a source and target element, clone the
 * source, and animate the clone from one to the other. This is the prototype's
 * "measure-clone-fly" pattern — the sparks purchase flying to its grid slot
 * (`sparks.html:828-871`), the completed card flying into the drawer
 * (`today.html:975-1064`), and the journal circle expanding to a full-screen
 * overlay (`journal.html:886-982`).
 *
 * Because those flights happen INSIDE the scaled {@link StudentStage}, the
 * prototype divides every `getBoundingClientRect` by `_deviceScale` to convert
 * screen pixels into the stage's local coordinate space
 * (`journey.html`/`sparks.html` flights, research §D.3). This hook does the
 * same: pass the stage-local `container` the clone should live in, and rects
 * are converted into that container's unscaled coordinates. Omit `container`
 * (or pass `document.body`) to fly in raw screen coordinates.
 */

export interface FlyOptions {
  /** Element to clone and fly. */
  from: HTMLElement;
  /** Destination — its box defines the clone's final position + size. */
  to: HTMLElement;
  /**
   * Where the clone is appended. When it's a scaled stage descendant, rects are
   * divided by the stage scale. Defaults to `document.body` (screen coords).
   */
  container?: HTMLElement | null;
  durationMs?: number;
  easing?: string;
  /** Final opacity of the clone (e.g. `0` to fade into the target). */
  toOpacity?: number;
  /** Called once the flight finishes (or the safety timeout fires). */
  onComplete?: () => void;
}

export function useFlipFlight(): { fly: (opts: FlyOptions) => void } {
  const scale = useStudentStageScale();

  const fly = useCallback(
    (opts: FlyOptions) => {
      if (typeof document === "undefined") return;
      const {
        from,
        to,
        container,
        durationMs = 600,
        easing = "cubic-bezier(0.6, 0.04, 0.2, 1)",
        toOpacity,
        onComplete,
      } = opts;

      const host = container ?? document.body;
      const s = container ? scale || 1 : 1;
      const hostRect = host.getBoundingClientRect();

      // Convert a screen rect into `host`-local, unscaled coordinates.
      const toLocal = (r: DOMRect) => ({
        left: (r.left - hostRect.left) / s,
        top: (r.top - hostRect.top) / s,
        width: r.width / s,
        height: r.height / s,
      });

      const f = toLocal(from.getBoundingClientRect());
      const t = toLocal(to.getBoundingClientRect());
      if (f.width === 0 || f.height === 0) {
        onComplete?.();
        return;
      }

      const clone = from.cloneNode(true) as HTMLElement;
      Object.assign(clone.style, {
        position: "absolute",
        margin: "0",
        left: `${f.left}px`,
        top: `${f.top}px`,
        width: `${f.width}px`,
        height: `${f.height}px`,
        transformOrigin: "top left",
        transform: "translate(0, 0) scale(1, 1)",
        transition: "none",
        pointerEvents: "none",
        zIndex: "9999",
      } satisfies Partial<CSSStyleDeclaration>);
      host.appendChild(clone);

      // Force reflow so the initial position paints before the transition
      // (the prototype's `void el.offsetWidth`, research §D.5).
      void clone.offsetWidth;

      const dx = t.left - f.left;
      const dy = t.top - f.top;
      const sx = t.width / f.width;
      const sy = t.height / f.height;

      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        clone.remove();
        onComplete?.();
      };

      clone.style.transition =
        `transform ${durationMs}ms ${easing}` +
        (toOpacity !== undefined ? `, opacity ${durationMs}ms ${easing}` : "");
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      if (toOpacity !== undefined) clone.style.opacity = String(toOpacity);

      clone.addEventListener("transitionend", cleanup, { once: true });
      window.setTimeout(cleanup, durationMs + 100);
    },
    [scale],
  );

  return { fly };
}
