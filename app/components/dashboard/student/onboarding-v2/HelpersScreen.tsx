import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { CatalogueQuestion } from '~/lib/bp-ai/questions.server'

import {
  GOOGLY_WANDER_FACE,
  GooglyEyes,
  type GooglyEye,
  type GooglyFaceClip,
} from './GooglyEyes'
import { NavRow, OnboardingStage, TitleLG } from './OnboardingChrome'
import { QuestionUnavailable } from './QuestionUnavailable'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `helpers` (prototype `#s5`, `onboarding.html:1237-1379`).
 * "What helps you feel good?" — six multi-selectable feel-good cards with live
 * googly eyes (`fcRaf` pupil wander) (`toggleFc`, `:1960`).
 * Back → `baseline-mood`, Next → `trusted-person` plays the ellipse-scale slide.
 *
 * The heading and the six labels come from the BP AI question catalogue; when
 * the route's loader could not read it there is nothing to draw (see
 * {@link QuestionUnavailable}). The **art** is never catalogue data: each card
 * carries a hand-placed illustration and, on five of six, its own googly-eye
 * geometry, so the catalogue supplies wording and the code supplies drawing.
 * The option's stable `value` pairs them, never its `order`.
 */

const FACE_A: GooglyFaceClip = { x: 41, y: 50, w: 112.434, h: 112.434, rx: 56.217 }
const FACE_B: GooglyFaceClip = { x: 37, y: 46, w: 120, h: 120, rx: 60 }
const PUPIL = '#36363F'

interface CardSpec {
  art: string
  faceClip?: GooglyFaceClip
  eyes?: readonly GooglyEye[]
}

/**
 * The art, keyed by the option's `value`.
 *
 * **It was a positional array** (`CARDS[i]`), so inserting an option shuffled
 * every illustration after it — the pictures were pinned to `order`, which is a
 * number an admin can change, rather than to `value`, which is the stable token
 * the catalogue guarantees. The labels went with it: they are the catalogue's.
 *
 * A value with no art renders the plain card, which is the point of the lookup
 * failing softly: a seventh option an admin adds is drawn, unillustrated,
 * instead of taking the screen down or shifting the other six.
 */
const CARD_ART: Record<string, CardSpec> = {
  good_sleep: { art: 'card-ilu-01.svg' },
  friends: {
    art: 'card-ilu-02.svg',
    faceClip: FACE_A,
    eyes: [
      { wcx: 55.729, wcy: 75.729, wrx: 12.063, wry: 12.063, pcx: 59.604, pcy: 78.102, pr: 7.676 },
      { wcx: 84.361, wcy: 75.729, wrx: 12.063, wry: 12.063, pcx: 88.237, pcy: 78.102, pr: 7.676 },
      { wcx: 123.976, wcy: 95.217, wrx: 11.966, wry: 11.966, pcx: 121.935, pcy: 91.339, pr: 7.615 },
      { wcx: 151.634, wcy: 95.217, wrx: 11.966, wry: 11.966, pcx: 155.363, pcy: 97.707, pr: 7.615 },
      { wcx: 81.65, wcy: 128.954, wrx: 13.117, wry: 13.117, pcx: 82.12, pcy: 124.203, pr: 8.347 },
      { wcx: 112.785, wcy: 128.954, wrx: 13.117, wry: 13.117, pcx: 113.529, pcy: 124.203, pr: 8.347 },
    ],
  },
  good_food: {
    art: 'card-ilu-03.svg',
    faceClip: FACE_B,
    eyes: [
      { wcx: 80.385, wcy: 97.719, wrx: 14, wry: 14, pcx: 79.909, pcy: 102.909, pr: 8.909 },
      { wcx: 113.615, wcy: 97.719, wrx: 14, wry: 14, pcx: 113.909, pcy: 102.909, pr: 8.909 },
    ],
  },
  sports: {
    art: 'card-ilu-04.svg',
    faceClip: FACE_B,
    eyes: [
      { wcx: 80.385, wcy: 116.1, wrx: 14, wry: 14, pcx: 79.909, pcy: 110.909, pr: 8.909 },
      { wcx: 113.615, wcy: 116.1, wrx: 14, wry: 14, pcx: 113.909, pcy: 110.909, pr: 8.909 },
    ],
  },
  art_music: {
    art: 'card-ilu-05.svg',
    faceClip: FACE_B,
    eyes: [
      { wcx: 80.385, wcy: 115, wrx: 14, wry: 14, pcx: 79.909, pcy: 117.81, pr: 8.909 },
      { wcx: 113.615, wcy: 115, wrx: 14, wry: 14, pcx: 113.909, pcy: 117.81, pr: 8.909 },
    ],
  },
  talk: {
    art: 'card-ilu-06.svg',
    faceClip: FACE_B,
    eyes: [
      { wcx: 39.729, wcy: 94.729, wrx: 12.063, wry: 12.063, pcx: 43.604, pcy: 97.102, pr: 7.676 },
      { wcx: 68.361, wcy: 94.729, wrx: 12.063, wry: 12.063, pcx: 72.237, pcy: 97.102, pr: 7.676 },
      { wcx: 127.226, wcy: 93.118, wrx: 13.117, wry: 13.117, pcx: 122.347, pcy: 94.348, pr: 8.347 },
      { wcx: 156.226, wcy: 89.118, wrx: 13.117, wry: 13.117, pcx: 151.347, pcy: 90.348, pr: 8.347 },
    ],
  },
}

export interface HelpersScreenProps {
  /** The catalogue row, or `null` — which renders {@link QuestionUnavailable}. */
  question?: CatalogueQuestion | null
}

