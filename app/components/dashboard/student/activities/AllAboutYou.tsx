import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { AnswerableQuestion } from '~/lib/bp-ai/questions.server'
import { studentStorage } from '~/lib/student/storage'

import { ActivityShell } from './ActivityShell'

/**
 * `/student/all-about-you` — the weekly-mood emoji survey (ports
 * `all-about-you.html`). A green screen with the dark asterisk background, a
 * "1 spark" pill, a monster prompt, and a single-select 2×5 emoji grid.
 *
 * Save is disabled until an emoji is picked; saving writes `bp_about_emoji` and
 * `bp_about_done`, then hands off to completed with `?card=about`. On re-entry
 * the stored emoji is pre-selected (`all-about-you.html:296-306`).
 *
 * **With a catalogue `question`** the monster asks it instead, and the input
 * follows its type: free text in the write-it-out textarea; emoji-only or
 * numbered options on the same circles as the prototype's grid; labelled
 * options as pills with the same fill and selected ring. Save also posts the
 * answer to the route's action. `null` is the prototype, untouched.
 */

/** The two emoji rows, in the prototype's order (`all-about-you.html:220-233`). */
const EMOJI_ROWS: readonly (readonly string[])[] = [
  ['😔', '😟', '😐', '🙂', '🤩'],
  ['😄', '😤', '😰', '😴', '🥳'],
]

export function AllAboutYou({ question = null }: { question?: AnswerableQuestion | null }) {
  // Pre-select the stored emoji on re-entry (edit mode). Read once, client-only.
  const [selected, setSelected] = useState<string | null>(() => studentStorage.getAboutEmoji())
  const [picked, setPicked] = useState<readonly string[]>([])
  const [text, setText] = useState('')
  const fetcher = useFetcher()

  const canSave = question
    ? question.type === 'OPEN'
      ? text.trim().length > 0
      : picked.length > 0
    : selected !== null

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
    if (!question) {
      if (selected) studentStorage.setAbout(selected)
      return
    }
    // Catalogue order, not tap order, so the recorded answer reads the same way
    // the options do.
    const chosen = question.options.filter((o) => picked.includes(o.id))
    const answer = question.type === 'OPEN' ? text.trim() : chosen.map((o) => o.label).join(', ')
    studentStorage.setAboutAnswer(question.label, question.type === 'SELECT_ONE' ? (chosen[0]?.emoji ?? null) : null)
    const form = new FormData()
    form.set('questionId', question.id)
    form.set('question', question.label)
    form.set('answer', answer)
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
      msgText={question?.label ?? "Pick the emoji that best matches how you've felt this week."}
      saveWidth={270}
      saveHeight={48}
      saveRadius={8}
      canSave={canSave}
      onSave={save}
    >
      {question ? (
        <QuestionInput question={question} picked={picked} onToggle={toggle} text={text} onText={setText} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {EMOJI_ROWS.map((row, r) => (
            <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {row.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`act-emoji-btn${selected === emoji ? ' selected' : ''}`}
                  onClick={() => setSelected(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </ActivityShell>
  )
}

/** A catalogue option drawn as a circle: an emoji with no words, or a number. */
function isCircleOption(o: AnswerableQuestion['options'][number]): boolean {
  return o.label === o.emoji || /^\d{1,2}$/.test(o.label)
}

interface QuestionInputProps {
  question: AnswerableQuestion
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

  // Emoji-only and number scales keep the prototype's grid: rows of five circles.
  if (question.options.every(isCircleOption)) {
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
