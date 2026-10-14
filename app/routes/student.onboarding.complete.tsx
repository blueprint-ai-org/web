/**
 * `/student/onboarding/complete` — onboarding step 9 (prototype `#s7`).
 * "+10 Sparkz · Set-up Complete"; "Start with Your Mood" exits into
 * `/student/mood-checkin`. Mirrored at `/preview/student/onboarding/complete`
 * (which resolves the exit to `/preview/student/mood-checkin`).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { CompleteScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpRuleReward } from '~/lib/bp-ai/gamification.server'
import { bpCompleteOnboarding } from '~/lib/bp-ai/privacy.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

export function meta() {
  return [{ title: 'Set-up complete · Blueprint' }]
}

/**
 * What finishing pays (`onboarding_completed`, step-22), announced BEFORE the
 * write — `completeOnboarding` runs on the way out. No session ⇒ no figure.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ reward: number | null }> {
  if (isPreviewRequest(request)) return { reward: 20 }

  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { reward: null }
  return { reward: await bpRuleReward(bp.accessToken, 'onboarding_completed') }
}

/**
 * Record that onboarding is done — the fact `/student`'s loader reads.
 *
 * Never fails the screen: `CompleteScreen` does not wait for this. If it fails,
 * the next visit to `/student` lands in onboarding again, which is the correct
 * failure — a repeated tour, never a student locked out of the hub.
 */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  // No BP AI session; `app.tsx` decides onboarding there.
  if (!bp) return { saved: false }

  const result = await bpCompleteOnboarding(bp.accessToken)
  if (!result.ok) {
    console.error(`[onboarding/complete] completeOnboarding failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentOnboardingCompleteRoute({ loaderData }: { loaderData: { reward: number | null } }) {
  return <CompleteScreen reward={loaderData?.reward ?? null} />
}
