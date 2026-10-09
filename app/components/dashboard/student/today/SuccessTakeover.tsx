import { useEffect, useState } from 'react'

import { studentAsset } from '~/assets/student-app'

import { SUCCESS } from './today-data'

/**
 * The all-done success takeover (`today.html:633-655`, `showSuccessScreen`
 * :945-973). A `#1f1f25` ellipse rises from `translate(-7px,-688px)` to rest
 * over 800 ms; at 700 ms the "+10 / You crushed it today!" reward, the monster
 * bubble, and the "Done" CTA fade in. Dismiss reveals the (already-rendered) hub
 * underneath — the prototype full-reloaded with `bp_skip_success` to avoid a
 * replay; here we just hide the layer, and `_freshCompletion` is already false
 * on any later load so it can't replay anyway.
 */

const SPARK_FRAMES = ['spark-4.svg', 'spark-01.svg', 'spark-02.svg', 'spark-03.svg']

export function SuccessTakeover({ onDone }: { onDone: () => void }) {
  const [settled, setSettled] = useState(false)
  const [contentIn, setContentIn] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setSettled(true)))
    const timer = window.setTimeout(() => setContentIn(true), SUCCESS.contentDelayMs)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [])

  const fade: React.CSSProperties = {
    opacity: contentIn ? 1 : 0,
    transition: `opacity ${SUCCESS.contentFadeMs}ms ease`,
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#49aee1', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: -351,
          top: 150,
          width: 1910,
          height: 1910,
          borderRadius: '50%',
          background: '#1f1f25',
          transform: settled ? 'translate(0px, 0px)' : 'translate(-7px, -688px)',
          transition: `transform ${SUCCESS.ellipseMs}ms ${SUCCESS.ellipseEasing}`,
        }}
      />

      <div style={{ position: 'absolute', left: 291, top: 253, width: 613, textAlign: 'center', ...fade }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 32,
              lineHeight: '40px',
              letterSpacing: '-0.8px',
              color: '#f2f3e5',
            }}
          >
            +10
          </span>
          <div className="th-spark-badge">
            {SPARK_FRAMES.map((f) => (
              <img key={f} src={studentAsset(f)} alt="spark" />
            ))}
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 80, lineHeight: '106%', color: '#f2f3e5', margin: 0 }}>
          You crushed
          <br />
          it today!
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 511,
          transform: 'translateX(-50%)',
          width: 395,
          background: '#f08b31',
          borderRadius: 12,
          padding: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          ...fade,
        }}
      >
        <div style={{ width: 48, height: 48, flexShrink: 0, overflow: 'hidden', background: '#f2f3e5' }}>
          <img src={studentAsset('monster-01.svg')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#2f2f37', lineHeight: 1.1, paddingTop: 4, margin: 0 }}>
          You collected all the cards and got to know yourself a little bit more!
        </p>
      </div>

      <div style={{ position: 'absolute', bottom: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 20, ...fade }}>
        <button
          type="button"
          onClick={onDone}
          style={{
            width: 270,
            height: 48,
            background: '#f2f3e5',
            color: '#1f1f25',
            fontFamily: 'var(--font-student-body)',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
