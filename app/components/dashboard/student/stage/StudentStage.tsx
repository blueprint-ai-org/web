import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "~/lib/utils";

/**
 * The prototype's fixed device canvas ("`.bp-device`", `today.html:33-37`): a
 * 1194×834 iPad-landscape artboard scaled to fit the viewport and centred on a
 * near-black letterbox field. Every student page renders inside one of these.
 *
 * This generalises the prototype's scaled artboard pattern into a student-wide
 * stage:
 *  - fixed 1194×834 inner frame, `overflow: hidden`, 20px radius,
 *    `bg-student-bg` (matches `.bp-device`);
 *  - scale `min(vw/1194, vh/834) * 0.96` (the prototype's exact factor —
 *    `today.html:7`, `mood-checkin.html:829`), recomputed on resize;
 *  - `#0a0a0f` letterbox surround (`--color-student-letterbox`);
 *  - optional portal to `document.body` so the fixed surround escapes any
 *    transformed/filtered route wrapper.
 *
 * The computed scale is published through {@link StudentStageContext}. Pointer
 * math inside the stage (arc sliders, FLIP flights) must divide
 * `getBoundingClientRect` deltas by this scale to convert screen pixels back
 * into the stage's local 1194×834 coordinate space — exactly what the prototype
 * does with `_deviceScale` (`mood-checkin.html:1463-1467`).
 */

const STAGE_W = 1194;
const STAGE_H = 834;
const STAGE_FIT = 0.96;

/**
 * Current stage scale (screen px per stage px). Defaults to `1` outside a
 * stage so consumers rendered standalone (tests, storybook-style sheets) still
 * work — pointer math then treats screen and local coordinates as identical.
 */
export const StudentStageContext = createContext<number>(1);

/** Read the enclosing {@link StudentStage}'s scale (`1` when unscaled). */
export function useStudentStageScale(): number {
  return useContext(StudentStageContext);
}

export type StudentStageProps = {
  children: ReactNode;
  /**
   * Portal the fixed letterbox surround to `document.body`. Defaults to `true`
   * (matches the prototype's full-viewport device). Set `false` to keep the
   * stage in the normal flow — the surround is still `position: fixed`, so this
   * only affects which ancestor's transform/filter it escapes.
   */
  portal?: boolean;
  /** Extra classes on the fixed letterbox surround. */
  surroundClassName?: string;
  /** Extra classes on the scaled 1194×834 inner frame. */
  className?: string;
  /** Inline styles merged onto the scaled inner frame. */
  style?: CSSProperties;
  /** `data-*` hook for QA / analytics on the inner frame. */
  "data-testid"?: string;
};

export function StudentStage({
  children,
  portal = true,
  surroundClassName,
  className,
  style,
  "data-testid": testId,
}: StudentStageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number>(STAGE_FIT);

  // SSR + first client commit render in place; the post-mount flip relocates
  // the subtree to `document.body` (the prototype's full-viewport device).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const compute = () => {
      const next =
        Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H) *
        STAGE_FIT;
      setScale(next);
    };

    compute();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && wrapperRef.current) {
      ro = new ResizeObserver(compute);
      ro.observe(wrapperRef.current);
    }
    window.addEventListener("resize", compute);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [mounted]);

  const surround = (
    <div
      ref={wrapperRef}
      className={cn(
        "bg-student-letterbox flex items-center justify-center",
        surroundClassName,
      )}
      style={{ position: "fixed", inset: 0 }}
    >
      <StudentStageContext.Provider value={scale}>
        <div
          className={cn(
            "bg-student-bg text-student-text relative overflow-hidden",
            className,
          )}
          style={{
            width: STAGE_W,
            height: STAGE_H,
            borderRadius: 20,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            ...style,
          }}
          data-student-stage=""
          data-testid={testId}
        >
          {children}
        </div>
      </StudentStageContext.Provider>
    </div>
  );

  if (portal && mounted && typeof document !== "undefined") {
    return createPortal(surround, document.body);
  }

  return surround;
}
