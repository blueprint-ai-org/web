/**
 * `/student/journal/prompt/:questionId` — one journal topic, open over the
 * journal home. Mirrored at `/preview/student/journal/prompt/:questionId`
 * (same module, explicit id in `routes.ts`).
 *
 * A child of `student.journal.tsx`: it renders the topic overlay into the
 * home's `<Outlet/>`, so the circle→overlay FLIP hands off without the page
 * underneath unmounting. Being a route rather than component state buys three
 * things the overlay never had — a URL per prompt, an `action` for the answer,
 * and an error boundary that names the route a failure happened on.
 *
 * `:questionId` is the catalogue row's id — one of today's two topics.
 *
 * **No loader, on purpose.** Everything the overlay draws is already on the
 * page: today's two topics arrive with the parent's loader and come through
 * the outlet context. A loader here would make the navigation wait on the
 * gateway with the FLIP already finished, and the circle would snap back into
 * place for a beat before the overlay arrived. The price: only today's topics
 * open here — the page no longer loads the whole catalogue just so any id
 * could (a link to another prompt lands on the error boundary).
 */

import type { ActionFunctionArgs } from 'react-router'
import { useFetcher, useLocation, useNavigate, useOutletContext, useParams, useRouteError } from 'react-router'

import type { JournalOutletContext } from '~/components/dashboard/student/journal/JournalHome'
import { QuestionOverlay } from '~/components/dashboard/student/journal/QuestionOverlay'
import { useStudentNavBase } from '~/components/dashboard/student/nav/useStudentNavBase'
import { bpCreateJournal } from '~/lib/bp-ai/journal.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'

const TAG = '[journal/prompt]'

export function meta() {
  return [{ title: 'Journal · Blueprint' }]
}

/**
 * Save the answer as a Journal entry against this prompt.
 *
 * **A Journal, not a mini-survey.** `createJournal` publishes
 * `journal-created`, which is the only thing `agent` subscribes to: a note
 * recorded as a mini-survey never reaches the analysis or the mental health
 * safety stack.
 *
 * **Never fails the screen.** The overlay has already moved on to "Note saved!"
 * by the time this resolves, and the note is already on the page from local
 * storage; a refused or unreachable write is logged — tagged with this route so
 * it can be found — and reported as `{ saved: false }`.
 *
 * **Every save is a NEW entry**, including an "Edit note". It used to replace
 * the earlier answer, which was the old client-side upsert's rule. The edit cannot
 * be an `updateJournal` instead: `UpdateJournal` does not publish
 * `journal-created`, so edited text would skip the analysis that the first
 * version went through — and the edit is exactly where a student's text can
 * turn into something the safety stack needs to see. Two rows is the cheaper
 * side of that trade. Sparks for re-saving are bounded by the `write` rule's
 * own `dailyCap`, server-side.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) {
    if (import.meta.env.DEV) {
      console.log(`${TAG} answer arrived with no BP session — not recorded`)
    }
    return { saved: false }
  }

  const questionId = String(params.questionId ?? '').trim()
  const form = await request.formData()
  const question = String(form.get('question') ?? '').trim()
  const answer = String(form.get('answer') ?? '').trim()
  if (!questionId || !question || !answer) return { saved: false }

  const result = await bpCreateJournal(bp.accessToken, bp.userId, {
    questionId,
    prompt: question,
    note: answer,
  })
  if (!result.ok) {
    console.error(`${TAG} journaling ${questionId} failed (${result.error.kind}): ${result.error.message}`)
    return { saved: false }
  }
  return { saved: true }
}

/** Back to the home: pop the history entry the circle pushed, if it pushed one. */
function useCloseToJournal() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const location = useLocation()
  const fromJournal = (location.state as { fromJournal?: boolean } | null)?.fromJournal === true
  return () => (fromJournal ? navigate(-1) : navigate(`${base}/journal`, { replace: true }))
}

export default function StudentJournalPromptRoute() {
  const { questionId = '' } = useParams()
  const { slots, qAnswers, saveAnswer } = useOutletContext<JournalOutletContext>()
  const fetcher = useFetcher<typeof action>()
  const close = useCloseToJournal()

  const index = slots.findIndex((s) => s.routeKey === questionId)
  const slot = index >= 0 ? slots[index] : null
  if (!slot) throw new Error(`Journal prompt "${questionId}" is not one of today's topics.`)

  function onSave(text: string) {
    saveAnswer(slot!, text)
    const form = new FormData()
    form.set('question', slot!.overlayText)
    form.set('answer', text)
    fetcher.submit(form, { method: 'post' })
  }

  return (
    <QuestionOverlay
      key={questionId}
      slot={slot}
      initialAnswer={qAnswers[index]}
      onSave={onSave}
      onClose={close}
    />
  )
}

/**
 * A prompt that cannot open — an id that is not in the catalogue, or a render
 * that threw. Drawn as the overlay's own backdrop so the home stays put behind
 * it, with a way back.
 */
export function ErrorBoundary() {
  const error = useRouteError()
  const close = useCloseToJournal()
  console.error(TAG, error)

  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: '#1f1f25',
        borderRadius: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-student-body)',
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.14,
          color: '#f2f3e5',
          textAlign: 'center',
          width: 440,
          margin: 0,
        }}
      >
        This topic isn’t available right now.
      </p>
      <button
        type="button"
        onClick={close}
        style={{
          width: 270,
          height: 48,
          borderRadius: 8,
          background: '#f2f3e5',
          color: '#1f1f25',
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Back to journal
      </button>
    </div>
  )
}
