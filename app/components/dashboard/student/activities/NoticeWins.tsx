import { useState } from 'react'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { WINS_DEFAULT_QUESTION } from '../today/today-data'

import { ActivityShell } from './ActivityShell'

/**
 * `/student/notice-wins` — the "notice your wins" prompt (ports
 * `notice-wins.html`). A blue screen with the summertime-sadness background
 * blob, a "+1 spark" pill, a monster prompt, and a free-text area.
 *
 * Save is disabled until the trimmed text is non-empty; saving writes
 * `bp_wins_note`, `bp_wins_question` (the fixed prompt), and `bp_wins_done`,
 * then hands off to completed with `?card=wins`. On re-entry the textarea is
 * prefilled from `bp_wins_note` (`notice-wins.html:325-329`).
 */
export function NoticeWins() {
  // Prefill from the durable note (edit mode). Read once, client-only.
  const [text, setText] = useState(() => studentStorage.getWinsNote() ?? '')
  const canSave = text.trim().length > 0

  return (
    <ActivityShell
      slug="wins"
      screenBg="#3e4fb8"
      bgShape={
        <img
          src={studentAsset('wins-bg.svg')}
          alt=""
          style={{
            position: 'absolute',
            width: 1674,
            height: 1674,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            margin: 'auto',
            transform: 'scale(1.2)',
            pointerEvents: 'none',
            zIndex: 0,
            display: 'block',
          }}
        />
      }
      backSize={44}
      backRadius="50%"
      backBg="rgba(255,255,255,0.15)"
      backBgHover="rgba(255,255,255,0.22)"
      backSvgSize={18}
      sparkPill={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 100,
            padding: '4px 12px 4px 8px',
            fontFamily: 'var(--font-student-display)',
            fontWeight: 400,
            fontSize: 18,
            color: '#f2f3e5',
          }}
        >
          +1 <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
        </div>
      }
      title="Notice your wins"
      headerGap={10}
      msgBubbleBg="#49aee1"
      msgText={WINS_DEFAULT_QUESTION}
      saveWidth={280}
      saveHeight={52}
      saveRadius={12}
      canSave={canSave}
      onSave={() => studentStorage.setWins(text.trim(), WINS_DEFAULT_QUESTION)}
    >
      <div
        style={{
          background: '#36363f',
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
