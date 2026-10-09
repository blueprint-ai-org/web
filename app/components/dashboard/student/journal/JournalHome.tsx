import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { JournalPrompt } from '~/lib/student/journal-prompts'
import { BP_KEYS, rawStore, studentStorage, type JournalNote } from '~/lib/student/storage'

import { SupportPanel } from '../chrome/SupportPanel'
import { Sidebar } from '../chrome/Sidebar'
import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import {
  ADD_NOTE_QUESTION,
  DEMO_Q2_ANSWER,
  DEMO_WRITE,
  JOURNAL_PAGE_DESC,
  WRITE_BUBBLE_DEFAULT,
  resolveSlots,
  type QuestionSlot,
} from './journal-data'
import { JOURNAL_CSS } from './journal-styles'
import { WriteOverlay } from './WriteOverlay'

/**
 * `/student/journal` — the journal home (ports `journal.html`). A sidebar-bearing
 * stage page: a notes column (write-it-out CTA → today note card + answered-topic
 * cards + a "Past notes" archive link) and a topics column of two colour circles
 * recoloured from the day's mood emotions.
 *
 * Two overlays sit over the stage: the write-it-out overlay (free note) and the
 * topic-question overlay reached by a circle→overlay FLIP expansion (the clicked
 * circle scales 4.66× to the stage centre while its text counter-scales and the
 * surrounding chrome slides away, `animateToOverlay`, `journal.html:886-982`).
 *
 * **The topic overlay is a route.** The FLIP ends in a navigation to
 * `journal/prompt/:questionId`, whose module renders the overlay into this
 * page's `<Outlet/>` with {@link JournalOutletContext}. The page underneath
 * never unmounts, so the hand-off is the same frame it always was — and each
 * prompt gets its own URL, action and error boundary.
 *
 * **The topics come from the catalogue.** `topics` is the route loader's daily
 * draw from the `journal` category; `null` keeps the prototype's copy.
 *
 * Preview states: `?demo=1|2|3` seed the notes column (`journal.html:790-812`);
 * `?wt=<text>` injects a session write-note. Client-only (see the route's
 * `HydrateFallback`); mounted at both `/student/journal` and
 * `/preview/student/journal`.
 */

const FLIP_DUR = 800
/** A pathname on the topic route, `…/journal/prompt/:questionId`. */
const TOPIC_ROUTE = /\/journal\/prompt\/[^/]+\/?$/
const FLIP_BEZIER = 'cubic-bezier(0.75, 0, 0.3, 0.99)'
const FLIP_SCALE = 1026 / 220 // 4.664 (journal.html:904)
// device center (597,417) → clicked-circle offsets (journal.html:903)
const FLIP_OFFSET: readonly [{ dx: number; dy: number }, { dx: number; dy: number }] = [
  { dx: -386, dy: 61 },
  { dx: -386, dy: -171 },
]

interface NotesState {
  writeText: string | null
  qAnswers: [string | null, string | null]
  journalNotes: JournalNote[]
  sessionCards: JournalNote[]
}

type WriteMode = 'write' | 'add' | 'edit'
interface WriteOverlayState {
  mode: WriteMode
  initialValue: string
  bubbleText: ReactNode
  editDate?: string
}

function resolveInitialNotes(demo: string | null, wt: string | null): {
  writeText: string | null
  qAnswers: [string | null, string | null]
} {
  if (demo === '1') return { writeText: null, qAnswers: [null, null] }
  if (demo === '2') return { writeText: DEMO_WRITE, qAnswers: [null, null] }
  if (demo === '3') return { writeText: DEMO_WRITE, qAnswers: [null, DEMO_Q2_ANSWER] }
  const q1 = studentStorage.getJournalAnswer(1, 'session')
  const q2 = studentStorage.getJournalAnswer(2, 'session')
  if (wt) return { writeText: wt, qAnswers: [q1, q2] }
  return { writeText: studentStorage.getWriteText('session'), qAnswers: [q1, q2] }
}

/** What the `journal/prompt/:questionId` route reads from this page. */
export interface JournalOutletContext {
  slots: readonly QuestionSlot[]
  qAnswers: readonly [string | null, string | null]
  /** The whole active catalogue, so a link to any prompt can open. */
  catalogue: readonly JournalPrompt[] | null
  /** Persist a topic answer locally and show it as a card. */
  saveAnswer: (slot: QuestionSlot, text: string) => void
}

