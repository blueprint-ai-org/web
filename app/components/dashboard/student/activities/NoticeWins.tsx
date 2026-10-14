import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { NoticeWinsData } from '~/lib/bp-ai/wins.server'

import { ActivityShell } from './ActivityShell'

/**
 * `/student/notice-wins` — the "notice your wins" prompt (ports
 * `notice-wins.html`). A blue screen with the summertime-sadness background
 * blob, a "+N spark" pill, a monster prompt, and a free-text area.
 *
 * The monster asks today's wins question (the server's draw). Save is disabled
 * until the trimmed text is non-empty; saving posts the win to the route's
 * action, then hands off to completed with `?card=wins`. On re-entry the
 * textarea is prefilled with today's win (`notice-wins.html:325-329`) — from
 * the server, so a second device sees it too.
 *
 * **No question, nothing to answer**: the bubble says so and Save stays off.
 */

/** What the monster says when the server drew nothing. */
const NOTHING_TO_ASK = "That's all for today — I'll have a new question for you tomorrow."

export function NoticeWins({ data }: { data: NoticeWinsData }) {
  const { question, today, reward } = data
  const [text, setText] = useState(() => today?.note ?? '')
  const canSave = question !== null && text.trim().length > 0
  const fetcher = useFetcher()

  function save() {
    if (!question) return
    const form = new FormData()
    form.set('questionId', question.id)
    form.set('question', question.label)
    form.set('note', text.trim())
    // Fetchers outlive the shell's navigation to the completed screen.
    fetcher.submit(form, { method: 'post' })
  }

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
            // No figure ⇒ hidden, not removed, so the header keeps its layout.
            visibility: reward === null ? 'hidden' : 'visible',
          }}
        >
          +{reward} <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
        </div>
      }
      title="Notice your wins"
      headerGap={10}
      msgBubbleBg="#49aee1"
      msgText={question?.label ?? NOTHING_TO_ASK}
      saveWidth={280}
      saveHeight={52}
      saveRadius={12}
      canSave={canSave}
      onSave={save}
    >
      {question ? (
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
      ) : null}
    </ActivityShell>
  )
}
