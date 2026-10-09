import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { CatalogueQuestion } from '~/lib/bp-ai/questions.server'
import { TRUSTED_PERSON_QUESTION } from '~/lib/student/onboarding-questions'

import { NavRow, OnboardingStage, TitleLG } from './OnboardingChrome'
import { OB_EASE_REVEAL } from './transitions'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `trusted-person` (prototype `#s6`, `onboarding.html:1385-1410`).
 * "Who helps you when things are hard?" — multi-selectable person chips
 * (`togglePb`, `:1964`). Back → `helpers`, Next → `complete`.
 *
 * **The catalogue owns this list outright** — its wording, its emoji and how
 * many people are on it. Unlike the mood arc (five stops drawn to fixed
 * geometry) and the feel-good cards (six hand-placed illustrations), a chip is
 * a 179×94 button in a wrapping row carrying an emoji and a label, so an eighth
 * person added in the catalogue simply wraps onto the next line. {@link PEOPLE}
 * is the fallback for a request with no BP session and the text the catalogue
 * was seeded with, not a list the screen is limited to.
 *
 * Arriving from `helpers` the purple ellipse scales down 1.8 → 1 as the content
 * slides in from the right (prototype `slideS5toS6`, `:1789-1808`); the ellipse
 * rides {@link OnboardingStage}'s `backgroundLayer` so the content slide does
 * not sweep it.
 */

const PEOPLE: readonly Person[] = [
  { emoji: '👥', label: 'Friend' },
  { emoji: '👨‍👩‍👦', label: 'Parent or Guardian' },
  { emoji: '🏠', label: 'Family Member' },
  { emoji: '🍎', label: 'Teacher' },
  { emoji: '💬', label: 'Counselor' },
  { emoji: '😶', label: 'No One Right Now' },
  { emoji: '📱', label: 'AI' },
]

export interface TrustedPersonScreenProps {
  /** The catalogue row, or `null` to render the baked copy. */
  question?: CatalogueQuestion | null
}

/** One chip. `emoji` is optional: a person the catalogue added without one. */
interface Person {
  emoji: string | null
  label: string
}

function peopleFrom(question: CatalogueQuestion | null): readonly Person[] {
  if (!question || question.options.length === 0) return PEOPLE
  return question.options.map((o) => ({ emoji: o.emoji, label: o.label }))
}

export function TrustedPersonScreen({ question = null }: TrustedPersonScreenProps = {}) {
  const t = useOnboardingTransition('trusted-person')
  const fetcher = useFetcher<{ saved: boolean }>()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const heading = question?.label ?? TRUSTED_PERSON_QUESTION.label
  const people = peopleFrom(question)

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  /**
   * Record on Next, and only with somebody chosen.
   *
   * Same contract as `helpers`: not on every chip (a student weighing seven
   * people would write seven rows), never empty (a `MULTISELECT` answer is
   * validated as one to `max_selections`, and "nobody at all" is what the
   * *"No One Right Now"* chip is for — a chosen answer, not an absent one), and
   * fire-and-forget so the transition never waits on the network.
   */
  const next = () => {
    const chosen = question ? [...selected].sort((a, b) => a - b).map((i) => question.options[i]) : []
    if (question && chosen.length > 0) {
      // A `FormData`, not an object: React Router encodes a plain object with
      // `new URLSearchParams`, which flattens an array to one joined value.
      const form = new FormData()
      form.set('questionId', question.id)
      form.set('question', question.label)
      form.set('answer', chosen.map((o) => o.label).join(', '))
      for (const option of chosen) form.append('optionIds', option.id)
      fetcher.submit(form, { method: 'post' })
    }
    t.next()
  }

  // The ellipse scales in only when arriving via the helpers → trusted-person
  // slide; on a direct load / back nav it sits at its rest scale.
  const scaleIn = t.motion.enterKind === 'ellipse-scale'
  const ellipseScale = scaleIn && !t.motion.entered ? 1.8 : 1

  const ellipse = (
    <img
      src={studentAsset('backgrounds/ellipse-17.svg')}
      alt=""
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -44%) scale(${ellipseScale})`,
        width: 1114,
        height: 1114,
        pointerEvents: 'none',
        zIndex: 0,
        transition: scaleIn ? `transform 800ms ${OB_EASE_REVEAL}` : 'none',
      }}
    />
  )

  return (
    <OnboardingStage slug="trusted-person" background="#b38aff" motion={t.motion} backgroundLayer={ellipse}>
      <style>{PB_CSS}</style>

      <div style={{ position: 'absolute', left: '50%', top: 128, transform: 'translateX(-50%)', width: 790, zIndex: 5, textAlign: 'center' }}>
        {/*
          The baked copy carried a hand-placed `<br />` after "when"; a
          catalogue label cannot. The 560px box the design already had puts the
          break back on its own — "Who helps you when" fills it — and a reworded
          question wraps inside it instead of overflowing.
        */}
        <TitleLG style={{ width: 560, margin: '0 auto' }}>{heading}</TitleLG>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 80 }}>
          {people.map((p, i) => (
            <button
              key={p.label}
              type="button"
              className={`ob-pb${selected.has(i) ? ' sel' : ''}`}
              onClick={() => toggle(i)}
            >
              {/* A person the catalogue added without an emoji gets no empty
                  circle; the chip is then just the name, centred. */}
              {p.emoji && (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: '#1f1f25',
                    border: '1px solid rgba(92,92,101,0.3)',
                    borderRadius: 34,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 22,
                  }}
                >
                  {p.emoji}
                </div>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-student-body)',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#f2f3e5',
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <NavRow onBack={t.back} onNext={next} />
    </OnboardingStage>
  )
}

const PB_CSS = `
.ob-pb {
  width: 179px; height: 94px; background: #2f2f37; border-radius: 8px;
  border: 1px solid rgba(92,92,101,0.3); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  transition: border 160ms, transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ob-pb:hover { transform: scale(1.03); }
.ob-pb.sel { border: 3px solid #f2f3e5; }
`
