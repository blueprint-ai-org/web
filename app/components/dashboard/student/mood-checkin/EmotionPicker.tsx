import { useRef, useState } from 'react'

import { studentAsset } from '~/assets/student-app'
import { emotionLabel, type CheckinCatalogue } from '~/lib/student/checkin-catalogue'
import { type EmotionKey } from '~/lib/student/emotions'

import { EMOTION_GRID_ORDER, EMOTION_LABEL_PADDING, MAX_EMOTIONS } from './mood-data'

/**
 * S0 — the 15-emotion picker (`mood-checkin.html:57-144`, `:669-746`,
 * `toggleEm`/`startDetailFlow` :1013-1032). Self-manages the selection (max 3,
 * pick-order preserved, dim-out when maxed) and the empty-Continue shake. On a
 * valid Continue it hands the picked keys — in pick order — up to the
 * orchestrator, which builds the per-emotion detail screens.
 *
 * **The grid is always the same fifteen.** It is driven by `EMOTION_GRID_ORDER`
 * and not by the catalogue, because each tile carries hand-placed art, its own
 * label-padding nudge and its own blob geometry — a sixteenth catalogue row has
 * none of those and could not be drawn. The catalogue contributes the *wording*
 * only, per `emotionLabel`, so an admin rewording a mood renames its tile and a
 * tenant with no catalogue at all still gets the full picker.
 */

const CHECKBOX_URL = studentAsset('checkbox.svg')

function labelStyle(key: EmotionKey): React.CSSProperties | undefined {
  const rule = EMOTION_LABEL_PADDING[key]
  if (!rule) return undefined
  const [prop, px] = rule.split(': ')
  return { [prop]: Number(px) } as React.CSSProperties
}

export function EmotionPicker({
  catalogue,
  onContinue,
}: {
  catalogue: CheckinCatalogue
  onContinue: (keys: EmotionKey[]) => void
}) {
  const [selected, setSelected] = useState<EmotionKey[]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)

  const maxed = selected.length >= MAX_EMOTIONS

  function toggle(key: EmotionKey) {
    setSelected((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key)
      if (cur.length >= MAX_EMOTIONS) return cur // maxed — ignore (matches `:1017`)
      return [...cur, key]
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
    onContinue(selected)
  }

  return (
    <>
      <div className="mc-wrap">
        <h1 className="mc-title">How do you feel today?</h1>
        <p className="mc-sub">Pick up to 3</p>
        <div ref={gridRef} className={`mc-grid${maxed ? ' maxed' : ''}`}>
          {EMOTION_GRID_ORDER.map((key) => {
            const isSel = selected.includes(key)
            return (
              <button
                key={key}
                type="button"
                className={`mc-em-btn${isSel ? ' sel' : ''}`}
                data-key={key}
                aria-pressed={isSel}
                onClick={() => toggle(key)}
              >
                <img src={studentAsset(`emotion-${key}.svg`)} alt="" />
                <span style={labelStyle(key)}>{emotionLabel(catalogue, key)}</span>
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
