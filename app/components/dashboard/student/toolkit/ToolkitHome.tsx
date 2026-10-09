import { useState, type CSSProperties, type MouseEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { Sidebar } from '../chrome/Sidebar'
import { SupportPanel } from '../chrome/SupportPanel'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import {
  BROWSE_CATEGORIES,
  DO_IT_AGAIN,
  FEATURED_TILE,
  FILTER_PILLS,
  REC_HERO,
  REC_PAIR,
  SAVED_DEFAULT,
  TOOLKIT_COPY,
  VIDEOS,
  isToolkitTab,
  isToolkitVideoId,
  type BrowseCategory,
  type TileSpec,
  type ToolkitTab,
  type ToolkitVideoId,
} from './toolkit-data'
import { TOOLKIT_HOME_CSS } from './toolkit-styles'

/**
 * `/student/toolkit` — the toolkit home (ports `my-toolkit.html`). Two view
 * states gated on `bp_video_watched`:
 *  - **simple** (no video watched yet): a single featured "Calming Breath" tile
 *    + a "More" button into explore mode;
 *  - **full**: the RECOMMENDED / BROWSE / DO IT AGAIN / SAVED filter tabs.
 *
 * `?preview=simple` forces the simple view; `?reset=video` clears the gate;
 * `?explore=1` shows the full library with the sidebar hidden and a back button
 * (explore mode); `?tab=` selects the active filter (e.g. returning from a
 * category as `?tab=browse`). Hearts persist to `bp_saved` (Set-based, min-1
 * rule, `my-toolkit.html:702-731`) and sync across every tile with the same id.
 *
 * Sidebar-bearing stage page; client-only (see the route's `HydrateFallback`).
 * Mounted at both `/student/toolkit` and `/preview/student/toolkit`.
 *
 * Deviation: the prototype ships a fullscreen inline `#yt-overlay` video player
 * (`my-toolkit.html:600-609`) with `openYT`/`closeYT` helpers, but no tile ever
 * calls them — every tile deep-links `toolkit-video.html?video=…`. That overlay
 * is dead code, so this port reproduces the live behaviour (navigate to the
 * video route) and omits the unreachable overlay.
 */

const META_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#f2f3e5',
  letterSpacing: '-0.2px',
}

const TILE_TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-display)',
  fontWeight: 400,
  fontSize: 24,
  color: '#f2f3e5',
  lineHeight: 1.12,
  letterSpacing: '-0.4px',
  margin: 0,
}

function HeartButton({ saved, onClick }: { saved: boolean; onClick: (e: MouseEvent) => void }) {
  return (
    <button
      type="button"
      className="tk-heart"
      onClick={onClick}
      aria-label={saved ? 'Remove from saved' : 'Save'}
      aria-pressed={saved}
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 48,
        height: 48,
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        zIndex: 2,
        display: 'block',
      }}
    >
      <img src={studentAsset(saved ? 'heart-saved.svg' : 'heart-default.svg')} alt="" style={{ width: 48, height: 48, display: 'block' }} />
    </button>
  )
}

function VideoInfo({ spec }: { spec: TileSpec }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 240,
        background: '#36363f',
        borderRadius: 12,
        padding: 8,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={META_STYLE}>{spec.duration}</span>
        <span style={{ ...META_STYLE, display: 'flex', alignItems: 'center', gap: 4 }}>
          {spec.sparks} <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 16, height: 16, display: 'block' }} />
        </span>
      </div>
      <p style={TILE_TITLE_STYLE}>{spec.title}</p>
    </div>
  )
}

