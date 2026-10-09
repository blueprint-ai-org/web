import { useEffect, useRef, useState } from 'react'

import { studentAsset } from '~/assets/student-app'
import type { CheckinQuestionRow } from '~/lib/student/checkin-catalogue'
import type { Emotion } from '~/lib/student/emotions'

import { MoodNav } from './MoodChrome'
import { PICKER_EMOJI, WHY_BLOCKS, WHY_DECO_POS, type WhyDecoSlot } from './mood-data'

/**
 * The "What's going on?" reason screen (`buildWhyScreen`, `mood-checkin.html:1215-1253`;
 * add-other + emoji picker :1255-1386). One screen for the whole selection: the
 * picked emotions' grid icons decorate the corners (slot per count,
 * {@link WHY_DECO_POS}), and a 4-column grid of reason chips (multi-select) plus
 * an "Add other" cell that expands into a text field with an emoji picker.
 *
 * The selection is lifted to the orchestrator via `onReasonsChange` — labels
 * for `bp_mood_reasons` (matching `finishMoodCheckin` reading every
 * `.why-block.sel .why-label`), plus the catalogue option ids and the free-text
 * entry, which are what actually get recorded. The decos carry `mc-why-deco`
 * classes + `data-slot` so the orchestrator can drive their slide-in/out.
 *
 * ## Two questions behind one screen
 *
 * The eight chips are the `mood_reason` MULTISELECT the platform seeds, read
 * from the catalogue and falling back to {@link WHY_BLOCKS}. **That row caps at
 * three** — the gateway validates a MULTISELECT answer against `max_selections`
 * and refuses the whole thing if it is over, so a fourth chip is ignored the way
 * the picker ignores a fourth emotion (`mood-checkin.html:1017`).
 *
 * "Add other" cannot be an option on that row — a MULTISELECT takes only ids it
 * already knows — so a custom reason is the answer to a separate `OPEN`
 * companion question, and its emoji is kept with the text (`"🎮 Gaming"`)
 * rather than dropped. Custom entries do **not** count toward the cap of three.
 */

interface Block {
  id: string
  emoji: string
  label: string
}

const BASE_BLOCKS: Block[] = WHY_BLOCKS.map((b, i) => ({ id: `b${i}`, emoji: b.emoji, label: b.label }))

/** `max_selections` on the seeded `mood_reason` row. */
const MAX_REASONS = 3

const DECO_ROTATION: Partial<Record<WhyDecoSlot, string>> = { bl: 'rotate(30deg)', mr: 'rotate(40deg)' }

/** What the screen collected, in the two shapes the orchestrator needs. */
export interface ReasonSelection {
  /** Every chosen label, custom ones included — persisted as `bp_mood_reasons`. */
  labels: string[]
  /** Catalogue option ids for the MULTISELECT answer. Never more than the cap. */
  optionIds: string[]
  /** The free-text reason with its emoji, for the OPEN companion. */
  other: string | null
}

