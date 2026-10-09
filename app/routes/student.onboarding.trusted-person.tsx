/**
 * `/student/onboarding/trusted-person` — onboarding step 8 (prototype `#s6`).
 * "Who helps you when things are hard?" person multi-select.
 * Mirrored at `/preview/student/onboarding/trusted-person`.
 *
 * The heading *and the whole list of people* come from the tenant's BP AI
 * question catalogue (`onboarding` / order 4 / `MULTISELECT`, seeded by
 * `scripts/bp-ai-seed-onboarding-questions.ts`) — the chips carry no art, so
 * adding or removing a person is a catalogue edit rather than a code change.
 * Same three layers as `helpers`: the loader never fails the screen, the action
 * never blocks it, and `~/lib/student/onboarding-questions` is both the seed and
 * the fallback so the two cannot drift.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { TrustedPersonScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpRecordAnswer } from '~/lib/bp-ai/answers.server'
import { bpOnboardingQuestion } from '~/lib/bp-ai/questions.server'
import { getAppSession } from '~/lib/session.server'
import { TRUSTED_PERSON_QUESTION } from '~/lib/student/onboarding-questions'

export function meta() {
  return [{ title: 'Who helps you · Blueprint' }]
}

/** Fetch this screen's question, or say nothing and let the screen bake it. */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`[onboarding/trusted-person] no BP session (kind: ${session?.kind ?? 'none'}) — rendering baked copy, Next will not record`)
    }
    return { question: null }
  }

  const result = await bpOnboardingQuestion(session.session.accessToken, {
    category: TRUSTED_PERSON_QUESTION.category,
    order: TRUSTED_PERSON_QUESTION.order,
    type: TRUSTED_PERSON_QUESTION.type,
  })
  if (!result.ok) {
    console.error(`[onboarding/trusted-person] listQuestions failed (${result.error.kind}): ${result.error.message}`)
    return { question: null }
  }
  return { question: result.data }
}

/** Record the chosen people. Never fails the screen; an empty answer is not one. */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries Canvas claims and no BP AI token.
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`[onboarding/trusted-person] answer arrived with no BP session (kind: ${session?.kind ?? 'none'}) — not recorded`)
    }
    return { saved: false }
  }

  const form = await request.formData()
  const questionId = String(form.get('questionId') ?? '').trim()
  const answer = String(form.get('answer') ?? '').trim()
  const question = String(form.get('question') ?? '').trim()
  const optionIds = form
    .getAll('optionIds')
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0)
  if (!questionId || optionIds.length === 0 || !answer) return { saved: false }

  const result = await bpRecordAnswer(
    session.session.accessToken,
    session.session.userId,
    {
      questionId,
      question: question || TRUSTED_PERSON_QUESTION.label,
      answer,
      optionIds,
    },
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