function VideoTile({
  spec,
  saved,
  onToggleHeart,
  onOpen,
  variant,
}: {
  spec: TileSpec
  saved: boolean
  onToggleHeart: (vid: ToolkitVideoId) => void
  onOpen: () => void
  variant: 'hero' | 'flex'
}) {
  return (
    <div
      className="tk-tile"
      onClick={onOpen}
      style={{
        ...(variant === 'hero' ? { width: '100%', flex: 'none' } : { flex: 1 }),
        height: 485,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        background: spec.bg,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <img src={studentAsset(spec.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      {spec.gradient ? <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: spec.gradient, pointerEvents: 'none' }} /> : null}
      <HeartButton
        saved={saved}
        onClick={(e) => {
          e.stopPropagation()
          onToggleHeart(spec.vid)
        }}
      />
      <VideoInfo spec={spec} />
    </div>
  )
}

function CategoryCircle({ cat, onOpen }: { cat: BrowseCategory; onOpen: () => void }) {
  return (
    <div
      className="tk-category"
      onClick={onOpen}
      style={{ width: 220, height: 220, borderRadius: 149, position: 'relative', overflow: 'hidden', flexShrink: 0, background: cat.bg }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 24,
          padding: 36,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            flexShrink: 0,
            background: '#1f1f25',
            borderRadius: '50%',
            border: '10px solid #2f2f37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            lineHeight: 1,
            boxSizing: 'border-box',
          }}
        >
          {cat.emoji}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-student-body)',
            fontSize: 20,
            fontWeight: 500,
            color: '#f2f3e5',
            textAlign: 'center',
            letterSpacing: '-0.4px',
            lineHeight: 1.1,
          }}
        >
          {cat.label}
        </span>
      </div>
    </div>
  )
}

export function ToolkitHome() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()

  // View gate — matches the prototype's pre-paint IIFE (my-toolkit.html:613-650).
  const [videoWatched] = useState(() => {
    if (searchParams.get('reset') === 'video') studentStorage.setVideoWatched(false)
    return studentStorage.getVideoWatched() && searchParams.get('preview') !== 'simple'
  })
  const exploreMode = searchParams.get('explore') === '1'
  const showFull = videoWatched || exploreMode

  const [activeTab, setActiveTab] = useState<ToolkitTab>(() => {
    const t = searchParams.get('tab')
    return t && isToolkitTab(t) ? t : 'recommended'
  })

  // Saved set — filter unknown ids, guarantee min-1, persist (my-toolkit.html:702-705).
  const [savedSet, setSavedSet] = useState<Set<ToolkitVideoId>>(() => {
    const arr = studentStorage.getSaved([...SAVED_DEFAULT]).filter(isToolkitVideoId)
    if (arr.length === 0) arr.push('v2')
    const set = new Set(arr)
    studentStorage.setSaved([...set])
    return set
  })

  function toggleHeart(vid: ToolkitVideoId) {
    setSavedSet((prev) => {
      const nowSaved = !prev.has(vid)
      // Never allow removing the last saved item (my-toolkit.html:711).
      if (!nowSaved && prev.size <= 1) return prev
      const next = new Set(prev)
      if (nowSaved) next.add(vid)
      else next.delete(vid)
      studentStorage.setSaved([...next])
      return next
    })
  }

  const openVideo = (slug: string) => navigate(`${base}/toolkit/video?video=${slug}`)
  const openCategory = (slug: string) => navigate(`${base}/toolkit/category?cat=${slug}`)

  const savedTiles: TileSpec[] = [...savedSet].map((vid) => {
    const v = VIDEOS[vid]
    return { vid, bg: v.bg, img: v.img, title: v.title, duration: '1:07', sparks: 1, videoSlug: 'calming-breath' }
  })

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="toolkit-home">
      <style>{TOOLKIT_HOME_CSS}</style>

      {!exploreMode ? <Sidebar /> : null}

      {exploreMode ? (
        <button
          type="button"
          className="tk-explore-back"
          aria-label="Back"
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: 24,
            top: 48,
            width: 48,
            height: 48,
            background: 'rgba(255,255,255,0.16)',
            border: 'none',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15.8334L6.66667 10L12.5 4.16669" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}

      {showFull ? (
        <FullView
          exploreMode={exploreMode}
          activeTab={activeTab}
          onTab={setActiveTab}
          savedSet={savedSet}
          savedTiles={savedTiles}
          toggleHeart={toggleHeart}
          openVideo={openVideo}
          openCategory={openCategory}
        />
      ) : (
        <SimpleView savedSet={savedSet} toggleHeart={toggleHeart} openVideo={openVideo} onExplore={() => navigate(`${base}/toolkit?explore=1`)} />
      )}

      <SupportPanel />
    </StudentStage>
  )
}

