import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { CatalogueQuestion } from '~/lib/bp-ai/questions.server'
// The enum's value, not just its type: a value import of a .server module is
// what React Router refuses to bundle into client code.
import { QuestionDisplay } from '~/lib/bp-ai/gql/schema'

import { ActivityShell } from './ActivityShell'

/**
 * `/student/all-about-you` — today's micro-survey question (ports
 * `all-about-you.html`). A green screen with the dark asterisk background, a
 * "1 spark" pill, a monster prompt, and the question's input.
 *
 * The input follows the question's type: free text in the write-it-out
 * textarea; emoji-only or numbered options on the prototype's grid of circles;
 * labelled options as pills with the same fill and selected ring. Save posts
 * the answer to the route's action, then hands off to completed with
 * `?card=about`.
 *
 * **No question, nothing to answer.** The bubble says so and Save stays off.
 * The prototype's own 2×5 emoji grid is gone: its answer only ever reached
 * `localStorage`, so it was a question no one could read.
 */

/** What the monster says when the server drew nothing (category not seeded yet). */
const NOTHING_TO_ASK = "That's all for today — I'll have a new question for you tomorrow."

export function AllAboutYou({ question = null }: { question?: CatalogueQuestion | null }) {
  const [picked, setPicked] = useState<readonly string[]>([])
  const [text, setText] = useState('')
  const fetcher = useFetcher()

  const canSave = question ? (question.type === 'OPEN' ? text.trim().length > 0 : picked.length > 0) : false

  function toggle(id: string) {
    if (!question) return
    if (question.type === 'SELECT_ONE') return setPicked([id])
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      // The gateway refuses more ids than `max_selections`; a further tap is
      // ignored the way the check-in's reason chips ignore a fourth.
      if (question.maxSelections !== null && prev.length >= question.maxSelections) return prev
      return [...prev, id]
    })
  }

  function save() {
    if (!question) return
    // Catalogue order, not tap order, so the recorded answer reads the same way
    // the options do.
    const chosen = question.options.filter((o) => picked.includes(o.id))
    const form = new FormData()
    form.set('questionId', question.id)
    // `answer` is the student's TEXT, and only for an open question. For a pick
    // it was the option labels joined with ", " — a copy of the catalogue, and
    // the server's job since step-10.
    if (question.type === 'OPEN') form.set('answer', text.trim())
    // A `FormData`, not an object: React Router encodes a plain object with
    // `new URLSearchParams`, which flattens an array to one joined value.
    for (const option of chosen) form.append('optionIds', option.id)
    // Fetchers outlive the shell's navigation to the completed screen.
    fetcher.submit(form, { method: 'post' })
  }

  return (
    <ActivityShell
      slug="about"
      screenBg="#58b880"
      bgShape={
        <img
          src={studentAsset('asterisk-3.svg')}
          alt=""
          style={{
            position: 'absolute',
            width: 1189,
            height: 1599,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) scale(1.38)',
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
      title="All about you"
      headerGap={16}
      msgBubbleBg="#58b880"
      msgText={question?.label ?? NOTHING_TO_ASK}
      saveWidth={270}
      saveHeight={48}
      saveRadius={8}
      canSave={canSave}
      onSave={save}
    >
      {question ? <QuestionInput question={question} picked={picked} onToggle={toggle} text={text} onText={setText} /> : null}
    </ActivityShell>
  )
}

// A widget guess lived here: it read the SHAPE of the
// labels — an emoji with no words, or a one-or-two-digit number — because
// nothing on the question said how to draw it. A row whose labels happened to
// look numeric got circles; a scale whose author wrote "1 (never)" got pills.
//
// `Question.display` says it now (step-9), and the catalogue is where that
// belongs: the same question can be a scale in one tenant's wording and a menu
// in another's.

/** Does this question want the prototype's grid of circles? */
function drawsAsCircles(question: CatalogueQuestion): boolean {
  return (
    question.display === QuestionDisplay.EmojiScale ||
    question.display === QuestionDisplay.NumericScale
  )
}

interface QuestionInputProps {
  question: CatalogueQuestion
  picked: readonly string[]
  onToggle: (id: string) => void
  text: string
  onText: (text: string) => void
}

/** The input for one catalogue question, by its type and the shape of its options. */
function QuestionInput({ question, picked, onToggle, text, onText }: QuestionInputProps) {
  if (question.type === 'OPEN') {
    return (
      <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, position: 'relative' }}>
        <textarea className="act-textarea" placeholder="Start writing here" value={text} onChange={(e) => onText(e.target.value)} />
      </div>
    )
  }

  // Emoji and number scales keep the prototype's grid: rows of five circles.
  if (drawsAsCircles(question)) {
    const rows: (typeof question.options)[] = []
    for (let i = 0; i < question.options.length; i += 5) rows.push(question.options.slice(i, i + 5))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.map((row, r) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {row.map((o) => {
              const number = o.label !== o.emoji
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-label={number && o.emoji ? `${o.label} ${o.emoji}` : o.label}
                  aria-pressed={picked.includes(o.id)}
                  className={`act-emoji-btn${number ? ' act-number' : ''}${picked.includes(o.id) ? ' selected' : ''}`}
                  onClick={() => onToggle(o.id)}
                >
                  {number ? o.label : o.emoji}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="act-chips" role={question.type === 'MULTISELECT' ? 'group' : 'radiogroup'}>
      {question.options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={picked.includes(o.id)}
          className={`act-chip${picked.includes(o.id) ? ' selected' : ''}`}
          onClick={() => onToggle(o.id)}
        >
          {o.emoji ? <span className="act-chip-emoji">{o.emoji}</span> : null}
          {o.label}
        </button>
      ))}
    </div>
  )
}
