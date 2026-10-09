/**
 * `/student/journal` — journal home (ports `journal.html`). Query: `?demo`, `?wt`.
 *
 * Sidebar-bearing stage page: the emotion-circle topic viz + the write-it-out /
 * topic-question overlays with the circle→overlay FLIP expansion (Phase 8).
 * Shared module — also mounted at `/preview/student/journal` (explicit id in
 * `routes.ts`). Client-only render (see `HydrateFallback`).
 *
 * The topic overlay is the child route `prompt/:questionId`
 * (`student.journal.prompt.tsx`), rendered into the home's `<Outlet/>`.
 */

import type { LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from 'react-router'

import { JournalHome } from '~/components/dashboard/student/journal'
import { StagePlaceholder } from '~/components/dashboard/student/StagePlaceholder'
import { bpJournalPrompts } from '~/lib/bp-ai/journal.server'
import { getAppSession } from '~/lib/session.server'
import { journalTopicSeed, pickPrompts } from '~/lib/student/journal-prompts'
import { studentStorage } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Journal · Blueprint' }, { name: 'description', content: 'Student journal.' }]
}

const NO_TOPICS = { topics: null, catalogue: null }

/**
 * Today's two topics, drawn from the `journal` catalogue, plus the catalogue
 * itself so a link to any prompt can open.
 *
 * There is no recommendation yet, so the draw is random — seeded by the student
 * and the UTC day, so it holds still across reloads (see `journal-prompts.ts`).
 *
 * **Never throws.** No BP AI session (an LTI launch), an empty catalogue and an
 * unreachable gateway all come back as `null`, and the home draws the
 * prototype's copy — a cosmetic read must not take the page down.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAppSession(request)
  if (session?.kind !== 'bp') return NO_TOPICS

  const result = await bpJournalPrompts(session.session.accessToken)
  if (!result.ok) {
    console.error(`[journal] listQuestions failed (${result.error.kind}): ${result.error.message}`)
    return NO_TOPICS
  }
  if (result.data.length === 0) return NO_TOPICS

  return {
    topics: pickPrompts(result.data, journalTopicSeed(session.session.userId, new Date()), 2),
    catalogue: result.data,
  }
}

/** Client loader — the server's topics, plus mood colours + saved notes via the adapter. */
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  const server = await serverLoader()
  return {
    ...server,
    moodEmotions: studentStorage.getMoodEmotions(),
    notes: studentStorage.getJournalNotes(),
    writeText: studentStorage.getWriteText('session'),
  }
}
clientLoader.hydrate = true as const

/**
 * Opening, saving and closing a topic all happen under this route, and none of
 * them changes what it loaded. Re-running would re-read the catalogue from the
 * gateway on every circle tap and every Save — and the gateway rate-limits.
 */
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  const inJournal = (path: string) => /\/student\/journal(\/prompt\/[^/]+)?\/?$/.test(path)
  if (inJournal(currentUrl.pathname) && inJournal(nextUrl.pathname)) return false
  if (formMethod && inJournal(currentUrl.pathname)) return false
  return defaultShouldRevalidate
}

export function HydrateFallback() {
  return <StagePlaceholder page="Journal" route="/student/journal" source="journal.html" chrome />
}

/** Stub action — the future write seam (journal note persistence). */
export function action() {
  return null
}

export default function StudentJournalRoute({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <JournalHome topics={loaderData?.topics ?? null} catalogue={loaderData?.catalogue ?? null} />
}
