/**
 * Token visual smoke test page.
 *
 * Renders every Blueprint design token declared in `app/app.css`:
 *  - Color swatches (semantic + custom groups) with name + computed hex.
 *  - Typography samples for DM Sans weights / sizes.
 *  - Radius scale samples (sm, md, lg, xl2).
 *  - Shadow samples (shadow-glass, shadow-glow).
 *  - 7 animation cards, each with a Replay button.
 *  - A light/dark toggle that flips `counselor-light` on a wrapper element.
 *
 * Doubles as a QA artifact (phase B3) and a design-system reference page.
 */

import { useEffect, useRef, useState } from 'react'
import type { Route } from './+types/_demo.tokens'
import { Button } from '~/components/ui/button'
import { useThemeMode } from '~/hooks/useThemeMode'
import { readThemeMode } from '~/lib/theme-cookie.server'

export function meta() {
  return [
    { title: 'Tokens demo' },
    { name: 'description', content: 'Visual smoke test for Blueprint Tailwind 4 tokens.' },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  return { mode: readThemeMode(request, 'counselor') }
}

/**
 * Token names that resolve to `var(--color-*)` via Tailwind 4's @theme block.
 * Used as `style={{ background: 'var(--color-foo)' }}` because Tailwind can't
 * generate dynamic class names from a runtime list.
 */
const COLOR_TOKENS: readonly string[] = [
  // Semantic — dark defaults; overridden in `.counselor-light`
  'background',
  'foreground',
  'card',
  'card-foreground',
  'card-hover',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'primary-light',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'destructive-dim',
  'success',
  'success-foreground',
  'success-dim',
  'warning',
  'warning-foreground',
  'warning-dim',
  'info',
  'info-foreground',
  'border',
  'input',
  'ring',
  'surface',
  // Canvas-LMS
  'canvas-red',
  'canvas-sidebar',
  // Chart accents
  'chart-cyan',
  'chart-pink',
  'chart-orange',
  // Blueprint brand
  'blueprint-bg',
  'blueprint-surface',
  'blueprint-border',
  'blueprint-muted',
  'blueprint-subtle',
  'blueprint-violet',
  'blueprint-blue',
  'blueprint-mint',
  'blueprint-amber',
  'blueprint-coral',
  // Student
  'student-bg',
  'student-surface',
  'student-text',
  'student-text-muted',
  'student-mood',
  'student-survey',
  'student-journal',
  'student-sleep',
  'student-accent',
  'student-border',
  // Sidebar
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const

const ANIMATIONS: readonly { name: string; className: string; label: string }[] = [
  { name: 'fade-in', className: 'animate-fade-in', label: 'fade-in (0.4s)' },
  { name: 'scale-in', className: 'animate-scale-in', label: 'scale-in (0.3s)' },
  { name: 'bounce-once', className: 'animate-bounce-once', label: 'bounce-once (0.5s)' },
  { name: 'pulse-glow', className: 'animate-pulse-glow', label: 'pulse-glow (2s loop)' },
  { name: 'ping-slow', className: 'animate-ping-slow', label: 'ping-slow (1.5s loop)' },
  { name: 'accordion-down', className: 'animate-accordion-down', label: 'accordion-down (0.2s)' },
  { name: 'accordion-up', className: 'animate-accordion-up', label: 'accordion-up (0.2s)' },
] as const

/**
 * Student prototype-migration tokens (Phase 1). Surfaces/text sourced from the
 * prototype's `tokens.css`; the emotion palette from `emotions.ts`; the easing
 * ramp from the mood-checkin/support cinematics.
 */
const STUDENT_SURFACE_TOKENS: readonly string[] = [
  'student-bg-primary',
  'student-bg-deep',
  'student-bg-darkest',
  'student-surface-raised',
  'student-surface-low',
  'student-chrome',
  'student-hover',
  'student-letterbox',
  'student-cream-dark',
  'student-muted',
  'student-text-dark',
  'student-unlock-success',
  'student-sleep-grad-start',
  'student-sleep-grad-end',
] as const

const STUDENT_EMOTIONS: readonly { key: string; name: string }[] = [
  { key: 'curious', name: 'Curious' },
  { key: 'happy', name: 'Happy' },
  { key: 'excited', name: 'Excited' },
  { key: 'okay', name: 'Okay' },
  { key: 'grateful', name: 'Grateful' },
  { key: 'hopeful', name: 'Hopeful' },
  { key: 'meh', name: 'Meh' },
  { key: 'neutral', name: 'Neutral' },
  { key: 'idontknow', name: "I Don't Know" },
  { key: 'sad', name: 'Sad' },
  { key: 'tired', name: 'Tired' },
  { key: 'lonely', name: 'Lonely' },
  { key: 'angry', name: 'Angry' },
  { key: 'stressed', name: 'Stressed' },
  { key: 'anxious', name: 'Anxious' },
] as const

const STUDENT_EASINGS: readonly { token: string; label: string }[] = [
  { token: 'student-soft', label: 'ease-student-soft' },
  { token: 'student-flip', label: 'ease-student-flip' },
  { token: 'student-spring', label: 'ease-student-spring' },
  { token: 'student-reveal', label: 'ease-student-reveal' },
  { token: 'student-exit', label: 'ease-student-exit' },
  { token: 'student-anticipate', label: 'ease-student-anticipate' },
] as const

/**
 * Emotion swatch pair — primary `--color-student-emotion-{key}` alongside its
 * darker `-grad` gradient stop. Reads both computed hexes off the DOM.
 */
function EmotionSwatch({ emotionKey, name, mode }: { emotionKey: string; name: string; mode: string }) {
  const colorRef = useRef<HTMLDivElement>(null)
  const gradRef = useRef<HTMLDivElement>(null)
  const [computed, setComputed] = useState<{ color: string; grad: string }>({ color: '', grad: '' })

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!colorRef.current || !gradRef.current) return
      setComputed({
        color: getComputedStyle(colorRef.current).backgroundColor,
        grad: getComputedStyle(gradRef.current).backgroundColor,
      })
    })
    return () => cancelAnimationFrame(id)
  }, [mode])

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-xs">
      <div className="flex h-14 w-full overflow-hidden rounded">
        <div
          ref={colorRef}
          data-testid={`emotion-${emotionKey}`}
          className="h-full flex-1"
          style={{ background: `var(--color-student-emotion-${emotionKey})` }}
        />
        <div
          ref={gradRef}
          data-testid={`emotion-${emotionKey}-grad`}
          className="h-full flex-1"
          style={{ background: `var(--color-student-emotion-${emotionKey}-grad)` }}
        />
      </div>
      <div className="font-medium text-card-foreground">{name}</div>
      <div className="text-muted-foreground tabular-nums">{computed.color || '…'}</div>
      <div className="text-muted-foreground tabular-nums">grad {computed.grad || '…'}</div>
    </div>
  )
}

