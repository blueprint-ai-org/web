import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";

import { useStudentStageScale } from "../stage/StudentStage";

/**
 * The prototype's signature arc slider, unified into ONE parameterised
 * component. It replaces the three copy-pasted implementations:
 *  - `onboarding.html:1984-2119` — 5-stop baseline mood (stretching "union"
 *    background driven via `onInput`, end caps, fill-aware dots);
 *  - `mood-checkin.html:1394-1487` — 3-stop per-emotion intensity;
 *  - `mood-checkin.html:1489-1551` — 7-stop sleep quality.
 *
 * Shared geometry (identical across all three + the `components/arc-slider.html`
 * workbench): a fixed 532×h box, `CX/CY/RM` polar centre, an SVG arc `path`
 * whose `d` is recomputed every pointermove, a polar→cartesian thumb, dot
 * markers per stop, snap-to-stop with a spring transition, and ArrowLeft/Right
 * keys.
 *
 * Pointer coordinates are divided by the enclosing {@link StudentStage} scale
 * (via {@link useStudentStageScale}) so drag math stays in the stage's local
 * 1194×834 space — mirroring the prototype's `/ _deviceScale`
 * (`mood-checkin.html:1466`).
 */

// ── Fixed geometry (research §D.3; `arc-slider.html:186-188`) ────────────────
const ARC_CX = 263;
const ARC_CY = 247;
const ARC_RM = 190.5; // (215 + 166) / 2
const ARC_FILL_START = 175;
const ARC_TRACK_END = 5;
const ARC_A_MAX = 170;
const ARC_A_MIN = 10;
const DEG = Math.PI / 180;

const rnd = (n: number) => Math.round(n * 10) / 10;

function arcPt(r: number, deg: number): [number, number] {
  return [ARC_CX + r * Math.cos(deg * DEG), ARC_CY - r * Math.sin(deg * DEG)];
}

function arcAngleAt(x: number, y: number): number {
  return Math.atan2(ARC_CY - y, x - ARC_CX) / DEG;
}

function arcPath(from: number, to: number): string {
  if (from - to < 0.4) to = from - 0.4;
  const [x1, y1] = arcPt(ARC_RM, from);
  const [x2, y2] = arcPt(ARC_RM, to);
  const largeArc = from - to >= 180 ? 1 : 0;
  return `M${rnd(x1)},${rnd(y1)} A${ARC_RM},${ARC_RM} 0 ${largeArc},1 ${rnd(x2)},${rnd(y2)}`;
}

export interface ArcStop {
  /** Emoji shown in the thumb + pill when this stop is nearest. */
  readonly emoji: string;
  /** Label shown in the pill (literal `\n` renders as a line break). */
  readonly label: string;
}

export interface ArcGradientStop {
  /** 0–100. */
  readonly offset: number;
  readonly color: string;
}

export interface ArcSliderProps {
  /** Ordered stops, left (index 0) → right. 2 or more. */
  stops: readonly ArcStop[];
  /** Fill gradient stops (`gradientUnits="userSpaceOnUse"`, x 48→480). */
  gradient: readonly ArcGradientStop[];
  /** Controlled selected index. Omit for uncontrolled (see `defaultValue`). */
  value?: number;
  /** Uncontrolled initial index. Defaults to the middle stop. */
  defaultValue?: number;
  /** Fired when the committed stop changes (snap end / keyboard / programmatic). */
  onChange?: (index: number) => void;
  /** Fired live on every pointer move — `(nearestIndex, angleDeg, normalized 0–1)`. */
  onInput?: (index: number, angle: number, normalized: number) => void;
  /** Thumb fill colour (per-emotion / sleep / mood). */
  thumbColor?: string;
  /** Override the thumb face (defaults to the nearest stop's emoji). */
  renderThumb?: (nearestIndex: number) => ReactNode;
  trackStrokeWidth?: number;
  fillStrokeWidth?: number;
  thumbSize?: number;
  thumbBorderWidth?: number;
  thumbFontSize?: number;
  dotRadius?: number;
  /**
   * `"nearest"` (default): only the selected dot hides. `"fill-aware"`
   * (onboarding): every dot at/left of the fill hides too (`onboarding.html:2067`).
   */
  dotHideMode?: "nearest" | "fill-aware";
  /** Render track/fill end-cap circles (onboarding 5-stop). */
  endCaps?: { trackRadius: number; fillRadius: number };
  /** SVG viewBox + element height (prototype: 248 workbench, 310 in-app). */
  height?: number;
  pillBottom?: number;
  pillMinWidth?: number;
  pillHeight?: number;
  pillFontSize?: number;
  snapDurationMs?: number;
  ariaLabel?: string;
  className?: string;
}

