import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { ShopCard } from '~/lib/bp-ai/gamification.server'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { COLLECTION_COPY, SECTION_META } from './sparks-data'

/**
 * `/student/sparks/collection` — the collection grid (ports `collection.html`).
 *
 * A full-bleed page (no sidebar): a left stats panel (owned / total counter, a
 * progress bar that fills in on mount, the next milestone's reward,
 * description, and the per-section list) and a right scrollable 4-column grid
 * of collected cards followed by empty slots. Everything is the server's: the
 * earnable (non-SHOP) collectibles with `owned` for this student, and
 * `listMilestones`. Read-only — no writes. Mounted at both
 * `/student/sparks/collection` and `/preview/student/sparks/collection`;
 * client-only render.
 */
export function SparksCollection({ earnable, nextReward }: { earnable: readonly ShopCard[]; nextReward: number | null }) {
  const navigate = useNavigate()
  const base = useStudentNavBase()

  const collected = earnable.filter((c) => c.owned)
  const count = collected.length
  const total = earnable.length
  const pct = total ? Math.round((count / total) * 100) : 0
  const empties = total - count

  // Fill the progress bar from 0 → pct after the first paint (collection.html:214).
  const fillRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (fillRef.current) fillRef.current.style.width = `${pct}%`
    })
    return () => cancelAnimationFrame(raf)
  }, [pct])

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="sparks-collection">
      {/* Left panel background */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 382, background: '#2b2b32', zIndex: 0, pointerEvents: 'none' }} />

      {/* Back */}
      <button
        type="button"
        aria-label="Back"
        onClick={() => navigate(`${base}/sparks`)}
        style={{
          position: 'absolute',
          left: 24,
          top: 48,
          width: 48,
          height: 48,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid #444450',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Layout */}
      <div style={{ position: 'absolute', top: 120, left: 30, right: 40, bottom: 24, display: 'flex', gap: 72 }}>
        {/* Left: stats */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, lineHeight: 1, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 96, color: '#f2f3e5' }}>{count}</span>
            <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 48, color: 'rgba(242,243,229,0.35)' }}>/{total}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 4, background: '#36363f', borderRadius: 2, overflow: 'hidden' }}>
              <div ref={fillRef} style={{ height: '100%', width: 0, background: '#f2f3e5', borderRadius: 2, transition: 'width 600ms var(--ease-student-soft)' }} />
            </div>
            {/* The next milestone's reward; nothing when there is none left. */}
            {nextReward !== null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: '#f2f3e5', whiteSpace: 'nowrap', flexShrink: 0 }}>
                +{nextReward} <img src={studentAsset('spark-4.svg')} alt="sparks" style={{ width: 16, height: 16, display: 'block' }} />
              </span>
            )}
          </div>

          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: '#a4a59f', marginBottom: 32 }}>
            {COLLECTION_COPY.desc[0]}
            <br />
            {COLLECTION_COPY.desc[1]}
          </p>

          {/* Category list */}
          <div style={{ borderTop: '1px solid #36363f' }}>
            {Object.entries(SECTION_META).map(([section, s]) => {
              const owned = collected.filter((c) => c.section === section).length
              return (
                <div key={section} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px', borderBottom: '1px solid #36363f' }}>
                  <img src={studentAsset(s.icon)} alt="" style={{ width: 20, height: 20, display: 'block', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: owned ? '#f2f3e5' : '#636360' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: '#a4a59f' }}>{owned}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: scrollable grid */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', paddingBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {/* No art uploaded yet ⇒ the shop's "owned" fill, as a neutral placeholder. */}
            {collected.map((c) => (
              <div key={c.id} style={{ aspectRatio: '237 / 353', borderRadius: 14, overflow: 'hidden', position: 'relative', background: '#3f50b8' }}>
                {c.art ? <img src={c.art} alt={c.text} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} /> : null}
              </div>
            ))}
            {Array.from({ length: empties }, (_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio: '237 / 353', borderRadius: 14, background: '#2b2b32', border: '1px solid #36363f' }} />
            ))}
          </div>
        </div>
      </div>
    </StudentStage>
  )
}
