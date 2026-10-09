import { useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { Sidebar } from '../chrome/Sidebar'
import { SupportPanel } from '../chrome/SupportPanel'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { SPARKS_COPY, SPARKS_GRID, SUCCESS_COLLECTIBLE, type GridCard } from './sparks-data'
import { SPARKS_CSS } from './sparks-styles'

/**
 * `/student/sparks` — the Sparkz shop (ports `sparks.html`).
 *
 * A 2×4 artwork grid gated by the `bp_sparks` balance: affordable cards show a
 * centred key and open the unlock overlay (`tryUnlock` → `doBuy`), which plays
 * the clip-path circle burst, the confirm → success crossfade, and the
 * "measure-clone-fly" of the purchased art into its grid slot; already-owned
 * cards deep-link to their collectible with the cloud/lightning exit
 * (`goToCollectible`), and arriving with `?back=1` replays the re-entry
 * choreography. Sidebar-bearing stage page; mounted at both `/student/sparks`
 * and `/preview/student/sparks`. Client-only render (see the route's
 * `HydrateFallback`).
 *
 * Fidelity strategy (matches the journey/journal ports): the component renders
 * once — it holds no state that changes during an interaction — so the entire
 * exit/overlay/flight choreography is driven imperatively over refs (inline
 * styles + `classList`, exactly like the prototype's DOM manipulation) with no
 * React re-render to clobber it. The `?back=1` entry is pure CSS (see
 * `sparks-styles.ts`). The stage scale is read live from the window (as the
 * prototype does) rather than via context, so a mid-animation resize can't force
 * a re-render.
 *
 * Deviations from the prototype (documented, all at non-default balances):
 *  - Affordability is derived uniformly for every shop card, including the "20"
 *    starter card the prototype hardcodes as always-affordable. At the default
 *    360-spark balance the render is identical; below 20 sparks the starter card
 *    correctly shows locked (the prototype left it key-styled but non-functional
 *    via the `tryUnlock` guard). This matches the plan's "balance 0 → all locked"
 *    QA and keeps the data model uniform.
 *  - `closeSuccess` resets the overlay's inline `background-color` so a second
 *    unlock in the same session renders correctly (the prototype left it
 *    `transparent` — an untested repeat path).
 */

const BEZ = 'cubic-bezier(0.75,0,0.3,0.99)'
const BEZ2 = 'cubic-bezier(0.73,-0.01,0.2,0.98)'

/** Live stage scale, computed like the prototype (`sparks.html:660,829`). */
function stageScale(): number {
  return Math.min(window.innerWidth / 1194, window.innerHeight / 834) * 0.96
}

const KEY_PATH =
  'M25 12.2435C25 5.48091 19.4383 0 12.5789 0C5.71978 0 0.158021 5.48149 0.158021 12.2435C0.158021 16.8797 2.77369 20.9141 6.63152 22.9927L0 47H24.9663L18.3583 23.0759C22.3061 21.0238 25 16.9455 25 12.2435Z'
const LOCK_PATH =
  'M36 16H40C41.1046 16 42 16.8954 42 18V42C42 43.1046 41.1046 44 40 44H8C6.89544 44 6 43.1046 6 42V18C6 16.8954 6.89544 16 8 16H12V14C12 7.37258 17.3726 2 24 2C30.6274 2 36 7.37258 36 14V16ZM22 31.4648V36H26V31.4648C27.1956 30.7732 28 29.4806 28 28C28 25.7908 26.2092 24 24 24C21.7908 24 20 25.7908 20 28C20 29.4806 20.8044 30.7732 22 31.4648ZM32 16V14C32 9.58172 28.4182 6 24 6C19.5817 6 16 9.58172 16 14V16H32Z'

const BADGE_NUM_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-display)',
  fontWeight: 400,
  fontSize: 20,
  lineHeight: 1.05,
  color: '#f2f3e5',
  textTransform: 'uppercase',
}

