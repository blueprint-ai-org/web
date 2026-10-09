import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { EMPTY_CHECKIN_CATALOGUE, type CheckinCatalogue } from '~/lib/student/checkin-catalogue'
import { EMOTIONS, INTENSITY_BY_LEVEL, type EmotionKey } from '~/lib/student/emotions'
import { studentStorage } from '~/lib/student/storage'

import { StudentStage } from '../stage/StudentStage'

import { DEFAULT_LEVEL, DetailScreen } from './DetailScreen'
import { DoneScreen } from './DoneScreen'
import { EmotionPicker } from './EmotionPicker'
import { SLEEP_DEFAULT_INDEX } from './mood-data'
import { MOOD_CSS } from './mood-styles'
import { SleepScreen } from './SleepScreen'
import { WhyScreen, type ReasonSelection } from './WhyScreen'

/**
 * `/student/mood-checkin` — the daily check-in wizard, porting `mood-checkin.html`.
 *
 * The prototype drives its screens with an imperative `animateScreen(from,to,dir)`
 * (`:934-1007`) plus a handful of bespoke morphs (blob scale-6 entry, sleep-blob
 * scale-2, the done entry/exit). React's declarative model fights hand-tuned
 * multi-step DOM cinematics, so this component keeps the SAME imperative
 * controller: every screen is a stable `.mc-screen` wrapper the orchestrator
 * owns; children (picker selection, arc sliders, reason chips) manage their own
 * state without ever re-rendering the wrappers, so the imperative class/style
 * mutations that run the transitions are never clobbered by React.
 *
 * Flow: picker → one detail screen per picked emotion (pick order) → the reasons
 * screen → the 7-stop sleep slider → the done screen, which persists
 * `bp_mood_emotions`/`bp_mood_reasons` and exits into the hub with the blob-grow
 * choreography, setting `bp_mood_done`/`bp_fresh_start`/`bp_enter_anim`. `?edit=1`
 * reworks only the done screen (`:836-840`). Client-only (see the route's
 * `HydrateFallback`) — it reads storage and runs rAF-driven animation.
 */

const CLIP_BEZ = 'cubic-bezier(0.81,0,0.26,0.98)'
const DONE_BEZ = 'cubic-bezier(0.75,0,0.3,0.99)'

const decoTravel = (slot?: string) => (slot === 'tl' || slot === 'bl' ? '-900px' : '900px')
const decoRot = (slot?: string) => (slot === 'bl' ? ' rotate(30deg)' : slot === 'mr' ? ' rotate(40deg)' : '')

