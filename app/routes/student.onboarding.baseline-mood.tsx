/**
 * `/student/onboarding/baseline-mood` — onboarding step 6 (prototype `#s4`).
 * 5-stop baseline-mood arc slider. No writes (prototype never persisted it).
 * Mirrored at `/preview/student/onboarding/baseline-mood`.
 *
 * The label and the five stops come from the tenant's BP AI question catalogue
 * (`onboarding.baseline_mood`, seeded by manager's provisioning) so the wording
 * is editable in the admin console instead of baked into this bundle. There is
 * no local copy to drift from it any more: no row ⇒ the screen says so and lets
 * the student skip.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { BaselineMoodScreen } from '~/components/dashboard/student/onboarding-v2'
import { bpAnswerQuestion } from '~/lib/bp-ai/answers.server'
import { bpQuestion } from '~/lib/bp-ai/questions.server'
import { getAppSession } from '~/lib/session.server'

/**
 * The stable key of this screen's question.
 *
 * It replaced a `(category, order, type)` selector with two fallbacks under it:
 * the ids are minted per tenant, so nothing this app ships could name the row.
 * That selector was already wrong — `onboarding` order 1 is an archived
 * question, so the screens carried an offset around it.
 */
const QUESTION_KEY = 'onboarding.baseline_mood'

export function meta() {
  return [{ title: 'How do you feel · Blueprint' }]
}

/**
 * Fetch this screen's question, or say nothing and let the screen bake it.
 *
 * **Never throws, and never fails the screen.** Three ways to end up with
 * `question: null`, none of them an error a student should see:
 *
 *  - **An LTI launch has no BP AI token.** A Canvas student arrives on claims,
 *    not a credential session, so there is nothing to call the gateway with.
 *    That is the common case today, not an edge.
 *  - **The tenant was never seeded.** An empty catalogue is a state, not a
 *    failure — the gateway returns `[]` for a tenant whose provisioner never
 *    ran, and the screen still has to render.
 *  - **The gateway is unreachable.** Logged, because a `listQuestions` that
 *    stops working is worth noticing and invisible otherwise.
 *
 * Same shape as `_persona.tsx`'s `resolveProfileName`, and for the same reason:
 * a cosmetic read must not be able to take the page down.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') {
    // Not an error — an LTI launch has no BP AI token — but the screen then
    // renders baked copy and Next records nothing, which looks exactly like a
    // broken save. In dev, say so rather than leaving it to be guessed at.
    if (import.meta.env.DEV) {
      console.log(`[onboarding/baseline-mood] no BP session (kind: ${session?.kind ?? 'none'}) — rendering baked copy, Next will not record`)
    }
    return { question: null }
  }

  const result = await bpQuestion(session.session.accessToken, QUESTION_KEY)
  if (!result.ok) {
    console.error(`[onboarding/baseline-mood] listQuestions failed (${result.error.kind}): ${result.error.message}`)
    return { question: null }
  }
  return { question: result.data }
}

/**
 * Record the answer.
 *
 * **Never fails the screen.** A refused or unreachable write is logged and
 * reported as `{ saved: false }`; the student has already moved on to the next
 * step by the time it resolves, and blocking onboarding on a survey row would
 * turn a lost datum into a dead end.
 *
 * Everything needed to record comes from the form rather than being re-fetched:
 * the loader already had the question, and re-reading it here to validate what
 * the client sent would not make the answer any truer — the gateway is the one
 * that validates `option_ids` against the question, and it refuses a mismatch.
 */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  // An LTI launch carries Canvas claims and no BP AI token.
  if (session?.kind !== 'bp') {
    if (import.meta.env.DEV) {
      console.log(`[onboarding/baseline-mood] answer arrived with no BP session (kind: ${session?.kind ?? 'none'}) — not recorded`)
    }
    return { saved: false }
  }

  const form = await request.formData()
  const questionId = String(form.get('questionId') ?? '').trim()
  const optionId = String(form.get('optionId') ?? '').trim()
  // The label, the answer text and the score arrived here until step-10. The
  // server derives all three from the catalogue — the score IS the option's
  // `order` — so the choice is the whole request.
  if (!questionId || !optionId) return { saved: false }

  const result = await bpAnswerQuestion(
    session.session.accessToken,
    session.session.userId,
    { questionId, optionIds: [optionId] },
    new Date().toISOString(),
  )
  if (!result.ok) {
    console.error(`[onboarding/baseline-mood] recording the answer failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

export default function StudentOnboardingBaselineMoodRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>
}) {
  return <BaselineMoodScreen question={loaderData?.question ?? null} />
}
