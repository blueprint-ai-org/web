/**
 * `ParentPlaceholder` — friendly welcome card shown at `/parent`.
 *
 * The full parent dashboard (emotional snapshot, what's going right,
 * conversation prompts, Understanding / Guidance / Chat tabs) is deferred
 * to a follow-up plan. This placeholder ensures parent-classified users
 * (LTI Mentor role) land on a coherent welcome page rather than
 * `/unsupported-role`.
 *
 * Design: centered card on the persona surface, no interactive elements.
 * All colors / radii / typography come from `~/lib/tokens` — no hardcoded
 * hex/hsl values. Tailwind 4 arbitrary-value syntax only.
 */

import { colors, radius, shadows, typography } from '~/lib/tokens'

export function ParentPlaceholder() {
  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12"
      style={{ backgroundColor: colors.background }}
    >
      <article
        className="w-full max-w-xl text-center"
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          boxShadow: shadows.card,
          padding: '2.5rem 2rem',
          fontFamily: typography.fontFamily,
        }}
      >
        <h1
          style={{
            color: colors.foreground,
            fontSize: typography.size['2xl'],
            fontWeight: typography.weight.semibold,
            letterSpacing: typography.tracking.tight,
            lineHeight: typography.leading.tight,
            marginBottom: '0.75rem',
          }}
        >
          Welcome to Blueprint
        </h1>
        <p
          style={{
            color: colors.primaryLight,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.medium,
            letterSpacing: typography.tracking.normal,
            marginBottom: '1.25rem',
          }}
        >
          Your child's wellbeing dashboard is coming soon.
        </p>
        <p
          style={{
            color: colors.muted,
            fontSize: typography.size.md,
            lineHeight: typography.leading.normal,
            letterSpacing: typography.tracking.normal,
          }}
        >
          Soon you'll see a gentle snapshot of how your child is feeling
          at school — moods over the past few weeks, what's going right,
          and where they may be struggling. We'll also share short
          conversation prompts you can use at home to support them, all
          grounded in what their teachers and counselor are already seeing.
        </p>
      </article>
    </div>
  )
}
