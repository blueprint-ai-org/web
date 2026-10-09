import { useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { CATEGORIES, CATEGORY_DEFAULT, type CategoryVideo } from './toolkit-data'
import { CATEGORY_CSS } from './toolkit-styles'

/**
 * `/student/toolkit/category` — a toolkit category listing (ports
 * `category.html`). `?cat=` selects one of the five hardcoded categories
 * (`toolkit-data` `CATEGORIES`); the four videos render in a 2×2 tile grid with
 * a per-tile heart. Back → `/student/toolkit?tab=browse`.
 *
 * Heart note: the prototype's `toggleHeart` (`category.html:241-250`) is
 * visual-only — it swaps the icon but never touches `bp_saved` (only my-toolkit
 * and grades persist saves, research §B). Ported 1:1: hearts here are ephemeral
 * component state and do not survive navigation.
 *
 * Full-bleed page (no sidebar); client-only (see the route's `HydrateFallback`).
 * Mounted at both `/student/toolkit/category` and the preview mirror.
 */

function CategoryTile({ video, saved, onToggle }: { video: CategoryVideo; saved: boolean; onToggle: () => void }) {
  return (
    <div className="cat-tile" style={{ width: 450, height: 450, borderRadius: 20, overflow: 'hidden', position: 'relative', flexShrink: 0, background: video.bg }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <img src={studentAsset(video.art)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <button
        type="button"
        className="cat-heart"
        aria-label={saved ? 'Remove from saved' : 'Save'}
        aria-pressed={saved}
        onClick={onToggle}
        style={{ position: 'absolute', top: 12, right: 12, width: 48, height: 48, background: 'none', border: 'none', padding: 0, margin: 0, zIndex: 2, display: 'block' }}
      >
        <img src={studentAsset(saved ? 'heart-saved.svg' : 'heart-default.svg')} alt="" style={{ width: 48, height: 48, display: 'block' }} />
      </button>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          width: 260,
          background: '#36363f',
          borderRadius: 12,
          padding: 8,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#f2f3e5', lineHeight: 1 }}>
          <span>{video.duration}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {video.sparks} <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 16, height: 16, display: 'block' }} />
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 24, lineHeight: 1.12, color: '#f2f3e5', letterSpacing: '-0.4px', margin: 0 }}>
          {video.title}
        </p>
      </div>
    </div>
  )
}

export function ToolkitCategory() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()

  const catKey = searchParams.get('cat') ?? CATEGORY_DEFAULT
  const cat = CATEGORIES[catKey] ?? CATEGORIES[CATEGORY_DEFAULT]

  // Visual-only heart state, keyed `catKey-index` (category.html:220).
  const [hearts, setHearts] = useState<Set<string>>(() => new Set())
  const toggle = (vid: string) =>
    setHearts((prev) => {
      const next = new Set(prev)
      if (next.has(vid)) next.delete(vid)
      else next.add(vid)
      return next
    })

  const rows = [cat.videos.slice(0, 2), cat.videos.slice(2, 4)]

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="toolkit-category">
      <style>{CATEGORY_CSS}</style>

      <button
        type="button"
        className="cat-back"
        aria-label="Back to toolkit"
        onClick={() => navigate(`${base}/toolkit?tab=browse`)}
        style={{
          position: 'absolute',
          top: 48,
          left: 24,
          zIndex: 20,
          width: 48,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.16)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="#f2f3e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="cat-scroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', paddingTop: 52 }}>
        <div style={{ width: 994, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48, paddingBottom: 40 }}>
          <h1
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 80,
              lineHeight: 1.06,
              color: '#f2f3e5',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {cat.title}
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 924 }}>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 24 }}>
                {row.map((video, ci) => {
                  const vid = `${catKey}-${ri * 2 + ci}`
                  return <CategoryTile key={vid} video={video} saved={hearts.has(vid)} onToggle={() => toggle(vid)} />
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentStage>
  )
}
