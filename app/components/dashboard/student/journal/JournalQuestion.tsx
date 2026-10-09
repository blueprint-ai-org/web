import { useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import { studentStorage } from '~/lib/student/storage'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

/**
 * `/student/journal/question` — the guided topic-question flow (ports
 * `journal-question.html`). Three screens over one of two configured questions
 * (`?q=1|2`): the question on a colour dome, a write screen (monster prompt +
 * textarea), and a "Note saved!" screen with a two-button helpfulness prompt.
 *
 * Saving writes `bp_journal_q1|q2` via the storage adapter (dual-store); both
 * helpfulness buttons finish to `/student/journal`. Full-bleed (no sidebar);
 * client-only (see the route's `HydrateFallback`). Mounted at both
 * `/student/journal/question` and the preview mirror.
 */

interface QuestionConfig {
  text: string
  color: string
  msgColor: string
  qnum: 1 | 2
}

const QUESTIONS: Record<'1' | '2', QuestionConfig> = {
  '1': { text: 'What kinds of moments or things tend to lift your mood — even a little?', color: '#3f50b8', msgColor: '#49aee1', qnum: 1 },
  '2': { text: "What's making you feel this excited?", color: '#e65800', msgColor: '#f08b31', qnum: 2 },
}

const JQ_CSS = `
.jq-back { transition: background 120ms; }
.jq-back:hover { background: rgba(255,255,255,0.24); }
.jq-textarea::placeholder { color: #adadad; }
.jq-btn { transition: opacity 120ms; }
.jq-btn:active { opacity: 0.8; }
`

/** The monster message glyph (`journal-question.html:257-263`) — fixed orange. */
function MessageIcon() {
  return (
    <div style={{ width: 48, height: 48, flexShrink: 0, background: '#f2f3e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path
          d="M19.8931 37.566C8.7883 37.566 -0.2139 28.6003 -0.2139 17.5408C5.8012 17.5408 10.6774 12.6843 10.6774 6.6937C10.6774 4.5059 10.6774 2.4341 10.6774 2.4341L29.1087 2.4341C29.1087 2.4341 29.1087 4.5059 29.1087 6.6937C29.1087 12.6843 33.9849 17.5408 40 17.5408C40 28.6004 30.9979 37.566 19.8931 37.566Z"
          fill="#E65800"
        />
        <ellipse cx="2.84122" cy="3.7883" rx="2.84122" ry="3.7883" transform="matrix(-1 0 0 1 19.053 15.9763)" fill="#F2F3E5" />
        <circle cx="1.98886" cy="1.98886" r="1.98886" transform="matrix(-1 0 0 1 18.1058 19.9985)" fill="#36363F" />
        <ellipse cx="2.84122" cy="3.7883" rx="2.84122" ry="3.7883" transform="matrix(-1 0 0 1 26.6295 15.9763)" fill="#F2F3E5" />
        <circle cx="1.98886" cy="1.98886" r="1.98886" transform="matrix(-1 0 0 1 25.6825 19.9986)" fill="#36363F" />
      </svg>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="jq-back"
      aria-label="Back"
      onClick={onClick}
      style={{
        position: 'absolute',
        left: 24,
        top: 48,
        zIndex: 20,
        width: 48,
        height: 48,
        borderRadius: 8,
        background: 'rgba(255,255,255,0.16)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15.8334L6.66667 10L12.5 4.16669" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

type Screen = 'question' | 'write' | 'saved'

export function JournalQuestion() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()
  const q = QUESTIONS[searchParams.get('q') === '2' ? '2' : '1']

  const [screen, setScreen] = useState<Screen>('question')
  const [text, setText] = useState(() => studentStorage.getJournalAnswer(q.qnum, 'local') ?? '')

  function saveAnswer() {
    const val = text.trim()
    if (!val) return
    studentStorage.setJournalAnswer(q.qnum, val)
    setScreen('saved')
  }

  return (
    <StudentStage style={{ backgroundColor: q.color }} data-testid="journal-question">
      <style>{JQ_CSS}</style>

      {/* ── S-QUESTION ── */}
      {screen === 'question' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <BackButton onClick={() => navigate(-1)} />
          <img src={studentAsset('kolo1.svg')} alt="" style={{ position: 'absolute', left: 84, top: -96, width: 1026, height: 1026, pointerEvents: 'none' }} />
          <p
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 449,
              fontFamily: 'var(--font-student-body)',
              fontSize: 48,
              fontWeight: 500,
              color: '#f2f3e5',
              lineHeight: 1.14,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {q.text}
          </p>
          <button type="button" className="jq-btn" onClick={() => setScreen('write')} style={{ ...PRIMARY_BTN_STYLE, top: 721 }}>
            Write
          </button>
        </div>
      )}

      {/* ── S-WRITE ── */}
      {screen === 'write' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src={studentAsset('kolo1.svg')} alt="" style={{ position: 'absolute', left: 84, top: -96, width: 1026, height: 1026, pointerEvents: 'none' }} />
          <BackButton onClick={() => setScreen('question')} />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 115,
              background: '#2f2f37',
              borderRadius: 99,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 20, color: '#f2f3e5', lineHeight: 1.05 }}>1</span>
            <img src={studentAsset('spark.svg')} alt="spark" style={{ width: 20, height: 20, display: 'block' }} />
          </div>

          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 200, width: 439, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ width: '100%', height: 68, display: 'flex', alignItems: 'center', gap: 12, padding: 10, boxSizing: 'border-box', background: q.msgColor }}>
              <MessageIcon />
              <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#2f2f37', lineHeight: 1.1, letterSpacing: '-0.4px', flex: 1, minWidth: 0, margin: 0 }}>
                {q.text}
              </p>
            </div>
            <textarea
              className="jq-textarea"
              placeholder="Start writing here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%',
                height: 200,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 8,
                padding: '10px 16px',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-student-body)',
                fontSize: 16,
                fontWeight: 500,
                color: '#f2f3e5',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>

          <button type="button" className="jq-btn" onClick={saveAnswer} style={{ ...PRIMARY_BTN_STYLE, top: 721 }}>
            Save
          </button>
        </div>
      )}

      {/* ── S-SAVED ── */}
      {screen === 'saved' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <BackButton onClick={() => setScreen('write')} />
          <div
            style={{
              position: 'absolute',
              width: 1910,
              height: 1910,
              left: '50%',
              transform: 'translateX(-50%)',
              top: 197,
              borderRadius: '50%',
              background: '#1f1f25',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 274, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-student-display)', fontWeight: 400, fontSize: 32, color: '#f2f3e5', lineHeight: '40px', letterSpacing: '-0.8px' }}>+1</span>
            <img src={studentAsset('spark-4.svg')} alt="spark" style={{ width: 32, height: 32, display: 'block' }} />
          </div>

          <h1
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 326,
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 80,
              lineHeight: 1.06,
              color: '#f2f3e5',
              textAlign: 'center',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Note saved!
          </h1>

          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 423,
              width: 439,
              height: 68,
              background: '#58b880',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 10,
              boxSizing: 'border-box',
            }}
          >
            <MessageIcon />
            <p style={{ fontFamily: 'var(--font-student-body)', fontSize: 20, fontWeight: 500, color: '#2f2f37', lineHeight: 1.1, letterSpacing: '-0.4px', flex: 1, minWidth: 0, margin: 0 }}>
              Did writing this help you understand your feelings more?
            </p>
          </div>

          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 721, display: 'flex', gap: 24, alignItems: 'center' }}>
            <button
              type="button"
              className="jq-btn"
              onClick={() => navigate(`${base}/journal`)}
              style={{
                width: 270,
                height: 48,
                background: 'rgba(255,255,255,0.16)',
                color: '#ededed',
                fontFamily: 'var(--font-student-body)',
                fontSize: 16,
                fontWeight: 500,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.1px',
              }}
            >
              Not really
            </button>
            <button type="button" className="jq-btn" onClick={() => navigate(`${base}/journal`)} style={SAVED_PRIMARY_BTN_STYLE}>
              Yes, a bit!
            </button>
          </div>
        </div>
      )}
    </StudentStage>
  )
}

const PRIMARY_BTN_STYLE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 270,
  height: 48,
  background: '#f2f3e5',
  color: '#1f1f25',
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '-0.1px',
}

const SAVED_PRIMARY_BTN_STYLE: CSSProperties = {
  width: 270,
  height: 48,
  background: '#f2f3e5',
  color: '#1f1f25',
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '-0.1px',
}