// ── Simple view (my-toolkit.html:380-404) ─────────────────────────────────────

function SimpleView({
  savedSet,
  toggleHeart,
  openVideo,
  onExplore,
}: {
  savedSet: Set<ToolkitVideoId>
  toggleHeart: (vid: ToolkitVideoId) => void
  openVideo: (slug: string) => void
  onExplore: () => void
}) {
  return (
    <>
      <section
        style={{
          position: 'absolute',
          left: 152,
          top: 72,
          bottom: 112,
          right: 48,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <h2
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 64,
              lineHeight: 1.06,
              color: '#f2f3e5',
              letterSpacing: '-1px',
              margin: '0 0 16px',
              textAlign: 'left',
            }}
          >
            {TOOLKIT_COPY.title}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-student-body)',
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '-0.1px',
              lineHeight: '20px',
              color: '#737472',
              margin: 0,
            }}
          >
            {TOOLKIT_COPY.desc}
          </p>
        </div>

        <div
          className="tk-tile tk-featured"
          onClick={() => openVideo(FEATURED_TILE.videoSlug)}
          style={{ width: '100%', height: 485, borderRadius: 20, overflow: 'hidden', position: 'relative', margin: 'auto 0', background: FEATURED_TILE.bg }}
        >
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img src={studentAsset(FEATURED_TILE.img)} alt="Calming Breath" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          {FEATURED_TILE.gradient ? <div style={{ position: 'absolute', inset: 0, background: FEATURED_TILE.gradient }} /> : null}
          <HeartButton
            saved={savedSet.has(FEATURED_TILE.vid)}
            onClick={(e) => {
              e.stopPropagation()
              toggleHeart(FEATURED_TILE.vid)
            }}
          />
          <VideoInfo spec={FEATURED_TILE} />
        </div>
      </section>

      <button
        type="button"
        className="tk-explore"
        onClick={onExplore}
        style={{
          position: 'absolute',
          bottom: 64,
          left: 640,
          transform: 'translateX(-50%)',
          height: 48,
          width: 200,
          padding: 0,
          background: 'transparent',
          color: '#f5f5f5',
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.16)',
          letterSpacing: '-0.1px',
          boxShadow: '0 1px 1px rgba(20,21,26,0.03)',
        }}
      >
        {TOOLKIT_COPY.exploreBtn}
      </button>
    </>
  )
}

// ── Full view (my-toolkit.html:407-555) ───────────────────────────────────────

