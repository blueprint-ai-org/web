/**
 * `/student/toolkit/category` — toolkit category grid (ports `category.html`).
 * Query: `?cat` (a `ContentCategory.key`).
 *
 * Full-bleed page (no sidebar): the category's lessons, two per row, with
 * per-tile hearts (`setContentSaved`) and back → `/student/toolkit?tab=browse`.
 * Mirrored at `/preview/student/toolkit/category`. Client-only render (see
 * `HydrateFallback`).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { ToolkitCategory } from '~/components/dashboard/student/toolkit'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpToolkitCategory, lessonAction, type CategoryState } from '~/lib/bp-ai/content.server'
import { getAppSession } from '~/lib/session.server'
import { isPreviewRequest } from '~/lib/student/preview'

const TAG = '[toolkit/category]'

export function meta() {
  return [{ title: 'Toolkit category · Blueprint' }, { name: 'description', content: 'Toolkit category.' }]
}

const EMPTY: CategoryState = { category: null, lessons: [], savedIds: [] }

const PREVIEW: CategoryState = {
  category: { key: 'preview', title: 'A category', emoji: '🌈', color: '#219653' },
  lessons: [{ id: 'preview-lesson', title: 'A lesson', duration: '1:04', sparks: 1, cover: null, video: null, category: 'preview' }],
  savedIds: [],
}

/**
 * The category's title and lessons plus the student's hearts, in one request.
 * An unknown key, no BP session or a failed read ⇒ an empty page.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<CategoryState> {
  if (isPreviewRequest(request)) return PREVIEW

  const key = new URL(request.url).searchParams.get('cat')?.trim()
  const session = await getAppSession(request)
  if (session?.kind !== 'bp' || !key) return EMPTY

  const result = await bpToolkitCategory(session.session.accessToken, key)
  if (!result.ok) {
    console.error(`${TAG} ${key} read failed (${result.error.kind}): ${result.error.message}`)
    return EMPTY
  }
  return result.data
}

/** Keeps the render client-only. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<CategoryState> }) {
  return serverLoader()
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return <StagePlaceholder page="Toolkit category" route="/student/toolkit/category" source="category.html" />
}

/** The hearts (`setContentSaved`). */
export async function action({ request }: ActionFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return { ok: false }
  return lessonAction(session.session.accessToken, await request.formData(), TAG)
}

export function shouldRevalidate({ formMethod, defaultShouldRevalidate }: { formMethod?: string; defaultShouldRevalidate: boolean }) {
  return formMethod ? false : defaultShouldRevalidate
}

export default function StudentToolkitCategoryRoute({ loaderData }: { loaderData: CategoryState }) {
  return <ToolkitCategory data={loaderData} />
}
