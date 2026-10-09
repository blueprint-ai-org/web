import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { studentAsset } from '~/assets/student-app'

import { MonsterPromptAvatar } from '../activities/ActivityShell'
import { useEnterAnimation } from '../hooks/useEnterAnimation'

import type { OverlaySlot } from './journal-data'

/**
 * The journal topic-question overlay (`journal.html:652-724,1208-1382`). A
 * three-step machine over the picked topic circle:
 *  - `prompt` — the question on a giant colour circle + a "Write" button
 *    (skipped when re-opening an already-answered topic, which lands straight on
 *    `write` for editing);
 *  - `write`  — spark pill, monster bubble, free-text area, Save;
 *  - `done`   — "+1 · Note saved!" with the prototype's S7-style two-phase entry
 *    (`qov-entered` → 300 ms → `qov-phase2`, `journal.html:426-454`), then a
 *    "did this help?" bubble and two dismiss buttons.
 *
 * The overlay backdrop is `#1f1f25` on the prompt step and the slot colour on
 * write/done (`journal.html:1224,1237,1258`). Save persists via {@link onSave}
 * and advances to `done`; both dismiss buttons call {@link onClose}.
 *
 * Mounted only while open, so step/text reset on reopen. Rendered by the
 * `/journal/prompt/:questionId` route (`student.journal.prompt.tsx`), so each
 * prompt has its own URL and error boundary.
 */

const REVEAL = 'transform 800ms cubic-bezier(0.75, 0, 0.3, 0.99), opacity 400ms ease'

type Step = 'prompt' | 'write' | 'done'

export interface QuestionOverlayProps {
  slot: OverlaySlot
  /** Saved answer (session copy); when present the overlay opens on `write`. */
  initialAnswer: string | null
  /** Persist `bp_journal_q<n>` + lift the answer into parent state. */
  onSave: (text: string) => void
  onClose: () => void
}

export function QuestionOverlay({ slot, initialAnswer, onSave, onClose }: QuestionOverlayProps) {
  const editing = Boolean(initialAnswer && initialAnswer.trim())
  const [step, setStep] = useState<Step>(editing ? 'write' : 'prompt')
  const [text, setText] = useState(initialAnswer ?? '')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const canSave = text.trim().length > 0
  const bg = step === 'prompt' ? '#1f1f25' : slot.color

  useEffect(() => {
    if (step === 'write') inputRef.current?.focus()
  }, [step])

  function handleSave() {
    const val = text.trim()
    if (!val) return
    onSave(val)
    setStep('done')
  }

  function handleBack() {
    if (step === 'write' && !editing) setStep('prompt')
    else onClose()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: bg, borderRadius: 20, overflow: 'hidden' }}>
      <button
        type="button"
        className="wov-back"
        aria-label="Back"
        onClick={handleBack}
        style={{
          position: 'absolute',
          top: 36,
          left: 24,
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.16)',
          border: 'none',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <svg viewBox="0 0 20 20" fill="none" width={20} height={20}>
          <path d="M12 5L7 10L12 15" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Step 1: prompt */}
      {step === 'prompt' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: 1026,
              height: 1026,
              borderRadius: '50%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: slot.color,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <p
            style={{
              fontFamily: 'var(--font-student-body)',
              fontWeight: 500,
              // Long catalogue prompts step down; see `promptScale`.
              fontSize: 48 * slot.scale,
              lineHeight: 1.14,
              color: '#f2f3e5',
              textAlign: 'center',
              width: 355,
              position: 'relative',
              zIndex: 1,
              margin: 0,
            }}
          >
            {slot.overlayText}
          </p>
          <button
            type="button"
            className="qov-btn"
            onClick={() => setStep('write')}
            style={{
              position: 'absolute',
              bottom: 36,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 270,
              height: 48,
              borderRadius: 8,
              background: '#f2f3e5',
              color: '#1f1f25',
              fontFamily: 'var(--font-student-body)',
              fontSize: 16,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              zIndex: 6,
            }}
          >
            Write
          </button>
        </div>
      )}

      {/* Step 2: write */}
      {step === 'write' && (
        <>
          <div
            style={{
              position: 'absolute',
              width: 1910,
              height: 1910,
              borderRadius: '50%',
              background: '#1f1f25',
              left: -358,
              top: 80,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 115,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 5,
              width: 440,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#2f2f37',
                borderRadius: 99,
                padding: '8px 12px',
                fontFamily: 'var(--font-student-display)',
                fontWeight: 400,
                fontSize: 20,
                color: '#f2f3e5',
              }}
            >
              1 <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
            </div>

            <div
              style={{
                background: slot.bubbleColor,
                padding: 10,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                width: '100%',
                boxSizing: 'border-box',
                marginTop: 48,
                marginBottom: 24,
              }}
            >
              <MonsterPromptAvatar />
              <p
                style={{
                  fontFamily: 'var(--font-student-body)',
                  fontSize: 20,
                  fontWeight: 500,
                  color: '#2f2f37',
                  lineHeight: 1.1,
                  letterSpacing: '-0.4px',
                  margin: 0,
                }}
              >
                {slot.overlayText}
              </p>
            </div>

            <div style={{ width: '100%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8 }}>
              <textarea
                ref={inputRef}
                className="wov-textarea"
                placeholder="Start writing here"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'var(--font-student-body)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#f2f3e5',
                  padding: '10px 16px',
                  background: 'transparent',
                  minHeight: 200,
                }}
              />
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <button
              type="button"
              className="wov-save"
              disabled={!canSave}
              onClick={handleSave}
              style={{
                width: 270,
                height: 48,
                borderRadius: 8,
                background: '#f2f3e5',
                color: '#1f1f25',
                fontFamily: 'var(--font-student-body)',
                fontSize: 16,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </>
      )}

      {/* Step 3: done */}
      {step === 'done' && <QovDone onClose={onClose} />}
    </div>
  )
}