function FullView({
  exploreMode,
  activeTab,
  onTab,
  savedSet,
  savedTiles,
  toggleHeart,
  openVideo,
  openCategory,
}: {
  exploreMode: boolean
  activeTab: ToolkitTab
  onTab: (tab: ToolkitTab) => void
  savedSet: Set<ToolkitVideoId>
  savedTiles: TileSpec[]
  toggleHeart: (vid: ToolkitVideoId) => void
  openVideo: (slug: string) => void
  openCategory: (slug: string) => void
}) {
  const tile = (spec: TileSpec, variant: 'hero' | 'flex') => (
    <VideoTile spec={spec} variant={variant} saved={savedSet.has(spec.vid)} onToggleHeart={toggleHeart} onOpen={() => openVideo(spec.videoSlug)} />
  )

  return (
    <main
      className="tk-scroll"
      style={
        exploreMode
          ? {
              position: 'absolute',
              left: '50%',
              top: 72,
              bottom: 0,
              transform: 'translateX(-50%)',
              width: 994,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }
          : {
              position: 'absolute',
              left: 152,
              top: 72,
              bottom: 0,
              right: 48,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }
      }
    >
      <h2
        style={{
          fontFamily: 'var(--font-student-display)',
          fontWeight: 400,
          fontSize: 64,
          lineHeight: 1.06,
          color: '#f2f3e5',
          letterSpacing: '-1px',
          margin: '0 0 16px',
          textAlign: exploreMode ? 'center' : 'left',
        }}
      >
        {exploreMode ? TOOLKIT_COPY.exploreTitle : TOOLKIT_COPY.title}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: '-0.1px',
          lineHeight: '20px',
          color: '#737472',
          margin: '0 0 36px',
          textAlign: exploreMode ? 'center' : 'left',
        }}
      >
        {TOOLKIT_COPY.desc}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {FILTER_PILLS.map((pill) => {
          const active = pill.tab === activeTab
          return (
            <button
              key={pill.tab}
              type="button"
              className={`tk-filter-pill${active ? ' active' : ''}`}
              onClick={() => onTab(pill.tab)}
              style={{
                height: 40,
                padding: '0 20px',
                borderRadius: 12,
                border: 'none',
                background: active ? '#f2f3e5' : '#2b2b35',
                color: active ? '#1f1f25' : 'rgba(242,243,229,0.5)',
                fontFamily: 'var(--font-student-body)',
                fontSize: 16,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {pill.label}
            </button>
          )
        })}
      </div>

      {/* ── RECOMMENDED ── */}
      {activeTab === 'recommended' ? (
        <div style={{ width: '100%' }}>
          {tile(REC_HERO, 'hero')}
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            {REC_PAIR.map((spec, i) => (
              <VideoTile
                key={`${spec.vid}-${i}`}
                spec={spec}
                variant="flex"
                saved={savedSet.has(spec.vid)}
                onToggleHeart={toggleHeart}
                onOpen={() => openVideo(spec.videoSlug)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── DO IT AGAIN ── */}
      {activeTab === 'doitagain' ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', width: '100%' }}>
          {DO_IT_AGAIN.map((spec, i) => (
            <VideoTile
              key={`${spec.vid}-${i}`}
              spec={spec}
              variant="flex"
              saved={savedSet.has(spec.vid)}
              onToggleHeart={toggleHeart}
              onOpen={() => openVideo(spec.videoSlug)}
            />
          ))}
        </div>
      ) : null}

      {/* ── SAVED ── */}
      {activeTab === 'saved' ? (
        savedTiles.length > 0 ? (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', width: '100%' }}>
            {savedTiles.map((spec) => (
              <VideoTile
                key={spec.vid}
                spec={spec}
                variant="flex"
                saved={savedSet.has(spec.vid)}
                onToggleHeart={toggleHeart}
                onOpen={() => openVideo(spec.videoSlug)}
              />
            ))}
          </div>
        ) : (
          <p
            style={{
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              color: '#a4a59f',
              fontSize: 32,
              textAlign: 'center',
              margin: '120px 0 0',
              width: '100%',
            }}
          >
            {TOOLKIT_COPY.savedEmpty}
          </p>
        )
      ) : null}

      {/* ── BROWSE ── */}
      {activeTab === 'browse' ? (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 40 }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: -12 }}>
            {BROWSE_CATEGORIES.slice(0, 3).map((cat) => (
              <CategoryCircle key={cat.slug} cat={cat} onOpen={() => openCategory(cat.slug)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {BROWSE_CATEGORIES.slice(3).map((cat) => (
              <CategoryCircle key={cat.slug} cat={cat} onOpen={() => openCategory(cat.slug)} />
            ))}
          </div>
        </div>
      ) : null}
    </main>
  )
}