/** Easing demo — a dot eases across a track on Play, timed by the token curve. */
function EasingDemo({ token, label }: { token: string; label: string }) {
  const [on, setOn] = useState(false)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="text-xs font-medium text-card-foreground">{label}</div>
      <div className="relative h-8 w-full rounded bg-muted">
        <div
          data-testid={`ease-${token}`}
          className="absolute top-1 h-6 w-6 rounded-full bg-primary"
          style={{
            left: on ? 'calc(100% - 1.5rem)' : '0px',
            transitionProperty: 'left',
            transitionDuration: '900ms',
            transitionTimingFunction: `var(--ease-${token})`,
          }}
        />
      </div>
      <Button
        data-testid={`ease-play-${token}`}
        variant="outline"
        size="sm"
        onClick={() => setOn((o) => !o)}
      >
        Play
      </Button>
    </div>
  )
}

/**
 * Swatch — renders a single color token. Reads the computed value off the DOM
 * after mount so it reflects the active theme scope (the same token resolves
 * to a different hex under `.counselor-light`).
 */
function Swatch({ token, mode }: { token: string; mode: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [computed, setComputed] = useState<string>('')

  useEffect(() => {
    if (!ref.current) return
    // Read on next frame so theme-class flips have propagated to computed style.
    const id = requestAnimationFrame(() => {
      if (!ref.current) return
      const val = getComputedStyle(ref.current).backgroundColor
      setComputed(val)
    })
    return () => cancelAnimationFrame(id)
    // `mode` is in deps so the readout updates when the theme class flips.
  }, [mode])

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-xs">
      <div
        ref={ref}
        data-testid={`swatch-${token}`}
        className="h-14 w-full rounded"
        style={{ background: `var(--color-${token})` }}
      />
      <div className="font-medium text-card-foreground">{token}</div>
      <div className="text-muted-foreground tabular-nums">{computed || '…'}</div>
    </div>
  )
}

