import { studentAsset } from '~/assets/student-app'

import { StudentStage } from '../stage/StudentStage'

import { SLEEPING_CSS } from './sleeping-styles'

/**
 * `/student/sleeping` — the "app is sleeping" gate (ports `sleeping.html`).
 *
 * A purely static full-bleed page (no sidebar): a slowly-orbiting moon behind a
 * large blue circle, two eyes whose highlights drift shut, and a floating title
 * + orange message bubble. There is deliberately NO time logic here — the
 * prototype only paints the visuals and their looping animations, so this port
 * adds no timers, redirects, or storage reads (see the migration plan). Copy is
 * baked 1:1 from the prototype's hardcoded text.
 *
 * Geometry is expressed inline in the prototype's stage coordinate space
 * (1194×834). The three looping animations — moon orbit, vertical float, and the
 * SVG `cy` eye-close — live in {@link SLEEPING_CSS} as `sl-*` keyframes. Mounted
 * at both `/student/sleeping` and `/preview/student/sleeping`.
 */
export function SleepingGate() {
  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="student-sleeping">
      <style>{SLEEPING_CSS}</style>

      {/* Moon — stays fixed behind the blue circle, slow orbital drift */}
      <img
        className="sl-moon"
        src={studentAsset('sleeping-moon.svg')}
        alt=""
        style={{
          position: 'absolute',
          width: 203,
          height: 211,
          top: 85,
          right: 45,
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />

      {/* Float wrapper — circle + eyes bob together */}
      <div
        className="sl-float"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      >
        {/* Blue circle */}
        <div
          style={{
            position: 'absolute',
            width: 1910,
            height: 1910,
            borderRadius: '50%',
            background: '#3f50b8',
            left: -352,
            top: 150,
          }}
        />

        {/* Sleeping eyes */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, calc(-50% + 121.5px))',
            display: 'flex',
            gap: 49,
            alignItems: 'flex-start',
            zIndex: 5,
          }}
        >
          {/* Left eye — inlined SVG so the lighter ellipse can animate */}
          <svg
            viewBox="0 0 244.914 329"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 245, height: 329, overflow: 'visible', display: 'block', flexShrink: 0 }}
          >
            <circle cx="122.457" cy="243.28" r="85.72" fill="#384078" />
            <ellipse
              className="sl-eye-light"
              cx="122.457"
              cy="134.703"
              rx="122.457"
              ry="134.703"
              fill="#3F50B8"
            />
          </svg>
          {/* Right eye */}
          <svg
            viewBox="0 0 244.914 329"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 245, height: 329, overflow: 'visible', display: 'block', flexShrink: 0 }}
          >
            <circle cx="122.457" cy="243.28" r="85.72" fill="#384078" />
            <ellipse
              className="sl-eye-light"
              cx="122.457"
              cy="134.703"
              rx="122.457"
              ry="134.703"
              fill="#3F50B8"
            />
          </svg>
        </div>
      </div>

      {/* Title + bubble — also float */}
      <div
        className="sl-float"
        style={{
          position: 'absolute',
          left: 'calc(50% - 248.5px)',
          top: 298,
          width: 497,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-student-display)',
            fontWeight: 400,
            fontSize: 80,
            lineHeight: 1.06,
            letterSpacing: '1.5px',
            color: '#f2f3e5',
            textAlign: 'center',
            margin: 0,
            width: 377,
          }}
        >
          The app
          <br />
          is sleeping
        </h1>

        {/* Message bubble */}
        <div
          style={{
            background: '#f08b31',
            padding: 10,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            width: 395,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              background: '#f2f3e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ position: 'relative', width: 40, height: 40 }}>
              <img
                src={studentAsset('monster-star.svg')}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  transform: 'rotate(180deg) scaleY(-1)',
                }}
              />
              <img
                src={studentAsset('monster-star-eye-l.svg')}
                alt=""
                style={{
                  position: 'absolute',
                  left: 13.3,
                  top: 15.75,
                  width: 6.193,
                  height: 8,
                  transform: 'rotate(180deg) scaleY(-1)',
                }}
              />
              <img
                src={studentAsset('monster-star-eye-r.svg')}
                alt=""
                style={{
                  position: 'absolute',
                  left: 20.7,
                  top: 15.75,
                  width: 6.171,
                  height: 8,
                  transform: 'rotate(180deg) scaleY(-1)',
                }}
              />
            </div>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-student-body)',
              fontSize: 20,
              fontWeight: 500,
              color: '#2f2f37',
              lineHeight: 1.1,
              letterSpacing: '-0.4px',
              margin: 0,
              flex: 1,
            }}
          >
            It is available Monday through Friday, from 9:00 AM to 5:00 PM.
          </p>
        </div>
      </div>
    </StudentStage>
  )
}