export function WhyScreen({
  question,
  selectedEmotions,
  onReasonsChange,
  onBack,
  onNext,
}: {
  question?: CheckinQuestionRow | null
  selectedEmotions: Emotion[]
  onReasonsChange: (selection: ReasonSelection) => void
  onBack: () => void
  onNext: () => void
}) {
  const [customBlocks, setCustomBlocks] = useState<Block[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // add-other flow
  const [adding, setAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [addEmoji, setAddEmoji] = useState('✏️')
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // The catalogue row when the loader found it, the prototype's eight when it
  // did not. Either way the grid is eight cells plus "Add other", so the
  // 4-column layout and its deco slots are untouched.
  const catalogueBlocks: Block[] = (question?.options ?? []).map((o, i) => ({
    id: o.id,
    emoji: o.emoji ?? BASE_BLOCKS[i]?.emoji ?? '📌',
    label: o.label,
  }))
  const baseBlocks = catalogueBlocks.length > 0 ? catalogueBlocks : BASE_BLOCKS
  const blocks = [...baseBlocks, ...customBlocks]

  // `max_selections` on the seeded row is 3. Without a catalogue there is
  // nothing to record anyway, so the prototype's uncapped behaviour stands.
  const cap = question ? MAX_REASONS : Infinity
  const baseIds = new Set(baseBlocks.map((b) => b.id))
  const chosenBase = [...selected].filter((id) => baseIds.has(id))

  useEffect(() => {
    const chosen = blocks.filter((b) => selected.has(b.id))
    onReasonsChange({
      labels: chosen.map((b) => b.label),
      // Only catalogue rows have ids the gateway knows; a custom block's id is
      // client-minted and would be refused.
      optionIds: chosen.filter((b) => baseIds.has(b.id)).map((b) => b.id),
      other: customBlocks.filter((b) => selected.has(b.id)).map((b) => `${b.emoji} ${b.label}`).join(', ') || null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, customBlocks, question])

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      // A fourth chip is ignored rather than swapped in — the gateway refuses
      // the whole answer if it carries more ids than `max_selections`.
      if (baseIds.has(id) && chosenBase.length >= cap) return cur
      next.add(id)
      return next
    })
  }

  function startAdding() {
    setAdding(true)
    setAddValue('')
    setAddEmoji('✏️')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function cancelAdding() {
    setAdding(false)
    setPickerOpen(false)
    setAddValue('')
  }

  function confirmAdding() {
    const val = addValue.trim()
    setPickerOpen(false)
    if (!val) {
      cancelAdding()
      return
    }
    const id = `c${customBlocks.length}-${val}`
    setCustomBlocks((cur) => [...cur, { id, emoji: addEmoji === '✏️' ? '📌' : addEmoji, label: val }])
    setSelected((cur) => new Set(cur).add(id))
    setAdding(false)
    setAddValue('')
    setAddEmoji('✏️')
  }

  const decoSlots = WHY_DECO_POS[(Math.min(selectedEmotions.length, 3) || 1) as 1 | 2 | 3]

  return (
    <>
      {selectedEmotions.slice(0, 3).map((em, i) => {
        const slot = decoSlots[i]
        return (
          <div
            key={em.key}
            className={`mc-why-deco mc-why-deco-${slot}`}
            data-slot={slot}
            style={decoGeometry(slot)}
          >
            <img src={studentAsset(`emotion-${em.key}.svg`)} alt="" />
          </div>
        )
      })}

      <h2 className="mc-why-title">What&rsquo;s going on?</h2>

      <div className="mc-why-grid">
        {blocks.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`mc-why-block${selected.has(b.id) ? ' sel' : ''}`}
            onClick={() => toggle(b.id)}
          >
            <div className="mc-why-icon">
              <span className="mc-why-emoji">{b.emoji}</span>
            </div>
            <span className="mc-why-label">{b.label}</span>
          </button>
        ))}

        {adding ? (
          <div className="mc-why-block mc-why-block--input" style={{ position: 'relative' }}>
            <div
              className="mc-why-icon"
              style={{ cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setPickerOpen((o) => !o)}
            >
              <span className="mc-why-emoji">{addEmoji}</span>
            </div>
            <input
              ref={inputRef}
              className="mc-why-input-field"
              type="text"
              placeholder="Type here…"
              maxLength={40}
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAdding()
                if (e.key === 'Escape') cancelAdding()
              }}
            />
            <button type="button" className="mc-why-confirm-btn" onClick={confirmAdding} aria-label="Add reason">
              <img src={studentAsset('checkbox.svg')} style={{ width: 36, height: 36, display: 'block' }} alt="" />
            </button>

            {pickerOpen && (
              <div className="mc-why-emoji-picker" style={{ bottom: 'calc(100% + 8px)', left: 0 }}>
                <div className="mc-why-picker-grid">
                  {PICKER_EMOJI.map((e, i) => (
                    <button
                      key={`${e}-${i}`}
                      type="button"
                      onClick={() => {
                        setAddEmoji(e)
                        setPickerOpen(false)
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="mc-why-block mc-why-block--add" onClick={startAdding}>
            <div className="mc-why-icon">
              <span style={{ fontSize: 20, color: '#a4a59f' }}>+</span>
            </div>
            <span className="mc-why-label">Add other</span>
          </button>
        )}
      </div>

      <MoodNav onBack={onBack} onNext={onNext} />
    </>
  )
}

/** Per-slot corner placement (`mood-checkin.html:269-275`); rotation baked in. */
function decoGeometry(slot: WhyDecoSlot): React.CSSProperties {
  const base: Record<WhyDecoSlot, React.CSSProperties> = {
    tl: { left: -245, top: -130, width: 425, height: 425 },
    mr: { left: 1033, top: 251, width: 492, height: 492 },
    bl: { left: -4, top: 722, width: 467, height: 467 },
    br: { left: 919, top: 537, width: 492, height: 492 },
  }
  const rot = DECO_ROTATION[slot]
  return rot ? { ...base[slot], transform: rot } : base[slot]
}
