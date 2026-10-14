/**
 * The toolkit, as the gateway keeps it: lessons, their categories, and the
 * student's relationship with each one (viewed, saved, completed).
 *
 * The toolkit used to be a catalogue written in this repo — six video ids, five
 * categories of four hand-titled videos, two mp4s in `public/`, a fixed "1
 * spark" per tile — and the student's hearts and "has watched a video" gate
 * lived in `localStorage`. Every one of those is a `Lesson` or a
 * `ContentInteraction` now, so a second device sees the same toolkit.
 *
 * Every read here is the caller's own: no user id travels, the gateway resolves
 * it from the token.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { GqlResult } from './types'

/** A lesson, reduced to what a tile and the player draw. */
export interface LessonTile {
  id: string
  title: string
  /** `m:ss`, the tile's figure. */
  duration: string
  /** What completing it pays, or null for no figure (0 pays nothing). */
  sparks: number | null
  /** The cover, or null: an operator has not uploaded it yet. Drawn as an empty tile. */
  cover: string | null
  /** The video, or null: the player then goes straight to the feedback. */
  video: string | null
  /** The `ContentCategory.key` it belongs to. */
  category: string
}

/** A browse circle — one row of `listContentCategories`. */
export interface ContentCategoryView {
  key: string
  title: string
  emoji: string
  color: string
}

type LessonRow = {
  id: string
  title: string
  duration_seconds: number
  video_url?: string | null
  cover_url?: string | null
  category: string
  sparks: number
}

/** `75` → `1:15`. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function lessonTile(l: LessonRow): LessonTile {
  return {
    id: l.id,
    title: l.title,
    duration: formatDuration(l.duration_seconds),
    sparks: l.sparks > 0 ? l.sparks : null,
    cover: l.cover_url?.trim() || null,
    video: l.video_url?.trim() || null,
    category: l.category,
  }
}

// ── Toolkit home ──────────────────────────────────────────────────────────────

const TOOLKIT = gql(`query Toolkit {
  listContentCategories { key title emoji color }
  listRecommendedContent(limit: 3) { id title duration_seconds video_url cover_url category sparks }
  viewed: listViewedContent(contentKind: LESSON, pageSize: 20) {
    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }
  }
  saved: listSavedContent(contentKind: LESSON, pageSize: 50) {
    interactions { lesson { id title duration_seconds video_url cover_url category sparks } }
  }
}`)

export interface ToolkitState {
  categories: ContentCategoryView[]
  recommended: LessonTile[]
  /** "Do it again", newest first. Non-empty also opens the full view. */
  viewed: LessonTile[]
  saved: LessonTile[]
}

export const EMPTY_TOOLKIT: ToolkitState = { categories: [], recommended: [], viewed: [], saved: [] }

/**
 * An interaction's lesson, or nothing. `lesson` is null for a lesson that was
 * deleted or whose course went back to draft — a saved row the student can no
 * longer open is dropped, not drawn as a tile that leads nowhere.
 */
function lessonsOf(interactions: ReadonlyArray<{ lesson?: LessonRow | null }>): LessonTile[] {
  return interactions.flatMap((i) => (i.lesson ? [lessonTile(i.lesson)] : []))
}

/** The whole toolkit home in one request (the gateway rate-limits `/graphql`). */
export async function bpToolkit(accessToken: string): Promise<GqlResult<ToolkitState>> {
  const result = await graphql(TOOLKIT, {}, { accessToken })
  if (!result.ok) return result
  const d = result.data
  return {
    ok: true,
    data: {
      categories: d.listContentCategories.map(({ key, title, emoji, color }) => ({ key, title, emoji, color })),
      recommended: d.listRecommendedContent.map(lessonTile),
      viewed: lessonsOf(d.viewed.interactions),
      saved: lessonsOf(d.saved.interactions),
    },
  }
}

// ── One category ──────────────────────────────────────────────────────────────

const CATEGORY = gql(`query ToolkitCategory($category: String!) {
  listContentCategories { key title emoji color }
  listLessons(category: $category, pageSize: 50) {
    lessons { id title duration_seconds video_url cover_url category sparks }
  }
  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }
}`)

export interface CategoryState {
  /** Null when the key is not a category of this tenant. */
  category: ContentCategoryView | null
  lessons: LessonTile[]
  savedIds: string[]
}