const WIDTH = 532;

export function ArcSlider({
  stops,
  gradient,
  value,
  defaultValue,
  onChange,
  onInput,
  thumbColor = "#f08b31",
  renderThumb,
  trackStrokeWidth = 68,
  fillStrokeWidth = 48,
  thumbSize = 104,
  thumbBorderWidth = 10,
  thumbFontSize = 48,
  dotRadius = 7,
  dotHideMode = "nearest",
  endCaps,
  height = 310,
  pillBottom = 46,
  pillMinWidth = 160,
  pillHeight = 52,
  pillFontSize = 15,
  snapDurationMs = 400,
  ariaLabel = "Slider",
  className,
}: ArcSliderProps) {
  const n = stops.length;
  const scale = useStudentStageScale();
  const rawGradId = useId();
  const gradId = `arcgrad-${rawGradId.replace(/[^a-zA-Z0-9-]/g, "")}`;

  const stopAngles = useMemo(
    () =>
      Array.from(
        { length: n },
        (_, i) => ARC_A_MAX - (i / (n - 1)) * (ARC_A_MAX - ARC_A_MIN),
      ),
    [n],
  );

  const initialIndex = clampIndex(value ?? defaultValue ?? Math.floor(n / 2), n);

  const [angle, setAngle] = useState<number>(stopAngles[initialIndex]);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);

  // Latest values for the window-level pointer listeners (avoid stale closures).
  const angleRef = useRef(angle);
  angleRef.current = angle;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const nearestOf = useCallback(
    (a: number): number =>
      stopAngles.reduce(
        (best, sa, i) =>
          Math.abs(a - sa) < Math.abs(a - stopAngles[best]) ? i : best,
        0,
      ),
    [stopAngles],
  );

  const nearIndex = nearestOf(angle);

  const emitInput = useCallback(
    (a: number) => {
      const normalized = (ARC_A_MAX - a) / (ARC_A_MAX - ARC_A_MIN);
      onInput?.(nearestOf(a), a, normalized);
    },
    [nearestOf, onInput],
  );

  const moveTo = useCallback(
    (a: number) => {
      const clamped = Math.max(ARC_A_MIN, Math.min(ARC_A_MAX, a));
      setAngle(clamped);
      emitInput(clamped);
    },
    [emitInput],
  );

  const snapTo = useCallback(
    (index: number, animate = true) => {
      const idx = clampIndex(index, n);
      if (animate) setSnapping(true);
      setAngle(stopAngles[idx]);
      emitInput(stopAngles[idx]);
      onChange?.(idx);
    },
    [emitInput, n, onChange, stopAngles],
  );

  // Snap to a controlled `value` change (animated).
  useEffect(() => {
    if (value === undefined) return;
    const idx = clampIndex(value, n);
    setSnapping(true);
    setAngle(stopAngles[idx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Persistent window pointer listeners; gated by `draggingRef`.
  useEffect(() => {
    function clientToAngle(clientX: number, clientY: number): number {
      const el = sliderRef.current;
      if (!el) return angleRef.current;
      const r = el.getBoundingClientRect();
      const s = scaleRef.current || 1;
      return arcAngleAt((clientX - r.left) / s, (clientY - r.top) / s);
    }
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      e.preventDefault();
      moveTo(clientToAngle(e.clientX, e.clientY));
    }
    function onTouchMove(e: TouchEvent) {
      if (!draggingRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      moveTo(clientToAngle(t.clientX, t.clientY));
    }
    function onEnd() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      snapTo(nearestOf(angleRef.current));
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [moveTo, nearestOf, snapTo]);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      draggingRef.current = true;
      setDragging(true);
      setSnapping(false);
      const el = sliderRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const s = scaleRef.current || 1;
      moveTo(arcAngleAt((clientX - r.left) / s, (clientY - r.top) / s));
    },
    [moveTo],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const cur = nearestOf(angleRef.current);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        snapTo(Math.min(cur + 1, n - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        snapTo(Math.max(cur - 1, 0));
      }
    },
    [n, nearestOf, snapTo],
  );

  // Geometry derived per render.
  const trackD = arcPath(ARC_FILL_START, ARC_TRACK_END);
  const fillD = arcPath(ARC_FILL_START, angle);
  const [thumbX, thumbY] = arcPt(ARC_RM, angle);
  const [capLx, capLy] = arcPt(ARC_RM, ARC_FILL_START);
  const [capRx, capRy] = arcPt(ARC_RM, ARC_TRACK_END);
  const [capEx, capEy] = arcPt(ARC_RM, angle);

  const thumbTransition = dragging
    ? "transform .12s ease"
    : snapping
      ? `left ${snapDurationMs}ms cubic-bezier(.34,1.56,.64,1), top ${snapDurationMs}ms cubic-bezier(.34,1.56,.64,1)`
      : "none";

  const thumbStyle: CSSProperties = {
    position: "absolute",
    width: thumbSize,
    height: thumbSize,
    borderRadius: "50%",
    background: thumbColor,
    border: `${thumbBorderWidth}px solid #2f2f37`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: thumbFontSize,
    lineHeight: 1,
    left: thumbX,
    top: thumbY,
    transform: `translate(-50%, -50%) scale(${dragging ? 1.06 : 1})`,
    transition: thumbTransition,
    pointerEvents: "none",
    willChange: "left, top, transform",
    filter: dragging
      ? "drop-shadow(0 8px 28px rgba(0,0,0,.55))"
      : "drop-shadow(0 4px 20px rgba(0,0,0,.5))",
  };

  return (
    <div
      ref={sliderRef}
      tabIndex={0}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={n - 1}
      aria-valuenow={nearIndex}
      aria-valuetext={stops[nearIndex]?.label}
      onKeyDown={onKeyDown}
      className={className}
      style={{
        position: "relative",
        width: WIDTH,
        height,
        overflow: "visible",
        outline: "none",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        width={WIDTH}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient
            id={gradId}
            gradientUnits="userSpaceOnUse"
            x1="48"
            y1="247"
            x2="480"
            y2="247"
          >
            {gradient.map((g, i) => (
              <stop key={i} offset={`${g.offset}%`} stopColor={g.color} />
            ))}
          </linearGradient>
        </defs>

        {endCaps && (
          <>
            <circle
              cx={rnd(capLx)}
              cy={rnd(capLy)}
              r={endCaps.trackRadius}
              fill="#2f2f37"
            />
            <circle
              cx={rnd(capRx)}
              cy={rnd(capRy)}
              r={endCaps.trackRadius}
              fill="#2f2f37"
            />
          </>
        )}

        <path
          d={trackD}
          fill="none"
          stroke="#2f2f37"
          strokeWidth={trackStrokeWidth}
          strokeLinecap="round"
        />
        <path
          d={fillD}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={fillStrokeWidth}
          strokeLinecap="round"
        />

        {endCaps && (
          <>
            <circle
              cx={rnd(capLx)}
              cy={rnd(capLy)}
              r={endCaps.fillRadius}
              fill={`url(#${gradId})`}
            />
            <circle
              cx={rnd(capEx)}
              cy={rnd(capEy)}
              r={endCaps.fillRadius}
              fill={`url(#${gradId})`}
            />
          </>
        )}

        <g>
          {stopAngles.map((a, i) => {
            const [dx, dy] = arcPt(ARC_RM, a);
            const hidden =
              dotHideMode === "fill-aware"
                ? stopAngles[i] > angle || i === nearIndex
                : i === nearIndex;
            return (
              <circle
                key={i}
                cx={rnd(dx)}
                cy={rnd(dy)}
                r={dotRadius}
                fill={hidden ? "transparent" : "#18181f"}
              />
            );
          })}
        </g>
      </svg>

      {/* Hit layer — catches pointer events (svg + thumb are pointer-events:none). */}
      <div
        style={{ position: "absolute", inset: 0 }}
        onMouseDown={(e) => {
          e.preventDefault();
          startDrag(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          e.preventDefault();
          startDrag(t.clientX, t.clientY);
        }}
      />

      <div
        style={thumbStyle}
        onTransitionEnd={() => setSnapping(false)}
      >
        <span>{renderThumb ? renderThumb(nearIndex) : stops[nearIndex]?.emoji}</span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: pillBottom,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#2f2f37",
          borderRadius: 99,
          padding: "0 24px",
          minWidth: pillMinWidth,
          height: pillHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            color: "#f2f3e5",
            fontFamily: "var(--font-student-body)",
            fontSize: pillFontSize,
            fontWeight: 500,
            lineHeight: 1.3,
            textAlign: "center",
            whiteSpace: "pre-line",
          }}
        >
          {(stops[nearIndex]?.label ?? "").replace(/\\n/g, "\n")}
        </span>
      </div>
    </div>
  );
}

function clampIndex(i: number, n: number): number {
  return Math.max(0, Math.min(n - 1, Math.round(i)));
}
