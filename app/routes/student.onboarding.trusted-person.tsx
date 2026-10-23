/**
 * `/student/onboarding/trusted-person` — onboarding step 8 (prototype `#s6`).
 * "Who helps you when things are hard?" person multi-select.
 * Mirrored at `/preview/student/onboarding/trusted-person`.
 *
 * The heading *and the whole list of people* come from the tenant's BP AI
 * question catalogue (`onboarding.trusted_person`, seeded by manager's
 * provisioning) — the chips carry no art, so adding or removing a person is a
 * catalogue edit rather than a code change. Same two layers as `helpers`: the
 * loader never fails the screen and the action never blocks it, and with no row
 * the screen says so rather than listing people it cannot record.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { TrustedPersonScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpAnswerQuestion } from '~/lib/bp-ai/answers.server'
import { bpQuestion } from '~/lib/bp-ai/questions.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

/**
 * The stable key of this screen's question.
 *
 * It replaced a `(category, order, type)` selector with two fallbacks under it:
 * the ids are minted per tenant, so nothing this app ships could name the row.
 * That selector was already wrong — `onboarding` order 1 is an archived
 * question, so the screens carried an offset around it.
 */
const QUESTION_KEY = 'onboarding.trusted_person'

export function meta() {
  return [{ title: 'Who helps you · Blueprint' }]
}

/** Fetch this screen's question, or say nothing and let the screen bake it. */
export async function loader({ request }: LoaderFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) {
    if (import.meta.env.DEV) {
      console.log(`[onboarding/trusted-person] no BP session — rendering baked copy, Next will not record`)
    }
    return { question: null }
  }

  const result = await bpQuestion(bp.accessToken, QUESTION_KEY)
  if (!result.ok) {
    console.error(`[onboarding/trusted-person] listQuestions failed (${result.error.kind}): ${result.error.message}`)
    return { question: null }
  }
  return { question: result.data }
}

/** Record the chosen people. Never fails the screen; an empty answer is not one. */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  // No BP AI session (or a launch the gateway would not exchange).
  if (!bp) {
    if (import.meta.env.DEV) {
      console.log(`[onboarding/trusted-person] answer arrived with no BP session — not recorded`)
    }
    return { saved: false }
  }

  const form = await request.formData()
  const questionId = String(form.get('questionId') ?? '').trim()
  const optionIds = form
    .getAll('optionIds')
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0)
  // The label and the joined answer text used to arrive too. They are the
  // server's now (step-10), so there is nothing left to validate but the choice.
  if (!questionId || optionIds.length === 0) return { saved: false }

  const result = await bpAnswerQuestion(
    bp.accessToken,
    bp.userId,
    { questionId, optionIds },
    new Date().toISOString(),
  )
  if (!result.ok) {
    console.error(`[onboarding/trusted-person] recording the answer failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentOnboardingTrustedPersonRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>
}) {
  return <TrustedPersonScreen question={loaderData?.question ?? null} />
}
