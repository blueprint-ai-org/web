import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset, studentAssets } from '~/assets/student-app'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import {
  EDIT_SEGMENTS,
  SECTION_ICONS,
  SECTION_ORDER,
  SECTION_TITLES,
  buildAllDays,
  type SectionKey,
  type SummaryDay,
} from './summary-data'
import { SUMMARY_CSS } from './summary-styles'
import { SummaryMoodOverlay } from './SummaryMoodOverlay'

/**
 * `/student/summary` — the day summary (ports `summary.html`).
 *
 * A 2×2 card grid (Mood · Write · About · Wins) over a date carousel of demo
 * past days plus today. Today shows only completed sections (mood always);
 * past days show all four (empty ones dimmed). The Mood card opens a detail
 * overlay; per-card Edit deep-links jump back into each flow. Back returns to
 * the hub. Read-only — no storage writes. Client-only (see the route's
 * `HydrateFallback`).
 */

// ── Card content renderers (summary.html:461-487) ────────────────────────────

function cardMood(day: SummaryDay): ReactNode {
  return (
    <div className="sum-emotions-row">
      {day.mood.emotions.map((e, i) => {
        const src = studentAssets[e.img]
        return (
          <div key={`${e.name}-${i}`} className="sum-emotion-tile">
            {src ? <img src={src} alt="" /> : null}
            <span className="sum-emotion-label">{e.name}</span>
          </div>
        )
      })}
    </div>
  )
}

function cardWrite(day: SummaryDay): ReactNode {
  return day.write?.text ? <p className="sum-text">{day.write.text}</p> : null
}

function cardAbout(day: SummaryDay): ReactNode {
  const about = day.about
  if (!about || (!about.question && !about.emoji)) return null
  if (about.emoji) {
    return (
      <>
        <p className="sum-question">{about.question}</p>
        <div className="sum-emoji-circle">{about.emoji}</div>
      </>
    )
  }
  return (
    <>
      <p className="sum-question">{about.question}</p>
    </>
  )
}

function cardWins(day: SummaryDay): ReactNode {
  const wins = day.wins
  if (!wins) return null
  return (
    <>
      <p className="sum-question">{wins.question}</p>
      {wins.answer ? <p className="sum-answer">{wins.answer}</p> : null}
    </>
  )
}

const RENDERERS: Record<SectionKey, (day: SummaryDay) => ReactNode> = {
  mood: cardMood,
  write: cardWrite,
  about: cardAbout,
  wins: cardWins,
}

export function Summary() {
  const navigate = useNavigate()
  const base = useStudentNavBase()

  const [allDays] = useState<SummaryDay[]>(() => buildAllDays())
  const [dayIdx, setDayIdx] = useState(() => allDays.length - 1)
  const [moodOpen, setMoodOpen] = useState(false)

  const day = allDays[dayIdx]
  const isToday = dayIdx === allDays.length - 1

  // Today: only completed sections; past days: always all four (empties dimmed).
  const sections = isToday
    ? SECTION_ORDER.filter((k) => day.sections.includes(k))
    : SECTION_ORDER

  const renderCard = (key: SectionKey): ReactNode => {
    const body = RENDERERS[key](day)
    const isEmpty = body === null

    // Today: skip empty non-mood cards entirely (summary.html:496).
    if (isToday && isEmpty && key !== 'mood') return null

    const editSegment = EDIT_SEGMENTS[key]
    const showEdit = isToday && !isEmpty && Boolean(editSegment)
    const isMood = key === 'mood'
    const clickable = isMood && !isEmpty

    const className = ['sum-card', isMood ? 'sum-mood-card' : '', isEmpty ? 'sum-card-empty' : '']
      .filter(Boolean)
      .join(' ')

    return (
      <div
        key={key}
        className={className}
        onClick={clickable ? () => setMoodOpen(true) : undefined}
      >
        <div className="sum-hdr">
          <div className="sum-hdr-left">
            <img className="sum-icon" src={studentAsset(SECTION_ICONS[key])} alt="" />
            <span className="sum-section-title">{SECTION_TITLES[key]}</span>
          </div>
          {showEdit ? (
            <button
              type="button"
              className="sum-edit"
              onClick={(ev) => {
                ev.stopPropagation()
                navigate(`${base}/${editSegment}`)
              }}
            >
              Edit
            </button>
          ) : null}
        </div>
        {body}
      </div>
    )
  }

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="summary">
      <style>{SUMMARY_CSS}</style>

      <button type="button" className="sum-back" aria-label="Back" onClick={() => navigate(base)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="sum-date-nav">
        <button
          type="button"
          className="sum-date-arrow"
          aria-label="Previous day"
          disabled={dayIdx === 0}
          onClick={() => setDayIdx((i) => Math.max(0, i - 1))}
        >
          &#8249;
        </button>
        <span className="sum-date-label">{day.label}</span>
        <button
          type="button"
          className="sum-date-arrow"
          aria-label="Next day"
          disabled={isToday}
          onClick={() => setDayIdx((i) => Math.min(allDays.length - 1, i + 1))}
        >
          &#8250;
        </button>
      </div>

      <div className="sum-content">
        <div className="sum-grid">{sections.map((k) => renderCard(k))}</div>
      </div>

      <SummaryMoodOverlay
        day={day}
        isToday={isToday}
        open={moodOpen}
        onClose={() => setMoodOpen(false)}
        onEdit={() => navigate(`${base}/mood-checkin`)}
      />
    </StudentStage>
  )
}
