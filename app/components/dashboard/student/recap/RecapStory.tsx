import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { studentAsset } from '~/assets/student-app'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { CARE_CARDS, RECAP_COPY, RECAP_TOTAL, SLEEP_PINS } from './recap-data'
import { RECAP_CSS } from './recap-styles'

/**
 * `/student/recap` — the 6-slide monthly-recap story (ports `recap.html`).
 *
 * A "wrapped"-style story: Intro → Cloud/quote → Emotions → Sleep & mood →
 * You kept taking care → Final. Navigation is direction-aware
 * ({@link animateToSlide}) with an animation lock so a mid-transition tap is
 * ignored; the segmented progress bar + nav slide in from slide 2 onward; the
 * final slide's wave shrinks (scale 6 → 1.2) in lockstep with the slide-in.
 *
 * The prototype clip-path-reveals the whole `.bp-device` from the bottom; here
 * the shared {@link StudentStage} is the device, so the reveal runs on an inner
 * `.rc-device` wrapper via a three-step React state phase (hidden → revealing →
 * done). Exit ("Back to Journey" on the last slide) → `/student/journey?from=recap`,
 * preserving the prototype's return-choreography contract. Full-bleed page (no
 * sidebar); mirrored at `/preview/student/recap`.
 */

const SLIDE_DUR = 1000
const SLIDE_BEZ = 'cubic-bezier(0.81,0,0.26,0.98)'

