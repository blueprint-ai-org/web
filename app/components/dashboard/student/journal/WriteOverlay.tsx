import { useEffect, useRef, useState, type ReactNode } from 'react'

import { studentAsset } from '~/assets/student-app'

import { MonsterPromptAvatar } from '../activities/ActivityShell'

/**
 * The journal write-it-out overlay (`journal.html:603-650,997-1206`). A purple
 * screen with a 1910px dark circle, a spark pill, the "Write It Out." title, a
 * monster prompt bubble, a free-text area, and a Save button. On save it shows a
 * dark "Completed!" screen for 1800 ms, then closes.
 *
 * The overlay drives three prototype modes (`doWovSave`, `journal.html:1149`):
 *  - `write` — the today write-it-out note (dual-stores `bp_write_text`);
 *  - `add`   — a free "add note" appended to `bp_journal_notes`;
 *  - `edit`  — editing an existing `bp_journal_notes` entry.
 *
 * The mode-specific persistence + parent state update happen in {@link onCommit}
 * (called synchronously on Save); the parent just hides the overlay on
 * {@link onClose} after the 1800 ms beat. Because the "Completed!" screen covers
 * the whole overlay (which covers the stage), committing immediately is
 * invisible until the overlay closes — matching the prototype's post-timeout
 * card reveal.
 *
 * Mounted only while open, so the seeded textarea + done state reset on reopen.
 */

const DONE_MS = 1800

export interface WriteOverlayProps {
  /** Prefill text (empty for a fresh note, the current text when editing). */
  initialValue: string
  /** Monster prompt copy (a node so `add` mode can bold its lead line). */
  bubbleText: ReactNode
  /** Persist + update parent state. Called synchronously on Save. */
  onCommit: (text: string) => void
  /** Hide the overlay (fired {@link DONE_MS} ms after Save). */
  onClose: () => void
}

export function WriteOverlay({ initialValue, bubbleText, onCommit, onClose }: WriteOverlayProps) {
  const [text, setText] = useState(initialValue)
  const [done, setDone] = useState(false)
  const timerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const canSave = text.trim().length > 0

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  function handleSave() {
    const val = text.trim()
    if (!val || done) return
    onCommit(val)
    setDone(true)
    timerRef.current = window.setTimeout(onClose, DONE_MS)
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: '#b38aff',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* 1910px dark circle backdrop (journal.html:316-319) */}
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

      <button
        type="button"
        className="wov-back"
        aria-label="Back"
        onClick={onClose}
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
            marginBottom: 10,
          }}
        >
          1 <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-student-display)',
            fontWeight: 400,
            fontSize: 32,
            color: '#f2f3e5',
            margin: '0 0 48px',
            lineHeight: '40px',
            textAlign: 'center',
          }}
        >
          Write It Out.
        </h1>

        <div
          style={{
            background: '#b38aff',
            padding: 10,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            width: '100%',
            boxSizing: 'border-box',
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
            {bubbleText}
          </p>
        </div>

        <div
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 8,
          }}
        >
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

      {/* Completion screen (journal.html:642-649) */}
      {done && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            background: '#1f1f25',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, color: '#f2f3e5' }}>+1</span>
            <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 28, height: 28, display: 'block' }} />
          </div>
          <p style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 80, lineHeight: 1, color: '#f2f3e5', margin: 0 }}>
            Completed!
          </p>
        </div>
      )}
    </div>
  )
}
