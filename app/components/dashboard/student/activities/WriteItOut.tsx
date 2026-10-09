import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { JournalPrompt } from '~/lib/student/journal-prompts'
import { studentStorage } from '~/lib/student/storage'

import { ActivityShell } from './ActivityShell'

/**
 * `/student/write-it-out` — the journaling prompt (ports `write-it-out.html`).
 *
 * A single purple screen: a "1 spark" pill, a monster prompt, and a free-text
 * area. Save is disabled until the trimmed text is non-empty; saving dual-stores
 * `bp_write_text` (session + local) and sets `bp_write_done`, then hands off to
 * the completed route with `?card=write`.
 *
 * The prototype does NOT prefill this textarea on re-entry (unlike notice-wins /
 * all-about-you) — editing from the summary opens a blank field. Ported 1:1.
 *
 * **The monster asks a journal prompt** when the route found one: `prompt`
 * replaces the prototype's line in the bubble, and Save also posts the note to
 * the route's action as the answer to it. `null` keeps the prototype's line and
 * records nothing beyond local storage.
 */
export function WriteItOut({ prompt = null }: { prompt?: JournalPrompt | null }) {
  const [text, setText] = useState('')
  const canSave = text.trim().length > 0
  const fetcher = useFetcher()

  function save() {
    const note = text.trim()
    studentStorage.setWriteText(note)
    if (!prompt) return
    const form = new FormData()
    form.set('questionId', prompt.id)
    form.set('question', prompt.label)
    form.set('answer', note)
    // Fetchers outlive the navigation to the completed screen the shell makes
    // 400 ms from now, so the write finishes without holding the student here.
    fetcher.submit(form, { method: 'post' })
  }

  return (
    <ActivityShell
      slug="write"
      screenBg="#b38aff"
      bgShape={
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
      }
      backSize={48}
      backRadius={8}
      backBg="rgba(255,255,255,0.16)"
      backBgHover="rgba(255,255,255,0.24)"
      backSvgSize={20}
      sparkPill={
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
            lineHeight: 1.05,
          }}
        >
          1 <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
        </div>
      }
      title="Write it out"
      headerGap={10}
      msgBubbleBg="#b38aff"
      msgText={prompt?.label ?? 'Journaling helps you slow down and make things feel easier to understand.'}
      saveWidth={270}
      saveHeight={48}
      saveRadius={8}
      canSave={canSave}
      onSave={save}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 8,
          position: 'relative',
        }}
      >
        <textarea
          className="act-textarea"
          placeholder="Start writing here"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </ActivityShell>
  )
}
