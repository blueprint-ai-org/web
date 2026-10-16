import { NavRow, OnboardingStage } from './OnboardingChrome'
import type { OnboardingSlug } from './steps'
import type { OnboardingTransitionApi } from './useOnboardingTransition'

/**
 * What an onboarding step shows when its question is not there.
 *
 * ## Why this exists at all
 *
 * Each of these three screens used to carry a **baked copy** of its question —
 * the heading and every option — and render it whenever the catalogue could not
 * be read: an LTI launch with no BP AI token, an unseeded tenant, an
 * unreachable gateway. A student then answered a question that recorded
 * nothing, and the screen looked identical to one that worked.
 *
 * Worse, the baked copy was also the SEED — one module was "the source of truth
 * for the screen *and* for what gets seeded" — so the app was both the source
 * and the consumer of the catalogue it was checking against. Both are gone; the
 * seed lives in manager's provisioning.
 *
 * ## Skip, not retry-forever
 *
 * The step can be **skipped**: onboarding is a sequence a child is in the
 * middle of, and the one thing worse than losing an answer is stranding them.
 * What it must not do is invent the question. Per step-9: *"si producto exige
 * que el onboarding se pueda pasar sin gateway, la pantalla deja saltar el
 * paso; no inventa la pregunta."*
 */
export function QuestionUnavailable({
  slug,
  transition,
}: {
  slug: OnboardingSlug
  transition: OnboardingTransitionApi
}) {
  return (
    <OnboardingStage slug={slug} background="#1f1f25" motion={transition.motion}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 112,
          transform: 'translateX(-50%)',
          width: 660,
          zIndex: 5,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-student-display)',
            fontSize: 64,
            letterSpacing: 1.5,
            color: 'var(--color-student-surface-cream)',
            margin: 0,
          }}
        >
          This one isn&rsquo;t ready
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-student-body)',
            fontSize: 18,
            color: 'var(--color-student-surface-cream)',
            opacity: 0.8,
            marginTop: 16,
          }}
        >
          We couldn&rsquo;t load this question. You can carry on — nothing you&rsquo;ve done is lost,
          and we&rsquo;ll ask again later.
        </p>
      </div>

      <NavRow onBack={transition.back} onNext={transition.next} nextLabel="Skip" backBackground="#36363f" />
    </OnboardingStage>
  )
}