export function SparksShop() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()

  // Read once — affordability + the initial count derive from this. `ensureSparks`
  // lazy-inits to 360 (`sparks.html:686`). `balanceRef` tracks the running total.
  const [initialSparks] = useState(() => studentStorage.ensureSparks())
  const balanceRef = useRef(initialSparks)
  const boughtRef = useRef<Set<number>>(new Set())

  const fromBack = searchParams.get('back') === '1'

  // ── Refs to every imperatively-animated element ──────────────────────────────
  const rootRef = useRef<HTMLDivElement | null>(null)
  const countRef = useRef<HTMLSpanElement | null>(null)
  const cloudRef = useRef<HTMLDivElement | null>(null)
  const lightningRef = useRef<SVGSVGElement | null>(null)
  const headerLeftRef = useRef<HTMLDivElement | null>(null)
  const totalBoxRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const collectionBtnRef = useRef<HTMLButtonElement | null>(null)
  const supportWrapRef = useRef<HTMLDivElement | null>(null)

  const overlayRef = useRef<HTMLDivElement | null>(null)
  const overlayLightningRef = useRef<HTMLImageElement | null>(null)
  const confirmBadgeRef = useRef<HTMLDivElement | null>(null)
  const confirmQuestionRef = useRef<HTMLHeadingElement | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)
  const confirmCostRef = useRef<HTMLSpanElement | null>(null)
  const successArtRef = useRef<HTMLImageElement | null>(null)
  const successLabelRef = useRef<HTMLParagraphElement | null>(null)

  // Unlock flow — mutable, non-render state (mirrors the prototype's module vars).
  const unlockCost = useRef(0)
  const unlockIdx = useRef(-1)
  const unlockCardEl = useRef<HTMLDivElement | null>(null)
  const cardRect = useRef<DOMRect | null>(null)

  const sidebarNav = (): HTMLElement | null =>
    rootRef.current?.querySelector('nav') ?? null

  // ── Exit / re-enter helpers (sparks.html:730-733, 845-859) ───────────────────
  function sidebarExit() {
    const nav = sidebarNav()
    if (!nav) return
    nav.style.transition = `transform 800ms ${BEZ}, opacity 600ms ease`
    nav.style.transform = 'translateY(-50%) translateX(-300px)'
    nav.style.opacity = '0'
  }

  /** Re-enter the sidebar + header/total/grid (removes their `.exit`). */
  function reenterMain(durMs: number, transformEase: string, opacityEase: string) {
    const nav = sidebarNav()
    const trans = `transform ${durMs}ms ${transformEase}, opacity ${durMs}ms ${opacityEase}`
    if (nav) nav.style.transition = trans
    const els = [headerLeftRef.current, totalBoxRef.current, gridRef.current]
    for (const el of els) if (el) el.style.transition = trans
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (nav) {
          nav.style.transform = 'translateY(-50%)'
          nav.style.opacity = '1'
        }
        for (const el of els) el?.classList.remove('exit')
      })
    })
  }

  // ── Unlock flow (sparks.html:715-912) ────────────────────────────────────────
  function tryUnlock(cost: number, idx: number, cardEl: HTMLDivElement) {
    if (boughtRef.current.has(idx)) return // already owned — no re-buy
    if (balanceRef.current < cost) return
    unlockCost.current = cost
    unlockIdx.current = idx
    unlockCardEl.current = cardEl
    if (confirmCostRef.current) confirmCostRef.current.textContent = String(cost)
    if (confirmQuestionRef.current)
      confirmQuestionRef.current.textContent = SPARKS_COPY.confirmQuestion(cost)

    // Capture the card's natural position before the exit moves anything.
    cardRect.current = cardEl.getBoundingClientRect()

    // Exit main content immediately (sparks.html:730-733).
    sidebarExit()
    headerLeftRef.current?.classList.add('exit')
    totalBoxRef.current?.classList.add('exit')
    gridRef.current?.classList.add('exit')

    // Hide the support handle (sparks.html:736-737).
    if (supportWrapRef.current) {
      supportWrapRef.current.style.opacity = '0'
      supportWrapRef.current.style.pointerEvents = 'none'
    }

    // Show the overlay collapsed, then expand the clip-path circle.
    const ov = overlayRef.current
    if (!ov) return
    ov.style.display = 'block'
    ov.style.clipPath = 'circle(0% at 50% 50%)'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ov.style.transition = `clip-path 1000ms ${BEZ2}`
        ov.style.clipPath = 'circle(150% at 50% 50%)'
        window.setTimeout(() => {
          confirmBadgeRef.current?.classList.add('in')
          confirmQuestionRef.current?.classList.add('in')
          confirmBtnRef.current?.classList.add('in')
        }, 200)
      })
    })
  }

  function cancelUnlock() {
    const ov = overlayRef.current
    if (ov) {
      ov.style.transition = `clip-path 600ms ${BEZ2}`
      ov.style.clipPath = 'circle(0% at 50% 50%)'
      window.setTimeout(() => {
        ov.style.display = 'none'
        ov.style.clipPath = ''
        ov.style.transition = ''
        confirmBadgeRef.current?.classList.remove('in')
        confirmQuestionRef.current?.classList.remove('in')
        confirmBtnRef.current?.classList.remove('in')
      }, 620)
    }
    if (supportWrapRef.current) {
      supportWrapRef.current.style.opacity = ''
      supportWrapRef.current.style.pointerEvents = ''
    }
    reenterMain(600, BEZ2, BEZ2)
  }

  function doBuy() {
    const newTotal = Math.max(0, balanceRef.current - unlockCost.current)
    balanceRef.current = newTotal
    if (countRef.current) countRef.current.textContent = String(newTotal)
    studentStorage.setSparks(newTotal)

    // Point the success art at the purchased card's artwork.
    const artImg = unlockCardEl.current?.querySelector('img') as HTMLImageElement | null
    if (successArtRef.current && artImg) successArtRef.current.src = artImg.src
    overlayRef.current?.classList.add('is-success')

    window.setTimeout(startSuccessExit, 1600)
    window.setTimeout(closeSuccess, 3200)
  }

  function startSuccessExit() {
    const cardEl = unlockCardEl.current
    const cRect = cardRect.current
    if (!cardEl || !cRect) return
    const DUR = 1000

    // Overlay background fades so the re-entering content shows through.
    const ov = overlayRef.current
    if (ov) {
      ov.style.pointerEvents = 'none'
      ov.style.transition = 'background-color 700ms ease'
      ov.style.backgroundColor = 'transparent'
    }

    // 1. Lightning expands + fades — the transition medium.
    const lightning = overlayLightningRef.current
    if (lightning) {
      lightning.style.transition = `transform ${DUR}ms ${BEZ2}, opacity 600ms ease 300ms`
      lightning.style.transform = 'translate(-50%,-50%) rotate(-30deg) scale(3)'
      lightning.style.opacity = '0'
    }

    // 2. "New collectible!" slides down.
    const label = successLabelRef.current
    if (label) {
      label.style.transition = `transform ${DUR}ms ${BEZ2}, opacity 700ms ease`
      label.style.transform = 'translateY(400px)'
      label.style.opacity = '0'
    }

    // 3. Art flies to the card slot — measure in device-local coords (÷ scale).
    const s = stageScale()
    const stage = rootRef.current?.closest('[data-student-stage]') as HTMLElement | null
    const art = successArtRef.current
    if (stage && art) {
      const devRect = stage.getBoundingClientRect()
      const artRect = art.getBoundingClientRect()
      const artCX = (artRect.left + artRect.width / 2 - devRect.left) / s
      const artCY = (artRect.top + artRect.height / 2 - devRect.top) / s
      const cardCX = (cRect.left + cRect.width / 2 - devRect.left) / s
      const cardCY = (cRect.top + cRect.height / 2 - devRect.top) / s
      const sc = cRect.width / artRect.width
      art.style.transition = `transform ${DUR}ms ${BEZ2}`
      art.style.transformOrigin = 'center center'
      art.style.transform = `translate(${cardCX - artCX}px,${cardCY - artCY}px) scale(${sc})`
    }

    // 4. Main content re-enters (same duration).
    reenterMain(DUR, BEZ2, 'ease')

    // 5. Art lands → convert the card to owned, fade the flying art.
    window.setTimeout(() => {
      boughtRef.current.add(unlockIdx.current)
      cardEl.style.background = '#3f50b8'
      cardEl.style.cursor = 'default'
      cardEl.querySelectorAll<HTMLElement>('[data-spk-cover]').forEach((el) => {
        el.style.display = 'none'
      })
      if (art) {
        art.style.transition = 'opacity 150ms ease'
        art.style.opacity = '0'
      }
    }, 950)
  }

  function closeSuccess() {
    const ov = overlayRef.current
    if (ov) {
      ov.style.transition = 'none'
      ov.style.clipPath = ''
      ov.style.display = 'none'
      ov.classList.remove('is-success')
      ov.style.backgroundColor = '' // reset (prototype leaves it transparent — bug)
      ov.style.pointerEvents = ''
      window.setTimeout(() => {
        if (overlayRef.current) overlayRef.current.style.transition = ''
      }, 50)
    }
    confirmBadgeRef.current?.classList.remove('in')
    confirmQuestionRef.current?.classList.remove('in')
    confirmBtnRef.current?.classList.remove('in')

    for (const el of [successArtRef.current, successLabelRef.current, overlayLightningRef.current]) {
      if (!el) continue
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      el.style.transformOrigin = ''
    }

    const nav = sidebarNav()
    if (nav) {
      nav.style.transition = ''
      nav.style.transform = 'translateY(-50%)'
      nav.style.opacity = ''
    }
    for (const el of [headerLeftRef.current, totalBoxRef.current, gridRef.current]) {
      if (el) {
        el.classList.remove('exit')
        el.style.transition = ''
      }
    }

    unlockCardEl.current = null
    unlockIdx.current = -1
    cardRect.current = null
  }

  // ── Owned reward → collectible, with the cloud/lightning exit (sparks.html:914-929)
  function goToCollectible(cid: number) {
    sidebarExit()
    headerLeftRef.current?.classList.add('exit')
    totalBoxRef.current?.classList.add('exit')
    gridRef.current?.classList.add('exit')
    collectionBtnRef.current?.classList.add('exit')
    cloudRef.current?.classList.add('exit')
    lightningRef.current?.classList.add('exit')
    window.setTimeout(() => {
      navigate(`${base}/sparks/collectible?c=${cid}&anim=1`)
    }, 800)
  }

  const sparkIcon = studentAsset('spark-4.svg')

  const rows: GridCard[][] = [SPARKS_GRID.slice(0, 4), SPARKS_GRID.slice(4, 8)]

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="sparks">
      <style>{SPARKS_CSS}</style>

      <div
        ref={rootRef}
        className={`spk-inner${fromBack ? ' from-collectible' : ''}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Cloud background (animates out on the collectible transition). */}
        <div
          ref={cloudRef}
          className="spk-cloud"
          style={{
            position: 'absolute',
            width: 1499,
            height: 937,
            left: -203,
            top: 55,
            pointerEvents: 'none',
            zIndex: 0,
            transformOrigin: 'center center',
          }}
        >
          <img src={studentAsset('cloud-1.svg')} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Lightning background. */}
        <svg
          ref={lightningRef}
          className="spk-lightning"
          viewBox="0 0 600 600"
          fill="none"
          style={{ position: 'absolute', left: -299, top: -416, width: 1865, height: 1865, pointerEvents: 'none', zIndex: 0 }}
        >
          <path d="M350 50 L200 320 L310 320 L160 550 L420 250 L300 250 L450 50Z" fill="#1f1f25" />
        </svg>

        <Sidebar />

        {/* Main content */}
        <div style={{ position: 'absolute', left: 152, top: 72, bottom: 100, width: 998, zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
            <div ref={headerLeftRef} className="spk-header-left" style={{ width: 532, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-student-display)',
                  fontWeight: 400,
                  fontSize: 64,
                  lineHeight: 1.06,
                  color: '#f2f3e5',
                  margin: 0,
                }}
              >
                {SPARKS_COPY.title}
              </h1>
              <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#737472', letterSpacing: '-0.1px', margin: 0 }}>
                {SPARKS_COPY.subtitle}
              </p>
            </div>
            <div
              ref={totalBoxRef}
              className="spk-total-box"
              style={{
                width: 'calc((100% - 48px) / 4)',
                background: '#1f1f25',
                border: '1px solid #444450',
                borderRadius: 20,
                padding: 36,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 12, fontWeight: 500, color: '#737472' }}>{SPARKS_COPY.totalLabel}</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'var(--font-student-display)',
                  fontWeight: 400,
                  fontSize: 32,
                  lineHeight: '40px',
                  letterSpacing: '-0.8px',
                  color: '#f2f3e5',
                }}
              >
                <span ref={countRef}>{initialSparks}</span>
                <img src={sparkIcon} alt="spark" style={{ width: 32, height: 32, display: 'block' }} />
              </div>
            </div>
          </div>

          {/* Artwork grid */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
            <div ref={gridRef} className="spk-grid" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
              {rows.map((row, r) => (
                <div key={r} style={{ display: 'flex', gap: 16 }}>
                  {row.map((card, c) => {
                    const idx = r * 4 + c
                    return <ArtCard key={idx} card={card} idx={idx} affordable={initialSparks >= (card.kind === 'shop' ? card.cost : 0)} sparkIcon={sparkIcon} onBuy={tryUnlock} onOwned={goToCollectible} />
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* View collection button */}
        <button
          ref={collectionBtnRef}
          type="button"
          className="spk-collection-btn"
          onClick={() => navigate(`${base}/sparks/collection`)}
        >
          {SPARKS_COPY.collectionBtn}
        </button>

        {/* ── Unlock overlay ──────────────────────────────────────────────── */}
        <div ref={overlayRef} className="spk-unlock-overlay">
          <button type="button" className="spk-overlay-back" onClick={cancelUnlock} aria-label="Cancel">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10L13 16" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <img ref={overlayLightningRef} className="spk-overlay-lightning" src={studentAsset('lightning-1.svg')} alt="" />

          <div className="spk-oc-confirm">
            <div ref={confirmBadgeRef} className="spk-confirm-badge">
              <span ref={confirmCostRef} style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 20, color: '#f2f3e5' }}>
                20
              </span>
              <img src={sparkIcon} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
            </div>
            <h1 ref={confirmQuestionRef} className="spk-confirm-question">
              {SPARKS_COPY.confirmQuestion(20)}
            </h1>
            <button ref={confirmBtnRef} type="button" className="spk-confirm-btn" onClick={doBuy}>
              {SPARKS_COPY.buyBtn}
            </button>
          </div>

          <div className="spk-oc-success" style={{ cursor: 'pointer' }} onClick={() => goToCollectible(SUCCESS_COLLECTIBLE)}>
            <img ref={successArtRef} className="spk-success-art" src={studentAsset('frame-1308.svg')} alt="New collectible" />
            <p ref={successLabelRef} className="spk-success-label">
              {SPARKS_COPY.successLabel}
            </p>
          </div>
        </div>

        {/* Support panel (hidden during the unlock overlay). */}
        <div ref={supportWrapRef}>
          <SupportPanel />
        </div>
      </div>
    </StudentStage>
  )
}

// ── Art card ──────────────────────────────────────────────────────────────────

interface ArtCardProps {
  card: GridCard
  idx: number
  affordable: boolean
  sparkIcon: string
  onBuy: (cost: number, idx: number, el: HTMLDivElement) => void
  onOwned: (cid: number) => void
}

function ArtCard({ card, idx, affordable, sparkIcon, onBuy, onOwned }: ArtCardProps) {
  const cardStyle: CSSProperties = {
    flex: 1,
    height: 241,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    border: 'none',
  }

  if (card.kind === 'owned') {
    return (
      <div
        className="spk-art-card"
        onClick={() => onOwned(card.collectible)}
        style={{ ...cardStyle, background: '#3f50b8', cursor: 'pointer' }}
      >
        <img src={studentAsset(card.art)} alt="Artwork" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  // Shop card — affordable (key) vs locked (padlock).
  return (
    <div
      className="spk-art-card"
      onClick={affordable ? (e) => onBuy(card.cost, idx, e.currentTarget as HTMLDivElement) : undefined}
      style={{ ...cardStyle, background: '#1f1f25', cursor: affordable ? 'pointer' : 'default' }}
    >
      <img src={studentAsset(card.art)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div data-spk-cover="" style={{ position: 'absolute', inset: 0, zIndex: 1, background: affordable ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.89)' }} />

      {affordable ? (
        <div data-spk-cover="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 25, height: 47, zIndex: 2, pointerEvents: 'none' }}>
          <svg viewBox="0 0 25 47" fill="none" style={{ width: '100%', height: '100%', display: 'block' }}>
            <path d={KEY_PATH} fill="#36363f" />
          </svg>
        </div>
      ) : (
        <div data-spk-cover="" style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, width: 24, height: 24, pointerEvents: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
            <path d={LOCK_PATH} fill="#444450" />
          </svg>
        </div>
      )}

      <div
        data-spk-cover=""
        style={{
          position: 'absolute',
          bottom: 11,
          left: 11,
          zIndex: 2,
          borderRadius: 99,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: affordable ? 1 : 0.4,
        }}
      >
        <span style={BADGE_NUM_STYLE}>{card.cost}</span>
        <img src={sparkIcon} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
      </div>
    </div>
  )
}
