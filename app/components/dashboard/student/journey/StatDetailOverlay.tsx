import type { CSSProperties, RefObject } from 'react'

import { studentAsset } from '~/assets/student-app'

import {
  ACTIVITY_BUBBLES,
  CHECKIN_DONE_COLOR,
  CHECKIN_GRID,
  FEEL_SHAPES,
  SPARKS_CAPTION,
  STAT_CAPTIONS,
  SWARM,
  type StatCaption,
  type StatKey,
} from './journey-data'

/**
 * The stat-detail overlay (`journey.html:875-885,1174-1384`). A full-stage panel
 * that clip-path-reveals from the bottom (the reveal is driven imperatively by
 * {@link JourneyHome} on `overlayRef`) and renders one of four visualisations:
 *
 *  - **feelings** — six organic emotion tiles floating in a 0.75-scaled field;
 *  - **checkins** — a 5×4 calendar-dot grid (lit dots float);
 *  - **sparks** — the 36-spark spring swarm (positions driven by
 *    {@link useSparkSwarm} via `fieldRef`);
 *  - **activities** — five coloured activity bubbles.
 *
 * Every variant carries the bottom-left `feel-stat` caption. The prototype's
 * left info panel (`sdo-left`) is `display:none` for all four keys — its
 * builders (`sdoMakeLeft`/`sdoBuildSparks`/`sdoBuildCalendar`, the only place any
 * Polish lived) are never called — so this port renders the right panel only,
 * matching the live prototype 1:1 (see `journey-data.ts` `STAT_DETAIL_LEFT_COPY`
 * for the baked English of that hidden panel).
 */

const FIELD_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
}

const CAPTION_WRAP: CSSProperties = {
  position: 'absolute',
  bottom: 48,
  left: 40,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  zIndex: 2,
}

const CAPTION_NUM: CSSProperties = {
  fontFamily: 'var(--font-student-display)',
  fontWeight: 400,
  fontSize: 80,
  lineHeight: 1.06,
  color: '#f2f3e5',
  margin: 0,
  letterSpacing: '1.5px',
}

const CAPTION_LBL: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 18,
  fontWeight: 500,
  color: '#737472',
  margin: 0,
  lineHeight: 1.4,
}

const BADGE_STYLE: CSSProperties = {
  width: 40,
  height: 40,
  background: '#1f1f25',
  borderRadius: 9,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-student-display)',
  fontSize: 20,
  lineHeight: 1,
  color: '#f2f3e5',
}

const NAME_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-display)',
  fontSize: 18,
  lineHeight: 1.05,
  color: '#1f1f25',
  textTransform: 'uppercase',
  textAlign: 'center',
  whiteSpace: 'nowrap',
}

function OverlayBadge({ count, name, bx, by }: { count: number; name: string; bx: number; by: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: bx,
        top: by,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        width: 66,
      }}
    >
      <div style={BADGE_STYLE}>{count}</div>
      <span style={NAME_STYLE}>{name}</span>
    </div>
  )
}

function Caption({ caption }: { caption: StatCaption }) {
  return (
    <div style={CAPTION_WRAP}>
      <p style={CAPTION_NUM}>{caption.num}</p>
      <p style={CAPTION_LBL}>
        {caption.line1}
        <br />
        {caption.line2}
      </p>
    </div>
  )
}

function FeelingsField() {
  return (
    <div style={FIELD_STYLE}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.75)', transformOrigin: 'center 40%' }}>
        {FEEL_SHAPES.map((s) => (
          <div
            key={s.name}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.w,
              height: s.h,
              animation: `${s.anim} ${s.dur} ease-in-out infinite ${s.delay}`,
            }}
          >
            <img
              src={studentAsset(`emotions/${s.svgFile}.svg`)}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                position: 'absolute',
                inset: 0,
                ...(s.imgRot ? { transform: `rotate(${s.imgRot}deg)`, transformOrigin: '50% 50%' } : {}),
              }}
            />
            <OverlayBadge count={s.count} name={s.name} bx={s.bx} by={s.by} />
          </div>
        ))}
      </div>
      <Caption caption={STAT_CAPTIONS.feelings} />
    </div>
  )
}

function CheckinsField() {
  return (
    <div style={FIELD_STYLE}>
      {CHECKIN_GRID.map((c, i) =>
        c.done ? (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.left,
              top: c.top,
              width: 114,
              height: 114,
              borderRadius: '50%',
              background: CHECKIN_DONE_COLOR,
              animation: `${c.anim} ${c.dur} ease-in-out infinite ${c.delay}`,
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.left,
              top: c.top,
              width: 114,
              height: 114,
              borderRadius: '50%',
              border: '3px solid #36363F',
              boxSizing: 'border-box',
            }}
          />
        ),
      )}
      <Caption caption={STAT_CAPTIONS.checkins} />
    </div>
  )
}

function ActivitiesField() {
  return (
    <div style={FIELD_STYLE}>
      {ACTIVITY_BUBBLES.map((b) => (
        <div
          key={b.name}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.d,
            height: b.d,
            borderRadius: '50%',
            background: b.color,
            animation: `${b.anim} ${b.dur} ease-in-out infinite ${b.delay}`,
          }}
        >
          <OverlayBadge count={b.count} name={b.name} bx={b.bx} by={b.by} />
        </div>
      ))}
      <Caption caption={STAT_CAPTIONS.activities} />
    </div>
  )
}

function SparksField({ sparks, fieldRef }: { sparks: number; fieldRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div style={FIELD_STYLE} ref={fieldRef}>
      {Array.from({ length: SWARM.COUNT }, (_, i) => (
        <img
          key={i}
          className="jy-spark"
          src={studentAsset('spark-4.svg')}
          alt=""
          style={{ position: 'absolute', width: 50, height: 50, pointerEvents: 'none', left: 0, top: 0 }}
        />
      ))}
      <div style={CAPTION_WRAP}>
        <p style={CAPTION_NUM}>{sparks}</p>
        <p style={CAPTION_LBL}>
          {SPARKS_CAPTION.line1}
          <br />
          {SPARKS_CAPTION.line2}
        </p>
      </div>
    </div>
  )
}

export function StatDetailOverlay({
  statKey,
  sparks,
  fieldRef,
  overlayRef,
  onClose,
}: {
  statKey: StatKey
  sparks: number
  fieldRef: RefObject<HTMLDivElement | null>
  overlayRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}) {
  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        pointerEvents: 'all',
        background: '#1f1f25',
      }}
    >
      <button
        type="button"
        className="jy-stat-back"
        aria-label="Back"
        onClick={onClose}
        style={{
          position: 'absolute',
          left: 24,
          top: 36,
          width: 48,
          height: 48,
          background: 'rgba(255,255,255,0.16)',
          border: 'none',
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          zIndex: 10,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div style={{ flex: 'initial', width: '100%', position: 'relative', overflow: 'hidden' }}>
        {statKey === 'feelings' ? <FeelingsField /> : null}
        {statKey === 'checkins' ? <CheckinsField /> : null}
        {statKey === 'activities' ? <ActivitiesField /> : null}
        {statKey === 'sparks' ? <SparksField sparks={sparks} fieldRef={fieldRef} /> : null}
      </div>
    </div>
  )
}
