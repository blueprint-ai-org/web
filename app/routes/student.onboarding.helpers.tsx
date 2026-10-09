/**
 * `/student/onboarding/helpers` — onboarding step 7 (prototype `#s5`).
 * "What helps you feel good?" feel-good card multi-select.
 * Mirrored at `/preview/student/onboarding/helpers`.
 *
 * The heading and the six card labels come from the tenant's BP AI question
 * catalogue (`onboarding` / order 3 / `MULTISELECT`, seeded by
 * `scripts/bp-ai-seed-onboarding-questions.ts`), and the chosen cards are
 * recorded on Next. Same three layers as `baseline-mood`: the loader never
 * fails the screen, the action never blocks it, and
 * `~/lib/student/onboarding-questions` is both the seed and the fallback so the
 * two cannot drift.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { HelpersScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpRecordAnswer } from '~/lib/bp-ai/answers.server'
import { bpOnboardingQuestion } from '~/lib/bp-ai/questions.server'
import { getAppSession } from '~/lib/session.server'
import { HELPERS_QUESTION } from '~/lib/student/onboarding-questions'

export function meta() {
  return [{ title: 'What helps you · Blueprint' }]
}

/**
 * Fetch this screen's question, or say nothing and let the screen bake it.
 *
 * Identical in shape and reasoning to `baseline-mood`'s: an LTI launch carries
 * no BP AI token, an unseeded tenant answers `[]`, and an unreachable gateway
 * is logged — none of the three is an error a student halfway through
 * onboarding should ever see.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') {
    // Not an error — an LTI launch has no BP AI token — but the screen then
    // renders baked copy and Next records nothing, which looks exactly like a
    // broken save. In dev, say so rather than leaving it to be guessed at.
    if (import.meta.env.DEV) {
      console.log(`[onboarding/helpers] no BP session (kind: ${session?.kind ?? 'none'}) — rendering baked copy, Next will not record`)
    }
    return { question: null }
  }

  const result = await bpOnboardingQuestion(session.session.accessToken, {
    category: HELPERS_QUESTION.category,
    order: HELPERS_QUESTION.order,
    type: HELPERS_QUESTION.type,
  })
  if (!result.ok) {
    console.error(`[onboarding/helpers] listQuestions failed (${result.error.kind}): ${result.error.message}`)
    return { question: null }
  }
  return { question: result.data }
}

/**
 * Record the chosen cards.
 *
 * **Never fails the screen** — a refused or unreachable write is logged and
 * reported as `{ saved: false }`, because losing one datum beats stranding a
 * child on a dead end.
 *
 * `optionIds` arrives as repeated fields rather than one joined value, so the
 * ids stay ids. An empty selection never reaches here (the screen does not
 * submit one) and is refused anyway: the gateway validates a `MULTISELECT`
 * answer as one to `max_selections`.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries Canvas claims and no BP AI token.
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`[onboarding/helpers] answer arrived with no BP session (kind: ${session?.kind ?? 'none'}) — not recorded`)
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
      question: question || HELPERS_QUESTION.label,
      answer,
      optionIds,
    },
    new Date().toISOString(),
  )
  if (!result.ok) {
    console.error(`[onboarding/helpers] recording the answer failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentOnboardingHelpersRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>
}) {
  return <HelpersScreen question={loaderData?.question ?? null} />
}