export async function bpToolkitCategory(accessToken: string, key: string): Promise<GqlResult<CategoryState>> {
  const result = await graphql(CATEGORY, { category: key }, { accessToken })
  if (!result.ok) return result
  const d = result.data
  const category = d.listContentCategories.find((c) => c.key === key) ?? null
  return {
    ok: true,
    data: {
      category: category && { key: category.key, title: category.title, emoji: category.emoji, color: category.color },
      lessons: d.listLessons.lessons.map(lessonTile),
      savedIds: d.saved.interactions.map((i) => i.content_id),
    },
  }
}

// ── One lesson (the player) ───────────────────────────────────────────────────

const LESSON = gql(`query ToolkitLesson($id: ID!) {
  getLesson(id: $id) { id title duration_seconds video_url cover_url category sparks }
}`)

export async function bpLesson(accessToken: string, id: string): Promise<GqlResult<LessonTile>> {
  const result = await graphql(LESSON, { id }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: lessonTile(result.data.getLesson) }
}

// ── Lessons by category, with the caller's hearts (the school promos) ─────────

const SAVED_IDS = gql(`query SavedLessonIds($category: String!) {
  listLessons(category: $category, pageSize: 10) {
    lessons { id title duration_seconds video_url cover_url category sparks }
  }
  saved: listSavedContent(contentKind: LESSON, pageSize: 50) { interactions { content_id } }
}`)

export async function bpLessonsWithSaved(
  accessToken: string,
  category: string,
): Promise<GqlResult<{ lessons: LessonTile[]; savedIds: string[] }>> {
  const result = await graphql(SAVED_IDS, { category }, { accessToken })
  if (!result.ok) return result
  return {
    ok: true,
    data: {
      lessons: result.data.listLessons.lessons.map(lessonTile),
      savedIds: result.data.saved.interactions.map((i) => i.content_id),
    },
  }
}

// ── Writes ────────────────────────────────────────────────────────────────────

const SET_SAVED = gql(`mutation SetLessonSaved($id: ID!, $saved: Boolean!) {
  setContentSaved(contentKind: LESSON, contentId: $id, saved: $saved) { saved }
}`)

/** Heart or un-heart a lesson. Resolves to what the server now holds. */
export async function bpSetLessonSaved(accessToken: string, id: string, saved: boolean): Promise<GqlResult<boolean>> {
  const result = await graphql(SET_SAVED, { id, saved }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.setContentSaved.saved }
}

const RECORD_VIEW = gql(`mutation RecordLessonView($id: ID!) {
  recordContentView(contentKind: LESSON, contentId: $id) { view_count }
}`)

export async function bpRecordLessonView(accessToken: string, id: string): Promise<GqlResult<null>> {
  const result = await graphql(RECORD_VIEW, { id }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: null }
}

const COMPLETE = gql(`mutation CompleteLesson($id: ID!) {
  completeLesson(lesson: $id) { sparks_awarded }
}`)

/**
 * Mark a lesson complete. Resolves to what it paid, or null for no figure:
 * completing twice pays 0 the second time, and 0 is not a `+0` pill.
 */
export async function bpCompleteLesson(accessToken: string, id: string): Promise<GqlResult<number | null>> {
  const result = await graphql(COMPLETE, { id }, { accessToken })
  if (!result.ok) return result
  const awarded = result.data.completeLesson.sparks_awarded
  return { ok: true, data: awarded > 0 ? awarded : null }
}

/**
 * The toolkit's three writes as one route `action`: the hearts on every tile,
 * and the player's "viewed" and "completed". Shared by the toolkit, category,
 * video and school routes so the form contract (`intent`, `lesson`, `saved`)
 * lives in one place.
 *
 * **Never throws**: a heart that failed to persist is logged and reported as
 * `{ ok: false }`; the screen already shows the new state.
 */
export async function lessonAction(
  accessToken: string,
  form: FormData,
  tag: string,
): Promise<{ ok: boolean; sparksAwarded?: number | null }> {
  const intent = String(form.get('intent') ?? '')
  const lesson = String(form.get('lesson') ?? '').trim()
  if (!lesson) return { ok: false }

  const result =
    intent === 'save'
      ? await bpSetLessonSaved(accessToken, lesson, form.get('saved') === 'true')
      : intent === 'view'
        ? await bpRecordLessonView(accessToken, lesson)
        : intent === 'complete'
          ? await bpCompleteLesson(accessToken, lesson)
          : null
  if (!result) return { ok: false }
  if (!result.ok) {
    console.error(`${tag} ${intent} ${lesson} failed (${result.error.kind}): ${result.error.message}`)
    return { ok: false }
  }
  return intent === 'complete' ? { ok: true, sparksAwarded: result.data as number | null } : { ok: true }
}

