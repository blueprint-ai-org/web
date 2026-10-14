import { useRef, useState } from 'react'

import { studentAsset } from '~/assets/student-app'
import type { CatalogueTile } from '~/lib/student/checkin-catalogue'
import { tileArt } from '~/lib/student/tile-art'

import { MAX_EMOTIONS } from './mood-data'

/**
 * S0 — the emotion picker (`mood-checkin.html:57-144`, `:669-746`,
 * `toggleEm`/`startDetailFlow` :1013-1032). Self-manages the selection (max 3,
 * pick-order preserved, dim-out when maxed) and the empty-Continue shake. On a
 * valid Continue it hands the picked tiles — in pick order — up to the
 * orchestrator, which builds the per-tile detail screens.
 *
 * **The grid is the CATALOGUE's curated categories, in its order.** It used to
 * be the local `EMOTION_GRID_ORDER` with the catalogue looked up into it, which
 * meant a tile whose row was missing rendered and recorded nothing, and a
 * sixteenth row an admin added could not render at all. What stayed local is
 * the art: blob geometry, the SVGs and the label nudge (`tile-art.ts`).
 */

const CHECKBOX_URL = studentAsset('checkbox.svg')

export function EmotionPicker({
  tiles,
  onContinue,
}: {
  tiles: readonly CatalogueTile[]
  onContinue: (tiles: CatalogueTile[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)

  const maxed = selected.length >= MAX_EMOTIONS

  function toggle(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((k) => k !== id)
      if (cur.length >= MAX_EMOTIONS) return cur // maxed — ignore (matches `:1017`)
      return [...cur, id]
    })
  }

  function handleContinue() {
    if (selected.length === 0) {
      // Empty selection → replay the shake (`startDetailFlow`, :1026-1031).
      const grid = gridRef.current
      if (grid) {
        grid.classList.remove('shake')
        void grid.offsetWidth // force reflow so the animation restarts
        grid.classList.add('shake')
        grid.addEventListener('animationend', () => grid.classList.remove('shake'), { once: true })
      }
      return
    }
    // Pick ORDER, not grid order: the detail screens follow the order the
    // student tapped in, which is what the prototype does.
    const byId = new Map(tiles.map((t) => [t.categoryId, t]))
    onContinue(selected.map((id) => byId.get(id)).filter((t): t is CatalogueTile => t !== undefined))
  }

  return (
    <>
      <div className="mc-wrap">
        <h1 className="mc-title">How do you feel today?</h1>
        <p className="mc-sub">Pick up to 3</p>
        <div ref={gridRef} className={`mc-grid${maxed ? ' maxed' : ''}`}>
          {tiles.map((tile) => {
            const isSel = selected.includes(tile.categoryId)
            const art = tileArt(tile.identifier)
            return (
              <button
                key={tile.categoryId}
                type="button"
                className={`mc-em-btn${isSel ? ' sel' : ''}`}
                data-key={tile.identifier}
                aria-pressed={isSel}
                onClick={() => toggle(tile.categoryId)}
              >
                {/* A tile with no art keeps its place and its colour: the
                    catalogue decides what exists, this app only draws it. */}
                {art.iconUrl ? (
                  <img src={art.iconUrl} alt="" />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{ width: 72, height: 72, borderRadius: '50%', background: tile.moods[0]?.color ?? '#68DCC6' }}
                  />
                )}
                <span style={art.labelStyle}>{tile.label}</span>
                <div className="mc-em-check">
                  <img src={CHECKBOX_URL} alt="" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mc-cta">
        <button type="button" className="mc-btn-continue" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </>
  )
}
