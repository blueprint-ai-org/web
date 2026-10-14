import { useState, type CSSProperties, type MouseEvent } from 'react'
import { useFetcher, useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { ContentCategoryView, ToolkitState } from '~/lib/bp-ai/content.server'

import { Sidebar } from '../chrome/Sidebar'
import { SupportPanel } from '../chrome/SupportPanel'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import {
  FILTER_PILLS,
  GRAD_FEATURED,
  GRAD_SOFT,
  TOOLKIT_COPY,
  isToolkitTab,
  lessonTileSpec,
  type TileSpec,
  type ToolkitTab,
} from './toolkit-data'
import { TOOLKIT_HOME_CSS } from './toolkit-styles'

/**
 * `/student/toolkit` — the toolkit home (ports `my-toolkit.html`). Two view
 * states, gated on whether the student has viewed any lesson
 * (`listViewedContent` non-empty — it was a `bp_video_watched` flag):
 *  - **simple** (nothing viewed yet): one featured tile — the first
 *    recommendation — + a "More" button into explore mode;
 *  - **full**: the RECOMMENDED / BROWSE / DO IT AGAIN / SAVED filter tabs.
 *
 * Every tile is a `Lesson`: Recommended is `listRecommendedContent`, Do it
 * again `listViewedContent`, Saved `listSavedContent`, Browse
 * `listContentCategories`. A tab with nothing to show draws nothing in its
 * slots (an unseeded tenant has no lessons).
 *
 * `?preview=simple` forces the simple view; `?explore=1` shows the full
 * library with the sidebar hidden and a back button (explore mode); `?tab=`
 * selects the active filter (e.g. returning from a category as `?tab=browse`).
 * Hearts call `setContentSaved` through the route's action and sync across
 * every tile of the same lesson. (The prototype's "never un-save the last one"
 * rule went with its seeded default: an empty Saved tab has its own copy.)
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
        {/* No figure ⇒ hidden, not removed, so the row keeps its layout. */}
        <span style={{ ...META_STYLE, display: 'flex', alignItems: 'center', gap: 4, visibility: spec.sparks === null ? 'hidden' : 'visible' }}>
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
  onToggleHeart: (lessonId: string) => void
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
        {spec.cover ? <img src={spec.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
      </div>
      {spec.gradient ? <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: spec.gradient, pointerEvents: 'none' }} /> : null}
      <HeartButton
        saved={saved}
        onClick={(e) => {
          e.stopPropagation()
          onToggleHeart(spec.lessonId)
        }}
      />
      <VideoInfo spec={spec} />
    </div>
  )
}

function CategoryCircle({ cat, onOpen }: { cat: ContentCategoryView; onOpen: () => void }) {
  return (
    <div
      className="tk-category"
      onClick={onOpen}
      style={{ width: 220, height: 220, borderRadius: 149, position: 'relative', overflow: 'hidden', flexShrink: 0, background: cat.color }}
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
          {cat.title}
        </span>
      </div>
    </div>
  )
}

export function ToolkitHome({ toolkit }: { toolkit: ToolkitState }) {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()
  const fetcher = useFetcher()

  // View gate — the server's "has viewed a lesson" (my-toolkit.html:613-650).
  const videoWatched = toolkit.viewed.length > 0 && searchParams.get('preview') !== 'simple'
  const exploreMode = searchParams.get('explore') === '1'
  const showFull = videoWatched || exploreMode

  const [activeTab, setActiveTab] = useState<ToolkitTab>(() => {
    const t = searchParams.get('tab')
    return t && isToolkitTab(t) ? t : 'recommended'
  })

  // Hearts: the server's saved set, toggled optimistically. Every lesson the
  // page knows about, so a tile hearted here can join the Saved tab.
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(toolkit.saved.map((l) => l.id)))
  const [known] = useState(() => {
    const byId = new Map<string, TileSpec>()
    for (const l of [...toolkit.saved, ...toolkit.viewed, ...toolkit.recommended]) byId.set(l.id, lessonTileSpec(l))
    return byId
  })

  function toggleHeart(lessonId: string) {
    const saved = !savedSet.has(lessonId)
    setSavedSet((prev) => {
      const next = new Set(prev)
      if (saved) next.add(lessonId)
      else next.delete(lessonId)
      return next
    })
    fetcher.submit({ intent: 'save', lesson: lessonId, saved: String(saved) }, { method: 'post' })
  }

  const openVideo = (lessonId: string) => navigate(`${base}/toolkit/video?lesson=${encodeURIComponent(lessonId)}`)
  const openCategory = (key: string) => navigate(`${base}/toolkit/category?cat=${encodeURIComponent(key)}`)

  const savedTiles = [...savedSet].flatMap((id) => known.get(id) ?? [])
  const featured = toolkit.recommended[0] ? lessonTileSpec(toolkit.recommended[0], GRAD_FEATURED) : null

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
          toolkit={toolkit}
          savedSet={savedSet}
          savedTiles={savedTiles}
          toggleHeart={toggleHeart}
          openVideo={openVideo}
          openCategory={openCategory}
        />
      ) : (
        <SimpleView
          featured={featured}
          savedSet={savedSet}
          toggleHeart={toggleHeart}
          openVideo={openVideo}
          onExplore={() => navigate(`${base}/toolkit?explore=1`)}
        />
      )}

      <SupportPanel />
    </StudentStage>
  )
}