/** The two-phase "Note saved!" reveal (`journal.html:426-454,1354-1359`). */
function QovDone({ onClose }: { onClose: () => void }) {
  const { entered, phase2 } = useEnterAnimation({ enabled: true, phase2Delay: 300 })

  const rowStyle: CSSProperties = {
    transform: entered ? 'translateY(0)' : 'translateY(400px)',
    opacity: entered ? 1 : 0,
    transition: REVEAL,
  }
  const bubbleStyle: CSSProperties = {
    transform: phase2 ? 'translateX(0)' : 'translateX(500px)',
    opacity: phase2 ? 1 : 0,
    transition: REVEAL,
  }
  const btnRowStyle: CSSProperties = {
    transform: phase2 ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(200px)',
    opacity: phase2 ? 1 : 0,
    transition: REVEAL,
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 260,
        boxSizing: 'border-box',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...rowStyle }}>
        <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, color: '#f2f3e5' }}>+1</span>
        <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 28, height: 28, display: 'block' }} />
      </div>

      <p style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 80, lineHeight: 1, color: '#f2f3e5', margin: 0, ...rowStyle }}>
        Note saved!
      </p>

      <div
        style={{
          background: '#58b880',
          padding: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          width: 439,
          boxSizing: 'border-box',
          ...bubbleStyle,
        }}
      >
        <MonsterPromptAvatar />
        <p
          style={{
            fontFamily: 'var(--font-student-body)',
            fontSize: 20,
            fontWeight: 500,
            color: '#2f2f37',
            lineHeight: 1.1,
            letterSpacing: '-0.4px',
            margin: 0,
          }}
        >
          Did writing help you understand your feelings?
        </p>
      </div>

      <div style={{ position: 'absolute', bottom: 36, left: '50%', display: 'flex', gap: 24, alignItems: 'center', ...btnRowStyle }}>
        <button
          type="button"
          className="qov-btn"
          onClick={onClose}
          style={{
            width: 270,
            height: 48,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.16)',
            color: '#ededed',
            fontFamily: 'var(--font-student-body)',
            fontSize: 16,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Not really
        </button>
        <button
          type="button"
          className="qov-btn"
          onClick={onClose}
          style={{
            width: 270,
            height: 48,
            borderRadius: 8,
            background: '#f2f3e5',
            color: '#1f1f25',
            fontFamily: 'var(--font-student-body)',
            fontSize: 16,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Yes, a bit!
        </button>
      </div>
    </div>
  )
}