export function MoodCheckin({ catalogue = EMPTY_CHECKIN_CATALOGUE }: { catalogue?: CheckinCatalogue }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const edit = searchParams.get('edit') === '1'
  const home = pathname.startsWith('/preview/student') ? '/preview/student' : '/student'

  const [flowEmotions, setFlowEmotions] = useState<EmotionKey[] | null>(null)
  const total = flowEmotions?.length ?? 0

  const screenEls = useRef<Map<string, HTMLDivElement>>(new Map())
  const progRef = useRef<HTMLDivElement | null>(null)
  const progFillRef = useRef<HTMLDivElement | null>(null)
  const curRef = useRef('s0')
  const animatingRef = useRef(false)
  const startedRef = useRef(false)
  const reasonsRef = useRef<string[]>([])
  /** Arc stop per picked emotion, seeded at the slider's own default. */
  const levelsRef = useRef<Partial<Record<EmotionKey, number>>>({})
  const reasonAnswerRef = useRef<ReasonSelection>({ labels: [], optionIds: [], other: null })
  const sleepStopRef = useRef<number>(SLEEP_DEFAULT_INDEX)

  const setScreenRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) screenEls.current.set(id, el)
    else screenEls.current.delete(id)
  }

  const updateGlobalProg = (w?: string | null) => {
    if (progFillRef.current && w) progFillRef.current.style.width = `${w}px`
  }

  // ── Core transition controller (`animateScreen`, mood-checkin.html:934-1007) ──
  const animateScreen = useCallback((fromId: string, toId: string, dir: number) => {
    if (animatingRef.current) return
    const fromEl = screenEls.current.get(fromId)
    const toEl = screenEls.current.get(toId)
    if (!fromEl || !toEl) return
    animatingRef.current = true

    updateGlobalProg(toEl.dataset.progWidth)

    const useReveal = fromId.startsWith('ed-') && toId.startsWith('ed-')
    if (useReveal) {
      // Vertical clip-path wipe, ed ↔ ed only (`:946-974`).
      const DUR = 800
      const startClip = dir >= 0 ? 'inset(834px 0 0 0)' : 'inset(0 0 834px 0)'
      const fromNav = fromEl.querySelector<HTMLElement>('.mc-ed-nav')
      if (fromNav) {
        fromNav.style.opacity = '0'
        fromNav.style.pointerEvents = 'none'
      }
      toEl.style.zIndex = '10'
      toEl.style.transition = 'none'
      toEl.style.clipPath = startClip
      toEl.classList.add('active')
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          toEl.style.transition = `clip-path ${DUR}ms ${CLIP_BEZ}`
          toEl.style.clipPath = 'inset(0px 0 0 0)'
          window.setTimeout(() => {
            toEl.style.clipPath = 'none'
            toEl.style.transition = ''
            toEl.style.zIndex = ''
            fromEl.classList.remove('active')
            if (fromNav) {
              fromNav.style.opacity = ''
              fromNav.style.pointerEvents = ''
            }
            curRef.current = toId
            animatingRef.current = false
          }, DUR + 60)
        }),
      )
    } else {
      // Horizontal slide, everything else (`:977-1006`).
      const DUR = 1000
      const t = `transform ${DUR}ms ${CLIP_BEZ}`
      toEl.style.zIndex = '10'
      toEl.style.transition = 'none'
      toEl.style.opacity = '1'
      toEl.style.transform = `translateX(${dir * 100}%)`
      void toEl.offsetWidth // commit the start transform (also flushes blob scale-6)
      fromEl.style.transition = t
      fromEl.style.transform = `translateX(${dir * -100}%)`
      toEl.style.transition = t
      toEl.style.transform = 'translateX(0)'
      window.setTimeout(() => {
        toEl.classList.add('active')
        fromEl.style.transition = 'none'
        fromEl.style.opacity = '0'
        fromEl.classList.remove('active')
        fromEl.style.transform = ''
        toEl.style.transition = ''
        toEl.style.transform = ''
        toEl.style.opacity = ''
        toEl.style.zIndex = ''
        window.setTimeout(() => {
          fromEl.style.transition = ''
          fromEl.style.opacity = ''
        }, 50)
        curRef.current = toId
        animatingRef.current = false
      }, DUR + 60)
    }
  }, [])

  // ── Why-screen deco slide-in / slide-out (`animateWhyDecos`, :1131-1153) ──────
  const animateWhyDecos = useCallback(() => {
    const wh = screenEls.current.get('wh-0')
    if (!wh) return
    const decos = wh.querySelectorAll<HTMLElement>('.mc-why-deco')
    decos.forEach((deco) => {
      deco.style.transition = 'none'
      deco.style.transform = `translateX(${decoTravel(deco.dataset.slot)})${decoRot(deco.dataset.slot)}`
    })
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        decos.forEach((deco) => {
          deco.style.transition = `transform 800ms ${CLIP_BEZ}`
          deco.style.transform = decoRot(deco.dataset.slot).trim()
        })
      }),
    )
  }, [])

  // ── Detail-flow entry (`startDetailFlow`, :1024-1060) ─────────────────────────
  const startDetailFlow = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    const ed0 = screenEls.current.get('ed-0')
    const edShape = ed0?.querySelector<HTMLElement>('.mc-ed-shape')
    if (edShape) {
      edShape.style.transition = 'none'
      edShape.style.transform = 'scale(6)'
    }
    animateScreen('s0', 'ed-0', 1) // internal offsetWidth read commits scale(6)
    if (edShape) {
      edShape.style.transition = `transform 800ms ${CLIP_BEZ}`
      edShape.style.transform = 'scale(1)'
    }
  }, [animateScreen])

  // Kick off the detail flow once the screens mount (client-only; pre-paint).
  useLayoutEffect(() => {
    if (flowEmotions) startDetailFlow()
  }, [flowEmotions, startDetailFlow])

  // ── Why → sleep (`whyNext`, :1155-1189) ───────────────────────────────────────
  const whyNext = useCallback(() => {
    const wh = screenEls.current.get('wh-0')
    wh?.querySelectorAll<HTMLElement>('.mc-why-deco').forEach((deco) => {
      deco.style.transition = `transform 700ms ${CLIP_BEZ}`
      deco.style.transform = `translateX(${decoTravel(deco.dataset.slot)})${decoRot(deco.dataset.slot)}`
    })
    const sleepBlob = screenEls.current.get('s-sleep')?.querySelector<HTMLElement>('.mc-sleep-blob')
    if (sleepBlob) {
      sleepBlob.style.transition = 'none'
      sleepBlob.style.transform = 'scale(2)'
    }
    animateScreen(curRef.current, 's-sleep', 1)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (sleepBlob) {
          sleepBlob.style.transition = `transform 1000ms ${CLIP_BEZ}`
          sleepBlob.style.transform = ''
        }
      }),
    )
  }, [animateScreen])

  const goBackFromSleep = useCallback(() => {
    const sleepBlob = screenEls.current.get('s-sleep')?.querySelector<HTMLElement>('.mc-sleep-blob')
    if (sleepBlob) {
      sleepBlob.style.transition = 'none'
      sleepBlob.style.transform = ''
    }
    animateScreen(curRef.current, 'wh-0', -1)
  }, [animateScreen])

  // ── Sleep → done (`goToDone`, :866-892) ───────────────────────────────────────
  const goToDone = useCallback(() => {
    const sleep = screenEls.current.get('s-sleep')
    const done = screenEls.current.get('s-done')
    if (!sleep || !done) return
    const doneBlob = done.querySelector<HTMLElement>('.mc-done-blob')
    sleep.classList.add('s-sleep-exiting')
    if (progRef.current) {
      progRef.current.style.transition = 'opacity 400ms ease'
      progRef.current.style.opacity = '0'
    }
    if (doneBlob) {
      doneBlob.style.transition = 'none'
      doneBlob.style.transform = ''
    }
    window.setTimeout(() => {
      sleep.classList.remove('active')
      done.classList.add('active')
      curRef.current = 's-done'
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          done.classList.add('done-entered')
          if (doneBlob) {
            doneBlob.style.transition = `transform 900ms ${CLIP_BEZ}`
            doneBlob.style.transform = 'translateY(615px) scale(1.2)'
          }
        }),
      )
    }, 350)
  }, [])

  /**
   * Send the check-in.
   *
   * **Fire-and-forget on purpose.** This runs as the done blob starts its
   * 700ms exit and the hub navigation is already scheduled; awaiting it would
   * either stall that animation or race it. The endpoint never returns a
   * non-2xx and reports per-part success in its body, so there is nothing here
   * worth blocking a child's exit for. A failure is logged and the localStorage
   * write below still happens, so the hub renders correctly either way.
   */
  const postCheckin = useCallback(() => {
    const keys = flowEmotions ?? []
    const moods = keys
      .map((key) => {
        const moodId = catalogue.moodIdByKey[key]
        if (!moodId) return null
        const level = levelsRef.current[key] ?? DEFAULT_LEVEL
        return { moodId, intensity: INTENSITY_BY_LEVEL[level] ?? INTENSITY_BY_LEVEL[DEFAULT_LEVEL] }
      })
      .filter((m): m is { moodId: string; intensity: number } => m !== null)

    const { optionIds, labels, other } = reasonAnswerRef.current
    const sleepOption = catalogue.sleep?.options[sleepStopRef.current] ?? null

    // Nothing the gateway could accept — an LTI launch or an unseeded tenant.
    // The screen worked; there is simply nothing to send.
    if (moods.length === 0 && optionIds.length === 0 && !other && !sleepOption) return

    void fetch('/api/mood-checkin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        moods,
        ...(catalogue.reasons && optionIds.length > 0
          ? {
              reasons: {
                questionId: catalogue.reasons.id,
                question: catalogue.reasons.label,
                optionIds,
                answer: labels.join(', '),
              },
            }
          : {}),
        ...(catalogue.other && other
          ? { other: { questionId: catalogue.other.id, question: catalogue.other.label, answer: other } }
          : {}),
        ...(catalogue.sleep && sleepOption
          ? {
              sleep: {
                questionId: catalogue.sleep.id,
                question: catalogue.sleep.label,
                optionId: sleepOption.id,
                answer: sleepOption.label,
              },
            }
          : {}),
      }),
    }).catch((err: unknown) => {
      console.error('[mood-checkin] the check-in did not reach the server', err)
    })
  }, [catalogue, flowEmotions])

  // ── Done → hub (`finishMoodCheckin`, :894-917) ────────────────────────────────
  const finishMoodCheckin = useCallback(() => {
    postCheckin()
    studentStorage.setMoodEmotions(flowEmotions ?? [])
    studentStorage.setMoodReasons(reasonsRef.current)

    const done = screenEls.current.get('s-done')
    const doneBlob = done?.querySelector<HTMLElement>('.mc-done-blob')
    done?.classList.add('done-exiting')
    if (doneBlob) {
      doneBlob.style.transition = `transform 700ms ${DONE_BEZ}`
      doneBlob.style.transform = 'translateY(615px) scale(5)'
    }
    window.setTimeout(() => {
      studentStorage.setMoodDone(true)
      studentStorage.setFreshStart(true)
      studentStorage.setEnterAnim(true)
      navigate(home, { state: { enterAnim: true } })
    }, 700)
  }, [flowEmotions, home, navigate, postCheckin])

  const handleReasonsChange = useCallback((selection: ReasonSelection) => {
    reasonAnswerRef.current = selection
    reasonsRef.current = selection.labels
  }, [])


  const selectedEmotions = (flowEmotions ?? []).map((k) => EMOTIONS[k])
  const whProgWidth = total ? Math.round(120 + ((total + 1) / (total * 2 + 2)) * 600) : 726

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="mood-checkin">
      <style>{MOOD_CSS}</style>

      {/* Shared progress bar (`#globalProg`), updated by animateScreen. */}
      <div ref={progRef} className="mc-prog">
        <div ref={progFillRef} className="mc-prog-fill" style={{ width: 120 }} />
      </div>

      {/* S0 — emotion picker (active on first paint). */}
      <div ref={setScreenRef('s0')} className="mc-screen active" data-prog-width="120" style={{ background: '#1f1f25' }}>
        <EmotionPicker catalogue={catalogue} onContinue={setFlowEmotions} />
      </div>

      {/* Detail screens — one per picked emotion, in pick order. */}
      {selectedEmotions.map((em, idx) => (
        <div
          key={em.key}
          ref={setScreenRef(`ed-${idx}`)}
          className="mc-screen"
          data-prog-width={String(Math.round(120 + ((idx + 1) / (total * 2 + 2)) * 600))}
          style={{ background: em.color }}
        >
          <DetailScreen
            emotion={em}
            onLevelChange={(level) => {
              levelsRef.current[em.key] = level
            }}
            onBack={() => animateScreen(curRef.current, idx === 0 ? 's0' : `ed-${idx - 1}`, -1)}
            onNext={() => {
              if (idx < total - 1) {
                animateScreen(curRef.current, `ed-${idx + 1}`, 1)
              } else {
                animateScreen(curRef.current, 'wh-0', 1)
                animateWhyDecos()
              }
            }}
          />
        </div>
      ))}

      {/* Why screen — one per selection. */}
      {flowEmotions && (
        <div ref={setScreenRef('wh-0')} className="mc-screen" data-prog-width={String(whProgWidth)} style={{ background: '#1f1f25' }}>
          <WhyScreen
            question={catalogue.reasons}
            selectedEmotions={selectedEmotions}
            onReasonsChange={handleReasonsChange}
            onBack={() => animateScreen(curRef.current, `ed-${total - 1}`, -1)}
            onNext={whyNext}
          />
        </div>
      )}

      {/* Sleep + done — static screens, present from first render. */}
      <div ref={setScreenRef('s-sleep')} className="mc-screen mc-sleep" data-prog-width="726" style={{ background: '#3f50b8' }}>
        <SleepScreen
          question={catalogue.sleep}
          onStopChange={(index) => {
            sleepStopRef.current = index
          }}
          onBack={goBackFromSleep}
          onNext={goToDone}
        />
      </div>

      <div ref={setScreenRef('s-done')} className="mc-screen mc-done" style={{ background: '#3f50b8' }}>
        <DoneScreen edit={edit} onFinish={finishMoodCheckin} />
      </div>
    </StudentStage>
  )
}