export interface JournalHomeProps {
  /** Today's draw from the `journal` catalogue; `null` keeps baked copy. */
  topics?: readonly JournalPrompt[] | null
  catalogue?: readonly JournalPrompt[] | null
}

export function JournalHome({ topics = null, catalogue = null }: JournalHomeProps) {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()
  const demo = searchParams.get('demo')
  const wt = searchParams.get('wt')

  const [slots] = useState(() => resolveSlots(studentStorage.getMoodEmotions(), topics))
  const [notes, setNotes] = useState<NotesState>(() => {
    const init = resolveInitialNotes(demo, wt)
    return {
      writeText: init.writeText,
      qAnswers: init.qAnswers,
      journalNotes: demo ? [] : studentStorage.getJournalNotes(),
      sessionCards: [],
    }
  })

  const [writeOv, setWriteOv] = useState<WriteOverlayState | null>(null)

  /** Open a topic's overlay route. History, so the browser's Back closes it. */
  const openTopic = (idx: 0 | 1) =>
    navigate(`${base}/journal/prompt/${encodeURIComponent(slots[idx].routeKey)}`, {
      state: { fromJournal: true },
    })

  // ── FLIP refs (base layer only) ────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const descRef = useRef<HTMLParagraphElement | null>(null)
  const colLeftRef = useRef<HTMLDivElement | null>(null)
  const qLabelRef = useRef<HTMLSpanElement | null>(null)
  const writeBtnRef = useRef<HTMLButtonElement | null>(null)
  const circleRefs = useRef<Array<HTMLDivElement | null>>([null, null])
  const circleTextRefs = useRef<Array<HTMLParagraphElement | null>>([null, null])
  const qAnswersRef = useRef(notes.qAnswers)
  qAnswersRef.current = notes.qAnswers

  // The FLIP's clean-up, held until the topic route has rendered over the page.
  // Navigating is not synchronous — the first open also fetches the route's
  // module — so resetting before the overlay paints shows the home, un-animated,
  // for a few frames between the grown circle and the overlay.
  const pendingFlipReset = useRef<(() => void) | null>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    if (!pendingFlipReset.current || !TOPIC_ROUTE.test(pathname)) return
    pendingFlipReset.current()
    pendingFlipReset.current = null
  }, [pathname])

  // `?wt=` also persists into the session store for reloads (journal.html:804).
  useEffect(() => {
    if (wt) studentStorage.injectWriteTextSession(wt)
  }, [wt])

  const { writeText, qAnswers, journalNotes, sessionCards } = notes
  const hasQCards = qAnswers.some(Boolean)
  const hasWrite = Boolean(writeText)
  const hasAnyNote = hasQCards || hasWrite

  const now = new Date()
  const monthCount = journalNotes.filter((n) => {
    const d = new Date(n.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  const total = journalNotes.length

  // ── Circle → overlay FLIP (journal.html:886-982) ───────────────────────────
  function animateToOverlay(idx: 0 | 1) {
    const clicked = circleRefs.current[idx]
    const other = circleRefs.current[idx === 0 ? 1 : 0]
    const clickedText = circleTextRefs.current[idx]
    const title = titleRef.current
    const desc = descRef.current
    const colLeft = colLeftRef.current
    const qLabel = qLabelRef.current
    const writeBtn = writeBtnRef.current
    const nav = rootRef.current?.querySelector('nav') as HTMLElement | null

    if (!clicked || !other || !clickedText || !title || !desc || !colLeft || !qLabel || !writeBtn) {
      openTopic(idx) // refs unavailable — skip animation, open directly
      return
    }

    const otherIdx = idx === 0 ? 1 : 0
    const exitT = `transform ${FLIP_DUR}ms ${FLIP_BEZIER}, opacity 600ms ${FLIP_BEZIER}`
    const { dx, dy } = FLIP_OFFSET[idx]

    clicked.style.pointerEvents = 'none'
    other.style.pointerEvents = 'none'

    for (const el of [nav, title, desc, colLeft, qLabel, other]) {
      if (el) el.style.transition = exitT
    }
    clicked.style.transition = `transform ${FLIP_DUR}ms ${FLIP_BEZIER}`
    clicked.style.position = 'relative'
    clicked.style.zIndex = '45'
    clickedText.style.width = '148px'
    clickedText.style.transition = `transform ${FLIP_DUR}ms ${FLIP_BEZIER}`

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (nav) {
          nav.style.transform = 'translateY(-50%) translateX(-220px)'
          nav.style.opacity = '0'
        }
        title.style.transform = 'translateY(-260px)'
        title.style.opacity = '0'
        desc.style.transform = 'translateY(-260px)'
        desc.style.opacity = '0'
        colLeft.style.transform = 'translateY(-300px)'
        colLeft.style.opacity = '0'
        qLabel.style.transform = 'translateX(380px)'
        qLabel.style.opacity = '0'
        other.style.transform = 'translateX(380px)'
        other.style.opacity = '0'
        clicked.style.transform = `translate(${dx}px, ${dy}px) scale(${FLIP_SCALE})`
        clickedText.style.transform = 'scale(0.515)'
        writeBtn.style.display = 'block'
        writeBtn.style.transition = `bottom ${FLIP_DUR}ms ${FLIP_BEZIER} 120ms`
        writeBtn.style.bottom = '36px'
      })
    })

    const reset = () => {
      writeBtn.style.transition = 'none'
      writeBtn.style.bottom = '-80px'
      writeBtn.style.display = 'none'
      if (nav) {
        nav.style.transition = ''
        nav.style.transform = 'translateY(-50%)'
        nav.style.opacity = ''
      }
      for (const el of [title, desc, colLeft, qLabel]) {
        el.style.transition = ''
        el.style.transform = ''
        el.style.opacity = ''
      }
      other.style.transition = ''
      other.style.transform = ''
      other.style.opacity = qAnswersRef.current[otherIdx] ? '0.2' : ''
      other.style.pointerEvents = ''
      clicked.style.transition = ''
      clicked.style.transform = ''
      clicked.style.position = ''
      clicked.style.zIndex = ''
      clicked.style.pointerEvents = ''
      clickedText.style.transition = ''
      clickedText.style.transform = ''
      clickedText.style.width = ''
    }

    window.setTimeout(() => {
      // Hold the grown circle until the route renders (see `pendingFlipReset`);
      // the overlay paints in the same commit, so the reset is never seen. The
      // backstop restores the page if the navigation never lands.
      pendingFlipReset.current = reset
      openTopic(idx)
      window.setTimeout(() => {
        if (pendingFlipReset.current === reset) {
          reset()
          pendingFlipReset.current = null
        }
      }, 3000)
    }, FLIP_DUR)
  }

  // ── Overlay openers ─────────────────────────────────────────────────────────
  const openWriteCta = () =>
    setWriteOv({ mode: 'write', initialValue: '', bubbleText: WRITE_BUBBLE_DEFAULT })
  const editWriteNote = () =>
    setWriteOv({ mode: 'write', initialValue: writeText ?? '', bubbleText: WRITE_BUBBLE_DEFAULT })
  const openAddNote = () =>
    setWriteOv({
      mode: 'add',
      initialValue: '',
      bubbleText: (
        <>
          <strong>Every thought matters.</strong>
          <br />
          {ADD_NOTE_QUESTION}
        </>
      ),
    })
  const editSessionNote = (date: string) => {
    const note = sessionCards.find((n) => n.date === date)
    if (!note) return
    setWriteOv({ mode: 'edit', initialValue: note.text, editDate: date, bubbleText: WRITE_BUBBLE_DEFAULT })
  }

  // ── Write-overlay commit (journal.html:1149-1206) ───────────────────────────
  function commitWrite(text: string) {
    if (!writeOv) return
    if (writeOv.mode === 'write') {
      // Dual-store bp_write_text WITHOUT bp_write_done — journalling here does not
      // complete the today write-it-out card (journal.html:1196-1197).
      rawStore.setSession(BP_KEYS.writeText, text)
      rawStore.setLocal(BP_KEYS.writeText, text)
      setNotes((prev) => ({ ...prev, writeText: text }))
    } else if (writeOv.mode === 'add') {
      const note: JournalNote = { text, date: new Date().toISOString() }
      const next = studentStorage.addJournalNote(note)
      setNotes((prev) => ({
        ...prev,
        journalNotes: next,
        sessionCards: [...prev.sessionCards, note],
      }))
    } else {
      const date = writeOv.editDate
      const updateText = (list: JournalNote[]) =>
        list.map((n) => (n.date === date ? { ...n, text } : n))
      // Persist the edit into bp_journal_notes (journal.html:1157-1159).
      const stored = studentStorage.getJournalNotes()
      rawStore.setLocal(BP_KEYS.journalNotes, JSON.stringify(updateText(stored)))
      setNotes((prev) => ({
        ...prev,
        journalNotes: updateText(prev.journalNotes),
        sessionCards: updateText(prev.sessionCards),
      }))
    }
  }

  // ── Question-overlay save (journal.html:1340-1345) ──────────────────────────
  function saveAnswer(slot: QuestionSlot, text: string) {
    studentStorage.setJournalAnswer(slot.qnum, text)
    setNotes((prev) => {
      const next: [string | null, string | null] = [prev.qAnswers[0], prev.qAnswers[1]]
      next[slot.answerIndex] = text
      return { ...prev, qAnswers: next }
    })
  }

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="journal-home">
      <style>{JOURNAL_CSS}</style>

      <div ref={rootRef} style={{ display: 'contents' }}>
        <Sidebar />

        <h1
          ref={titleRef}
          style={{
            position: 'absolute',
            left: 152,
            top: 72,
            fontFamily: 'var(--font-student-display)',
            fontWeight: 400,
            fontSize: 64,
            lineHeight: 1.06,
            color: '#f2f3e5',
            margin: 0,
            pointerEvents: 'none',
          }}
        >
          Journal
        </h1>
        <p
          ref={descRef}
          style={{
            position: 'absolute',
            left: 152,
            top: 154,
            fontFamily: 'var(--font-student-body)',
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '-0.1px',
            lineHeight: '20px',
            color: '#737472',
            margin: 0,
            pointerEvents: 'none',
          }}
        >
          {JOURNAL_PAGE_DESC}
        </p>

        <div style={{ position: 'absolute', left: 152, top: 206, display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          {/* Left column — notes */}
          <div
            ref={colLeftRef}
            className="j-col-left"
            style={{ width: 658, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 600, overflowY: 'auto' }}
          >
            <span style={SECTION_LABEL_STYLE}>Notes</span>

            {/* Answered-topic + session add-note cards */}
            {(hasQCards || sessionCards.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {slots.map((slot, i) =>
                  qAnswers[i] ? (
                    <AnswerCard
                      key={`q-${slot.qnum}`}
                      question={slot.overlayText}
                      answer={qAnswers[i] as string}
                      onEdit={() => openTopic(i as 0 | 1)}
                    />
                  ) : null,
                )}
                {sessionCards.map((note) => (
                  <AnswerCard key={note.date} answer={note.text} onEdit={() => editSessionNote(note.date)} />
                ))}
              </div>
            )}

            {/* Write-it-out CTA (no notes yet) */}
            {!hasAnyNote && <WriteCta onClick={openWriteCta} />}

            {/* Today's write-it-out note */}
            {hasWrite && <TodayNoteCard text={writeText as string} onEdit={editWriteNote} />}

            {/* Past notes archive link */}
            <div className="j-past-notes" onClick={() => navigate(`${base}/journal/past-notes`)} style={PAST_NOTES_STYLE}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#f2f3e5', letterSpacing: '-0.2px' }}>
                  Past notes
                </span>
                {total > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontFamily: 'var(--font-student-body)',
                      fontSize: 16,
                      fontWeight: 500,
                      color: '#737472',
                      letterSpacing: '-0.1px',
                    }}
                  >
                    <span>
                      {monthCount} {monthCount === 1 ? 'entry this month' : 'entries this month'}
                    </span>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#737472', flexShrink: 0 }} />
                    <span>
                      {total} {total === 1 ? 'entry total' : 'entries total'}
                    </span>
                  </div>
                )}
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 4.16669L13.3333 10L7.5 15.8334" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Add-note (+) button */}
            {hasWrite && (
              <button type="button" className="j-add-note" aria-label="Add note" onClick={openAddNote} style={ADD_NOTE_BTN_STYLE}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4V16M4 10H16" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Right column — topics */}
          <div style={{ width: 282, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span ref={qLabelRef} style={{ ...SECTION_LABEL_STYLE, textAlign: 'center' }}>
              Topics to write about
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 31px' }}>
              {slots.map((slot, i) => (
                <div
                  key={slot.qnum}
                  ref={(el) => {
                    circleRefs.current[i] = el
                  }}
                  className="j-question-circle"
                  onClick={() => animateToOverlay(i as 0 | 1)}
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 36,
                    boxSizing: 'border-box',
                    background: slot.color,
                    opacity: qAnswers[i] ? 0.2 : 1,
                  }}
                >
                  <p
                    ref={(el) => {
                      circleTextRefs.current[i] = el
                    }}
                    style={{
                      fontFamily: 'var(--font-student-body)',
                      // Long catalogue prompts step down; see `promptScale`.
                      fontSize: 20 * slot.scale,
                      fontWeight: 500,
                      color: '#f2f3e5',
                      lineHeight: 1.1,
                      letterSpacing: '-0.4px',
                      textAlign: 'center',
                      margin: 0,
                    }}
                  >
                    {slot.circleText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Write button that slides up during the circle→overlay FLIP */}
        <button
          ref={writeBtnRef}
          type="button"
          style={{
            display: 'none',
            position: 'absolute',
            bottom: -80,
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
            zIndex: 46,
            pointerEvents: 'none',
          }}
        >
          Write
        </button>
      </div>

      {writeOv && (
        <WriteOverlay
          key={`${writeOv.mode}-${writeOv.editDate ?? ''}`}
          initialValue={writeOv.initialValue}
          bubbleText={writeOv.bubbleText}
          onCommit={commitWrite}
          onClose={() => setWriteOv(null)}
        />
      )}

      {/* The topic overlay — `journal/prompt/:questionId` renders here. */}
      <Outlet context={{ slots, qAnswers, catalogue, saveAnswer } satisfies JournalOutletContext} />

      <SupportPanel />
    </StudentStage>
  )
}

// ── Presentational helpers ────────────────────────────────────────────────────

const SECTION_LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: 'rgba(242,243,229,0.4)',
  letterSpacing: '-0.1px',
}

const PAST_NOTES_STYLE: CSSProperties = {
  width: 658,
  borderRadius: 16,
  background: '#1f1f25',
  border: '1px solid #36363f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 24,
  boxSizing: 'border-box',
}

const ADD_NOTE_BTN_STYLE: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: '#2b2b32',
  border: '1px solid #36363f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'center',
  flexShrink: 0,
}

const NOTE_CARD_STYLE: CSSProperties = {
  width: 658,
  borderRadius: 16,
  background: 'transparent',
  border: '1px solid #36363f',
  padding: 24,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
}

function NoteCardHeader({ onEdit }: { onEdit: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottom: '1px solid #36363f',
      }}
    >
      <span style={{ fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#737472', letterSpacing: '-0.2px' }}>
        Today
      </span>
      <button
        type="button"
        className="j-note-edit"
        onClick={onEdit}
        style={{
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          color: '#f2f3e5',
          letterSpacing: '-0.1px',
          textDecoration: 'underline',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        Edit note
      </button>
    </div>
  )
}

/** Today's write-it-out note (`.note-card-today` with `.note-card-text`). */
function TodayNoteCard({ text, onEdit }: { text: string; onEdit: () => void }) {
  return (
    <div style={NOTE_CARD_STYLE}>
      <NoteCardHeader onEdit={onEdit} />
      <p
        style={{
          fontFamily: 'var(--font-student-body)',
          fontSize: 20,
          fontWeight: 500,
          color: '#f2f3e5',
          lineHeight: 1.1,
          letterSpacing: '-0.4px',
          wordBreak: 'break-word',
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  )
}

/** An answered-topic card or a session add-note card (`.note-card-body`). */
function AnswerCard({ question, answer, onEdit }: { question?: string; answer: string; onEdit: () => void }) {
  return (
    <div style={NOTE_CARD_STYLE}>
      <NoteCardHeader onEdit={onEdit} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {question ? (
          <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 16, fontWeight: 500, color: '#a4a59f', letterSpacing: '-0.1px', margin: 0, lineHeight: 1.25 }}>
            {question}
          </p>
        ) : null}
        <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#f2f3e5', lineHeight: 1.1, letterSpacing: '-0.4px', margin: 0 }}>
          {answer}
        </p>
      </div>
    </div>
  )
}

/** The purple "Write it out" call-to-action (`.write-cta-card`). */
function WriteCta({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="j-write-cta"
      onClick={onClick}
      style={{ width: 658, height: 315, borderRadius: 20, background: '#c4a3ff', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', left: 7.5, top: '50%', transform: 'translateY(-50%)', width: 291, height: 291, overflow: 'hidden', pointerEvents: 'none' }}>
        <img
          src={studentAsset('monster-m02-default.svg')}
          alt=""
          style={{ width: 279, height: 286, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          width: 164,
          height: 96,
          background: '#36363f',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-student-body)', fontSize: 18, fontWeight: 500, color: '#f2f3e5', letterSpacing: '-0.2px' }}>
          1 <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 16, height: 16, display: 'block' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 24, lineHeight: 1.12, color: '#f2f3e5', letterSpacing: '-0.4px', textAlign: 'center' }}>
          Write it out
        </span>
      </div>
    </div>
  )
}
