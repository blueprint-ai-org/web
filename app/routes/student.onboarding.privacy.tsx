/**
 * `/student/onboarding/privacy` — onboarding step 4 (prototype `#s2`).
 * Privacy toggle cards; Next stores the two choices on the gateway.
 * Mirrored at `/preview/student/onboarding/privacy`.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { PrivacyScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpMyPrivacySettings, bpUpdateMyPrivacySettings, readChoice } from '~/lib/bp-ai/privacy.server'
import { getAppSession } from '~/lib/session.server'

export function meta() {
  return [{ title: 'Privacy settings · Blueprint' }]
}

/** The student's current choices, so the toggles start where the server has them. */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries no BP AI token: the toggles start OFF.
  if (session?.kind !== 'bp') return { settings: null }

  const result = await bpMyPrivacySettings(session.session.accessToken)
  if (!result.ok) {
    console.error(`[onboarding/privacy] myPrivacySettings failed (${result.error.kind}): ${result.error.message}`)
    return { settings: null }
  }
  return { settings: result.data }
}

/** Store the two choices. Never fails the screen — they can be changed in settings. */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { saved: false }

  const result = await bpUpdateMyPrivacySettings(session.session.accessToken, readChoice(await request.formData()))
  if (!result.ok) {
    console.error(`[onboarding/privacy] updateMyPrivacySettings failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentOnboardingPrivacyRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>
}) {
  return <PrivacyScreen settings={loaderData?.settings ?? null} />
}