/** The art for an option, by its stable `value`. Missing art is a plain card. */
const artFor = (value: string): CardSpec | undefined => CARD_ART[value]

export function HelpersScreen({ question = null }: HelpersScreenProps = {}) {
  const t = useOnboardingTransition('helpers')
  const fetcher = useFetcher<{ saved: boolean }>()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (!question) return <QuestionUnavailable slug="helpers" transition={t} />

  const heading = question.label
  const cards = question.options

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  /**
   * Record on Next, and only with something to record.
   *
   * A student who picks nothing has answered nothing: `MULTISELECT` is
   * validated as *"one to `max_selections`"*, so an empty answer would be
   * refused by the gateway, and writing a row saying "none of these" would be
   * a claim the screen never asked for. Skipping helps nobody less and keeps
   * the dataset honest.
   *
   * Fire-and-forget, like `baseline-mood`: the slide starts immediately and the
   * action logs its own failures, because freezing a child mid-onboarding is
   * worse than losing one datum.
   */
  const next = () => {
    const chosen = question ? [...selected].sort((a, b) => a - b).map((i) => question.options[i]) : []
    if (question && chosen.length > 0) {
      // A `FormData`, not an object: React Router encodes a plain object with
      // `new URLSearchParams(body)`, which flattens an array to one
      // comma-joined value. Appending keeps the ids as separate fields, which
      // is what `formData.getAll('optionIds')` reads on the other side.
      const form = new FormData()
      form.set('questionId', question.id)
      form.set('question', question.label)
      form.set('answer', chosen.map((o) => o.label).join(', '))
      for (const option of chosen) form.append('optionIds', option.id)
      fetcher.submit(form, { method: 'post' })
    }
    t.next()
  }

  return (
    <OnboardingStage slug="helpers" background="#1f1f25" motion={t.motion}>
      <style>{FC_CSS}</style>

      <div style={{ position: 'absolute', left: '50%', top: 112, transform: 'translateX(-50%)', width: 1090, zIndex: 5, textAlign: 'center' }}>
        {/*
          The baked copy carried a hand-placed `<br />` between "you" and
          "feel"; a catalogue label cannot carry one. The box is sized to put
          the break back: "What helps you" measures 394px in 64px Anton and
          "…feel" would overrun 440, so the greedy break lands exactly where the
          design put it, and a reworded question simply wraps instead of
          overflowing.

          Not `text-wrap: balance` — unlike `baseline-mood`, whose two halves
          are lopsided enough that balancing reproduces its break, this heading
          splits almost evenly either way (394px vs 379px) and balance picks the
          other one, moving "you" down a line.
        */}
        <div style={{ width: 440, margin: '0 auto' }}>
          <TitleLG>{heading}</TitleLG>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 132,
            maxWidth: 1067,
            marginLeft: 'auto',
            marginRight: 'auto',
            overflow: 'hidden',
          }}
        >
          {cards.map((option, i) => {
            // The art follows the option's VALUE, so adding or reordering an
            // option cannot shuffle the illustrations. An option the catalogue
            // added without art renders as a plain card rather than vanishing.
            const art = artFor(option.value)
            return (
            <div
              key={option.id}
              className={`ob-fc${selected.has(i) ? ' sel' : ''}`}
              onClick={() => toggle(i)}
            >
              <div className="ob-fc-art">
                {/* `imageUrl` from the catalogue wins when it is there: the
                    illustrations are being moved into the option rows, and
                    until the bucket exists this falls back to the local SVG. */}
                {option.imageUrl ? (
                  <img src={option.imageUrl} alt="" />
                ) : art ? (
                  <img src={studentAsset(art.art)} alt="" />
                ) : null}
                {art?.eyes && (
                  <GooglyEyes
                    viewBox="0 0 195 245"
                    faceClip={art.faceClip}
                    eyes={art.eyes}
                    pupilFill={PUPIL}
                    wander={GOOGLY_WANDER_FACE}
                  />
                )}
              </div>
              <div className="ob-fc-bar">{option.label}</div>
              <div className="ob-fc-check">
                <img src={studentAsset('checkbox.svg')} alt="" />
              </div>
            </div>
            )
          })}
        </div>
      </div>

      <NavRow onBack={t.back} onNext={next} />
    </OnboardingStage>
  )
}

const FC_CSS = `
.ob-fc {
  flex: 1; height: 211px; min-width: 0; background: #49aee1; border-radius: 28px;
  position: relative; cursor: pointer; overflow: hidden;
}
.ob-fc::after {
  content: ''; position: absolute; inset: 0; border: 13px solid #36363f;
  border-radius: 28px; pointer-events: none; z-index: 3; transition: border-color 200ms;
}
.ob-fc:hover { opacity: 0.88; }
.ob-fc.sel::after { border-color: #f2f3e5; }
.ob-fc-art { position: absolute; inset: 0; }
.ob-fc-art img { width: 100%; height: 100%; display: block; object-fit: fill; }
.ob-fc-bar {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 116px; height: 49px; background: #36363f; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-student-display); font-weight: 400; font-size: 16px;
  color: #f2f3e5; text-transform: uppercase; letter-spacing: 0.02em; text-align: center;
  line-height: 1.05; padding: 0 10px; white-space: nowrap;
  transition: background 200ms, color 200ms; z-index: 4;
}
.ob-fc.sel .ob-fc-bar { background: #f2f3e5; color: #1f1f25; }
.ob-fc-check { position: absolute; top: 24px; right: 24px; width: 36px; height: 36px; display: none; z-index: 5; }
.ob-fc.sel .ob-fc-check { display: block; }
.ob-fc-check img { width: 100%; height: 100%; display: block; }
`
