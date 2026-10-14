/**
 * `/student/toolkit/video` — video player + feedback wizard (ports
 * `toolkit-video.html`). Query: `?lesson`, `?from`.
 *
 * Full-bleed page (no sidebar): a native `<video>` (rendered outside the scaled
 * stage) with a custom rAF scrubber, then a 5-screen feedback wizard
 * (did-try → helpful → why → thanks). Playing records a view, watching to the
 * end completes the lesson; the `?from` → exit matrix returns to today /
 * school / school?tab=attend / toolkit. Mirrored at
 * `/preview/student/toolkit/video`. Client-only render (see `HydrateFallback`).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { VideoFlow } from '~/components/dashboard/student/toolkit'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpLesson, lessonAction, type LessonTile } from '~/lib/bp-ai/content.server'
import { bpSessionOf, getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

const TAG = '[toolkit/video]'

export function meta() {
  return [{ title: 'Toolkit video · Blueprint' }, { name: 'description', content: 'Toolkit video.' }]
}

const PREVIEW: LessonTile = { id: 'preview-lesson', title: 'A lesson', duration: '1:04', sparks: 1, cover: null, video: null, category: 'preview' }

/**
 * The lesson `?lesson=` names (`getLesson`). No BP session, no id or a failed
 * read ⇒ `null`: the play button goes straight to the feedback, as an unknown
 * clip always did, and nothing is recorded.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{ lesson: LessonTile | null }> {
  if (isPreviewRequest(request)) return { lesson: PREVIEW }

  const id = new URL(request.url).searchParams.get('lesson')?.trim()
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp || !id) return { lesson: null }

  const result = await bpLesson(bp.accessToken, id)
  if (!result.ok) {
    console.error(`${TAG} getLesson ${id} failed (${result.error.kind}): ${result.error.message}`)
    return { lesson: null }
  }
  return { lesson: result.data }
}

/** Keeps the render client-only (the player portals into `document`). */
export async function clientLoader({ serverLoader }: { serverLoader: () => ReturnType<typeof loader> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Toolkit video" route="/student/toolkit/video" source="toolkit-video.html" />
}

/** `recordContentView` on play, `completeLesson` at the end. */
export async function action({ request }: ActionFunctionArgs) {
  const bp = await bpSessionOf(await getAppSession(request))
  if (!bp) return { ok: false }
  return lessonAction(bp.accessToken, await request.formData(), TAG)
}

/** The writes change nothing this page draws except the thanks pill, which comes from the action. */
export function shouldRevalidate({ formMethod, defaultShouldRevalidate }: { formMethod?: string; defaultShouldRevalidate: boolean }) {
  return formMethod ? false : defaultShouldRevalidate
}

export default function StudentToolkitVideoRoute({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <VideoFlow lesson={loaderData.lesson} />
}
