/**
 * Notice-wins: today's wins question, today's win, and the write.
 *
 * The screen used to be entirely local — a fixed question in the app and the
 * note in local storage — so a win paid nothing, never reached `dailyCards`,
 * and was gone on a second device. It is a `win_gratitude` row now, linked to
 * the catalogue question it answers (`WinGratitude.question`, step-31), which
 * is also how `dailyQuestions` knows the question was answered.
 *
 * **One win per local day.** Re-saving the same day UPDATES today's win instead
 * of creating another (product decision pending, step-31 Manual Verification);
 * the `wins` rule pays at most once a day anyway.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import { FAMILY_EVENT, sparkReward } from './gamification.server'
import type { GqlResult } from './types'

/** The catalogue slot of the wins questions (step-30): category + topic. */
const WINS = { category: 'gratitude', topic: 'wins' } as const

/** `win_gratitude.type`: the Mongo validator's enum is lower-case `win | gratitude`. */
const WIN_TYPE = 'win'

const NOTICE_WINS = gql(`query NoticeWins($date: String!, $timeZone: String, $category: String!, $topic: String) {
  dailyQuestions(category: $category, topic: $topic, date: $date, count: 1, timeZone: $timeZone) { id label }
  studentActivity(from: $date, to: $date, timeZone: $timeZone) {
    days { wins { id title description question created_at } }
  }
  listSparkRules { event amount }
}`)

export interface NoticeWinsData {
  /** Today's question; null ⇒ nothing to ask (the catalogue is not seeded). */
  question: { id: string; label: string } | null
  /** Today's win, newest, if the student already saved one. */
  today: { id: string; question: string; note: string; questionId: string | null } | null
  /** What a win pays (`wins` rule), or null for no figure. */
  reward: number | null
}

export const EMPTY_NOTICE_WINS: NoticeWinsData = { question: null, today: null, reward: null }

/** The screen in one request. `date` is the student's LOCAL day. */
export async function bpNoticeWins(
  accessToken: string,
  date: string,
  timeZone: string | undefined,
): Promise<GqlResult<NoticeWinsData>> {
  const result = await graphql(NOTICE_WINS, { date, timeZone, ...WINS }, { accessToken })
  if (!result.ok) return result
  const d = result.data
  const win = d.studentActivity.days
    .flatMap((day) => day.wins)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return {
    ok: true,
    data: {
      question: d.dailyQuestions[0] ? { id: d.dailyQuestions[0].id, label: d.dailyQuestions[0].label } : null,
      today: win ? { id: win.id, question: win.title, note: win.description ?? '', questionId: win.question ?? null } : null,
      reward: sparkReward(d.listSparkRules.find((r) => r.event === FAMILY_EVENT.WINS)?.amount),
    },
  }
}

const CREATE_WIN = gql(`mutation CreateWin($input: CreateWinGratitudeInput!) {
  createWinGratitude(input: $input) { id sparksAwarded }
}`)

const UPDATE_WIN = gql(`mutation UpdateWin($input: UpdateWinGratitudeInput!) {
  updateWinGratitude(input: $input) { id }
}`)

/**
 * Save the student's win against the question it answers: an update of
 * `todayWinId` when there is one, else a new row.
 *
 * `title` is the question as asked — a win reads back on its own (summary, hub
 * overlay) without resolving the catalogue. `question` is resent on update on
 * purpose: `UpdateWinGratitudeInput` without it CLEARS the link, and the
 * question would come back tomorrow as unanswered.
 *
 * Resolves to what the write paid (create only; an update pays nothing).
 */
export async function bpSaveWin(
  accessToken: string,
  userId: string,
  win: { todayWinId: string | null; questionId: string; question: string; note: string },
): Promise<GqlResult<{ id: string; sparksAwarded: number | null }>> {
  const fields = { type: WIN_TYPE, title: win.question, description: win.note, question: win.questionId }
  if (win.todayWinId) {
    const result = await graphql(UPDATE_WIN, { input: { id: win.todayWinId, ...fields } }, { accessToken })
    if (!result.ok) return result
    return { ok: true, data: { id: result.data.updateWinGratitude.id, sparksAwarded: null } }
  }
  const result = await graphql(CREATE_WIN, { input: { user: userId, ...fields } }, { accessToken })
  if (!result.ok) return result
  const created = result.data.createWinGratitude
  return { ok: true, data: { id: created.id, sparksAwarded: sparkReward(created.sparksAwarded) } }
}