// ── Simple view (my-toolkit.html:380-404) ─────────────────────────────────────

function SimpleView({
  featured,
  savedSet,
  toggleHeart,
  openVideo,
  onExplore,
}: {
  /** The first recommendation; null ⇒ no tile (nothing to recommend yet). */
  featured: TileSpec | null
  savedSet: Set<string>
  toggleHeart: (lessonId: string) => void
  openVideo: (lessonId: string) => void
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

        {featured ? (
          <div
            className="tk-tile tk-featured"
            onClick={() => openVideo(featured.lessonId)}
            style={{ width: '100%', height: 485, borderRadius: 20, overflow: 'hidden', position: 'relative', margin: 'auto 0', background: featured.bg }}
          >
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              {featured.cover ? (
                <img src={featured.cover} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : null}
            </div>
            {featured.gradient ? <div style={{ position: 'absolute', inset: 0, background: featured.gradient }} /> : null}
            <HeartButton
              saved={savedSet.has(featured.lessonId)}
              onClick={(e) => {
                e.stopPropagation()
                toggleHeart(featured.lessonId)
              }}
            />
            <VideoInfo spec={featured} />
          </div>
        ) : null}
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
  toolkit,
  savedSet,
  savedTiles,
  toggleHeart,
  openVideo,
  openCategory,
}: {
  exploreMode: boolean
  activeTab: ToolkitTab
  onTab: (tab: ToolkitTab) => void
  toolkit: ToolkitState
  savedSet: Set<string>
  savedTiles: TileSpec[]
  toggleHeart: (lessonId: string) => void
  openVideo: (lessonId: string) => void
  openCategory: (key: string) => void
}) {
  const recHero = toolkit.recommended[0] ? lessonTileSpec(toolkit.recommended[0]) : null
  const recPair = toolkit.recommended.slice(1, 3).map((l) => lessonTileSpec(l, GRAD_SOFT))
  const doItAgain = toolkit.viewed.slice(0, 2).map((l, i) => lessonTileSpec(l, i === 1 ? GRAD_SOFT : undefined))
  const flexTile = (spec: TileSpec, key: string) => (
    <VideoTile
      key={key}
      spec={spec}
      variant="flex"
      saved={savedSet.has(spec.lessonId)}
      onToggleHeart={toggleHeart}
      onOpen={() => openVideo(spec.lessonId)}
    />
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
          {recHero ? (
            <VideoTile
              spec={recHero}
              variant="hero"
              saved={savedSet.has(recHero.lessonId)}
              onToggleHeart={toggleHeart}
              onOpen={() => openVideo(recHero.lessonId)}
            />
          ) : null}
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>{recPair.map((spec, i) => flexTile(spec, `${spec.lessonId}-${i}`))}</div>
        </div>
      ) : null}

      {/* ── DO IT AGAIN ── */}
      {activeTab === 'doitagain' ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', width: '100%' }}>
          {doItAgain.map((spec, i) => flexTile(spec, `${spec.lessonId}-${i}`))}
        </div>
      ) : null}

      {/* ── SAVED ── */}
      {activeTab === 'saved' ? (
        savedTiles.length > 0 ? (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', width: '100%' }}>
            {savedTiles.map((spec) => flexTile(spec, spec.lessonId))}
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
            {toolkit.categories.slice(0, 3).map((cat) => (
              <CategoryCircle key={cat.key} cat={cat} onOpen={() => openCategory(cat.key)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {toolkit.categories.slice(3).map((cat) => (
              <CategoryCircle key={cat.key} cat={cat} onOpen={() => openCategory(cat.key)} />
            ))}
          </div>
        </div>
      ) : null}
    </main>
  )
}