export function RecapStory() {
  const navigate = useNavigate()
  const base = useStudentNavBase()

  const [activeIdx, setActiveIdx] = useState(0)
  const [chromeIdx, setChromeIdx] = useState(0)
  const animatingRef = useRef(false)

  const slideRefs = useRef<Array<HTMLDivElement | null>>([])
  const setSlideRef = (i: number) => (el: HTMLDivElement | null) => {
    slideRefs.current[i] = el
  }
  const waveRef = useRef<HTMLImageElement | null>(null)

  // ── Device clip-path entry reveal (recap.html:17,504-511) ────────────────────
  const [phase, setPhase] = useState<'hidden' | 'revealing' | 'done'>('hidden')
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('revealing'), 600)
    const t2 = window.setTimeout(() => setPhase('done'), 600 + 810)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  const deviceClip = phase === 'hidden' ? 'inset(834px 0 0 0)' : phase === 'revealing' ? 'inset(0px 0 0 0)' : 'none'
  const deviceTransition = phase === 'revealing' ? `clip-path 800ms cubic-bezier(0.81, 0, 0.26, 0.98)` : 'none'

  // ── Direction-aware slide machine (recap.html:445-497) ───────────────────────
  function animateToSlide(from: number, to: number) {
    if (animatingRef.current) return
    animatingRef.current = true

    const fromEl = slideRefs.current[from]
    const toEl = slideRefs.current[to]
    if (!fromEl || !toEl) {
      animatingRef.current = false
      return
    }

    const wave = waveRef.current
    if (wave) {
      wave.style.transition = 'none'
      wave.style.transform = 'translate(-50%, -50%) scale(6)'
    }

    const dir = to > from ? 1 : -1
    toEl.style.transition = 'none'
    toEl.style.transform = `translateX(${dir * 100}%)`
    toEl.style.opacity = '1'
    void toEl.offsetWidth // force reflow — commits the wave scale(6) reset too

    const t = `transform ${SLIDE_DUR}ms ${SLIDE_BEZ}`
    fromEl.style.transition = t
    fromEl.style.transform = `translateX(${dir * -100}%)`
    toEl.style.transition = t
    toEl.style.transform = 'translateX(0)'

    if (to === RECAP_TOTAL - 1 && wave) {
      wave.style.transition = 'transform 800ms cubic-bezier(0.81,0,0.26,0.98)'
      wave.style.transform = 'translate(-50%, -50%) scale(1.2)'
    }

    // Chrome animates simultaneously with the slide.
    setChromeIdx(to)

    window.setTimeout(() => {
      setActiveIdx(to)
      fromEl.style.cssText = ''
      toEl.style.cssText = ''
      animatingRef.current = false
    }, SLIDE_DUR + 60)
  }

  const goNext = () => {
    if (activeIdx < RECAP_TOTAL - 1) animateToSlide(activeIdx, activeIdx + 1)
  }
  const goPrev = () => {
    if (activeIdx > 0) animateToSlide(activeIdx, activeIdx - 1)
  }
  const goToday = () => navigate(`${base}/journey?from=recap`)

  const isFinal = chromeIdx === RECAP_TOTAL - 1
  const slideClass = (i: number, extra: string) => `rc-slide ${extra}${activeIdx === i ? ' active' : ''}`

  return (
    <StudentStage style={{ backgroundColor: '#0a0a0f' }} data-testid="recap">
      <style>{RECAP_CSS}</style>

      <div className="rc-device" style={{ clipPath: deviceClip, transition: deviceTransition }}>
        <div className="rc-inner">
          {/* Progress bar */}
          <div className={`rc-progress${chromeIdx !== 0 ? ' visible' : ''}`}>
            <div className="rc-progress-track" />
            <div className="rc-progress-fill" style={{ width: `${(chromeIdx / (RECAP_TOTAL - 1)) * 100}%` }} />
          </div>

          {/* Slide 1: Intro */}
          <div className={slideClass(0, 'rc-slide-intro')} ref={setSlideRef(0)}>
            <div className="rc-intro-bg">
              <img src={studentAsset('tlo-01.svg')} alt="" />
            </div>
            <div className="rc-intro-group">
              <p className="rc-intro-month">{RECAP_COPY.introMonth}</p>
              <h1 className="rc-intro-title">
                {RECAP_COPY.introTitle[0]}
                <br />
                {RECAP_COPY.introTitle[1]}
              </h1>
            </div>
            <button type="button" className="rc-btn-start" onClick={goNext}>
              {RECAP_COPY.btnStart}
            </button>
          </div>

          {/* Slide 2: Cloud / Quote */}
          <div className={slideClass(1, 'rc-slide-cloud')} ref={setSlideRef(1)}>
            <div className="rc-cloud-img">
              <img src={studentAsset('tlo-02.svg')} alt="" />
            </div>
            <div className="rc-cloud-text">
              <p className="rc-cloud-label">{RECAP_COPY.cloudLabel}</p>
              <p className="rc-cloud-quote">{RECAP_COPY.cloudQuote}</p>
            </div>
          </div>

          {/* Slide 3: Emotions */}
          <div className={slideClass(2, 'rc-slide-emotions')} ref={setSlideRef(2)}>
            <div className="rc-emo-content">
              <h2 className="rc-stat-heading">
                {RECAP_COPY.emotionsHeading[0]}
                <br />
                {RECAP_COPY.emotionsHeading[1]}
              </h2>
              <p className="rc-stat-sub">{RECAP_COPY.emotionsSub}</p>
            </div>
            <img className="rc-intro-planet" src={studentAsset('planet.svg')} alt="" />
            <img className="rc-emo-bg" src={studentAsset('good-emo.svg')} alt="" />
          </div>

          {/* Slide 4: Sleep & mood */}
          <div className={slideClass(3, 'rc-slide-journey')} ref={setSlideRef(3)}>
            <div className="rc-journey-content">
              <h2 className="rc-journey-heading">{RECAP_COPY.sleepHeading}</h2>
              <p className="rc-journey-sub">{RECAP_COPY.sleepSub}</p>
            </div>
            <img className="rc-journey-bg" src={studentAsset('graph2.svg')} alt="" />
            {SLEEP_PINS.map((pin) => (
              <div key={pin.desc} className="rc-stat-pin" style={{ left: pin.left, top: pin.top }}>
                <p className="rc-stat-num">{pin.num}</p>
                <p className="rc-stat-num-desc">{pin.desc}</p>
              </div>
            ))}
          </div>

          {/* Slide 5: You kept taking care */}
          <div className={slideClass(4, 'rc-slide-care')} ref={setSlideRef(4)}>
            <div className="rc-care-content">
              <p className="rc-care-sub">{RECAP_COPY.careSub}</p>
              <h2 className="rc-care-heading">{RECAP_COPY.careHeading}</h2>
            </div>
            <div className="rc-care-cards">
              {CARE_CARDS.map((card) => (
                <div key={card.label} className="rc-care-card">
                  <span className="rc-care-card-label">{card.label}</span>
                  <div className="rc-care-card-shape">
                    <img src={studentAsset(card.shape)} alt="" />
                  </div>
                  <span className="rc-care-card-num">{card.num}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slide 6: Final */}
          <div className={slideClass(5, 'rc-slide-final')} ref={setSlideRef(5)}>
            <div className="rc-final-bg">
              <img src={studentAsset('tlo-recap.svg')} alt="" />
            </div>
            <img className="rc-final-wave" ref={waveRef} src={studentAsset('wave-recap.svg')} alt="" />
            <div className="rc-final-content">
              <p className="rc-final-label">{RECAP_COPY.finalLabel}</p>
              <h2 className="rc-final-heading">{RECAP_COPY.finalHeading}</h2>
            </div>
          </div>

          {/* Navigation (slides 2–6) */}
          <div className={`rc-nav${chromeIdx !== 0 ? ' visible' : ''}`}>
            <button type="button" className="rc-back" aria-label="Back" onClick={goPrev}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15.833L6.667 10 12.5 4.167" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="rc-next" onClick={isFinal ? goToday : goNext}>
              {isFinal ? RECAP_COPY.navBackToJourney : RECAP_COPY.navNext}
            </button>
          </div>
        </div>
      </div>
    </StudentStage>
  )
}