function AnimationCard({ name, className, label }: { name: string; className: string; label: string }) {
  const [tick, setTick] = useState(0)
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-card p-4">
      <div
        // Remount-by-key so each Replay click re-triggers the animation from
        // its starting frame (CSS animations don't replay on prop changes alone).
        key={tick}
        className={`h-16 w-16 rounded-md bg-primary ${className}`}
        data-testid={`anim-${name}`}
      />
      <div className="text-sm text-card-foreground">{label}</div>
      <Button
        data-testid={`replay-${name}`}
        variant="outline"
        size="sm"
        onClick={() => setTick((t) => t + 1)}
      >
        Replay
      </Button>
    </div>
  )
}

export default function TokensDemo({ loaderData }: Route.ComponentProps) {
  const [mode, setMode] = useThemeMode('counselor', loaderData.mode)

  // The `useThemeMode` hook returns the mode and persists it to the cookie,
  // but does NOT apply a theme class to <html>. For this demo we toggle the
  // `counselor-light` class on our own wrapper so the variant overrides apply
  // immediately, independent of any global class wiring.
  const themeClass = mode === 'light' ? 'counselor-light' : ''

  return (
    <div className={themeClass}>
      <main
        data-testid="tokens-demo"
        data-mode={mode}
        className="min-h-screen bg-background p-8 text-foreground"
      >
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Blueprint Tokens</h1>
            <p className="text-sm text-muted-foreground">
              Visual smoke test for `@theme` tokens declared in <code>app/app.css</code>.
            </p>
          </div>
          <Button
            data-testid="theme-toggle"
            data-mode={mode}
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          >
            Toggle theme (current: {mode})
          </Button>
        </header>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Colors</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map((t) => (
              <Swatch key={t} token={t} mode={mode} />
            ))}
          </div>
        </section>

        <section className="mb-10" data-testid="student-surfaces">
          <h2 className="mb-3 text-xl font-semibold">Student surfaces &amp; text</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Prototype-migration surface / text tokens (Phase 1).
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {STUDENT_SURFACE_TOKENS.map((t) => (
              <Swatch key={t} token={t} mode={mode} />
            ))}
          </div>
        </section>

        <section className="mb-10" data-testid="student-emotions">
          <h2 className="mb-3 text-xl font-semibold">Student emotion palette</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            15 emotions from <code>mood-checkin.html</code> — each swatch shows the
            primary color (left) and its darker <code>gradDark</code> stop (right).
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {STUDENT_EMOTIONS.map((e) => (
              <EmotionSwatch key={e.key} emotionKey={e.key} name={e.name} mode={mode} />
            ))}
          </div>
        </section>

        <section className="mb-10" data-testid="student-easing">
          <h2 className="mb-3 text-xl font-semibold">Student easing</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Prototype easing curves — press Play to see each timing function.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STUDENT_EASINGS.map((e) => (
              <EasingDemo key={e.token} token={e.token} label={e.label} />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Typography</h2>
          <div className="space-y-2 rounded-md border border-border bg-card p-4 font-sans text-card-foreground">
            <p className="text-xs">text-xs · DM Sans weight 400 — The quick brown fox.</p>
            <p className="text-sm">text-sm · DM Sans weight 400 — The quick brown fox.</p>
            <p className="text-base">text-base · DM Sans weight 400 — The quick brown fox.</p>
            <p className="text-lg font-medium">text-lg · weight 500 — The quick brown fox.</p>
            <p className="text-xl font-semibold">text-xl · weight 600 — The quick brown fox.</p>
            <p className="text-2xl font-bold">text-2xl · weight 700 — The quick brown fox.</p>
            <p className="text-3xl font-extrabold">text-3xl · weight 800 — The quick brown fox.</p>
            <p className="text-4xl font-black">text-4xl · weight 900 — The quick brown fox.</p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Radius</h2>
          <div className="flex flex-wrap gap-4">
            {(['sm', 'md', 'lg', 'xl2'] as const).map((r) => (
              <div key={r} className="flex flex-col items-center gap-2">
                <div
                  data-testid={`radius-${r}`}
                  className="h-20 w-20 bg-primary"
                  style={{ borderRadius: `var(--radius-${r})` }}
                />
                <div className="text-xs text-muted-foreground">radius-{r}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Shadows</h2>
          <div className="flex flex-wrap gap-8 p-4">
            <div className="flex flex-col items-center gap-2">
              <div
                data-testid="shadow-glass"
                className="h-24 w-40 rounded-md bg-card shadow-glass"
              />
              <div className="text-xs text-muted-foreground">shadow-glass</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                data-testid="shadow-glow"
                className="h-24 w-40 rounded-md bg-card shadow-glow"
              />
              <div className="text-xs text-muted-foreground">shadow-glow</div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Animations</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {ANIMATIONS.map((a) => (
              <AnimationCard key={a.name} {...a} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
