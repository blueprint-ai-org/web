import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { COLLECTION_COPY, COLLECTION_SECTIONS, COLLECTION_TOTAL } from './sparks-data'

/**
 * `/student/sparks/collection` — the collection grid (ports `collection.html`).
 *
 * A full-bleed page (no sidebar): a left stats panel (x/20 counter, a progress
 * bar that fills in on mount, description, and the four-section category list)
 * and a right scrollable 4-column grid of collected cards followed by empty
 * slots up to 20. The counts derive from `bp_today_sections` (default
 * `["mood"]`). Read-only — no writes. Mounted at both `/student/sparks/collection`
 * and `/preview/student/sparks/collection`; client-only render.
 */
export function SparksCollection() {
  const navigate = useNavigate()
  const base = useStudentNavBase()

  const [doneSections] = useState(() => studentStorage.getTodaySections())
  const collected = COLLECTION_SECTIONS.filter((s) => doneSections.includes(s.key))
  const count = collected.length
  const pct = Math.round((count / COLLECTION_TOTAL) * 100)
  const empties = COLLECTION_TOTAL - count

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
            <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 48, color: 'rgba(242,243,229,0.35)' }}>{COLLECTION_COPY.countDenom}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 4, background: '#36363f', borderRadius: 2, overflow: 'hidden' }}>
              <div ref={fillRef} style={{ height: '100%', width: 0, background: '#f2f3e5', borderRadius: 2, transition: 'width 600ms var(--ease-student-soft)' }} />
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: '#f2f3e5', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {COLLECTION_COPY.progressSparks} <img src={studentAsset('spark-4.svg')} alt="sparks" style={{ width: 16, height: 16, display: 'block' }} />
            </span>
          </div>

          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: '#a4a59f', marginBottom: 32 }}>
            {COLLECTION_COPY.desc[0]}
            <br />
            {COLLECTION_COPY.desc[1]}
          </p>

          {/* Category list */}
          <div style={{ borderTop: '1px solid #36363f' }}>
            {COLLECTION_SECTIONS.map((s) => {
              const done = doneSections.includes(s.key)
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px', borderBottom: '1px solid #36363f' }}>
                  <img src={studentAsset(s.icon)} alt="" style={{ width: 20, height: 20, display: 'block', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: done ? '#f2f3e5' : '#636360' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, lineHeight: '20px', color: '#a4a59f' }}>{done ? '1' : '0'}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: scrollable grid */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', paddingBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {collected.map((s) => (
              <div key={s.key} style={{ aspectRatio: '237 / 353', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                <img src={studentAsset(s.asset)} alt={s.label} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} />
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
