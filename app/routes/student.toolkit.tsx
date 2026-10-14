/**
 * `/student/toolkit` — toolkit home (ports `my-toolkit.html`).
 * Query: `?tab`, `?explore`, `?preview`.
 *
 * Sidebar-bearing stage page (Phase 9): simple vs full views gated on whether
 * the student has viewed a lesson, RECOMMENDED/BROWSE/DO IT AGAIN/SAVED filter
 * tabs, heart-save, explore mode. Shared module — also mounted at
 * `/preview/student/toolkit` (explicit id in `routes.ts`). Client-only render
 * (see `HydrateFallback`).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { ToolkitHome } from '~/components/dashboard/student/toolkit'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpToolkit, EMPTY_TOOLKIT, lessonAction, type ToolkitState } from '~/lib/bp-ai/content.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

const TAG = '[toolkit]'

export function meta() {
  return [{ title: 'My toolkit · Blueprint' }, { name: 'description', content: 'Student toolkit.' }]
}

/** `/preview` has no session: one category and one lesson, so every tab has a shape. */
const PREVIEW_TOOLKIT: ToolkitState = (() => {
  const lesson = { id: 'preview-lesson', title: 'A lesson', duration: '1:04', sparks: 1, cover: null, video: null, category: 'preview' }
  return {
    categories: [{ key: 'preview', title: 'A category', emoji: '🌈', color: '#219653' }],
    recommended: [lesson],
    viewed: [lesson],
    saved: [lesson],
  }
})()

/**
 * The whole home in one request: categories, recommendations, "do it again"
 * and saved. No BP session (an LTI launch) or a failed read ⇒ the empty
 * toolkit, never a local catalogue.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<ToolkitState> {
  if (isPreviewRequest(request)) return PREVIEW_TOOLKIT

  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return EMPTY_TOOLKIT

  const result = await bpToolkit(session.session.accessToken)
  if (!result.ok) {
    console.error(`${TAG} toolkit read failed (${result.error.kind}): ${result.error.message}`)
    return EMPTY_TOOLKIT
  }
  return result.data
}

/** Keeps the render client-only. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<ToolkitState> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="My toolkit" route="/student/toolkit" source="my-toolkit.html" chrome />
}

/** The hearts (`setContentSaved`). */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { ok: false }
  return lessonAction(session.session.accessToken, await request.formData(), TAG)
}

/** A heart does not change what the page shows beyond its own toggle; do not re-read the gateway for it. */
export function shouldRevalidate({ formMethod, defaultShouldRevalidate }: { formMethod?: string; defaultShouldRevalidate: boolean }) {
  return formMethod ? false : defaultShouldRevalidate
}

export default function StudentToolkitRoute({ loaderData }: { loaderData: ToolkitState }) {
  return <ToolkitHome toolkit={loaderData} />
}
