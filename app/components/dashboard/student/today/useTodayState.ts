import { useState } from 'react'
import { useLocation } from 'react-router'

import { studentStorage } from '~/lib/student/storage'

import { TODAY_CARDS, type CardDef, type CardId, type CardState } from './today-data'

/**
 * Load-time hydration of the Today hub from `bp_*` storage — the React
 * equivalent of today.html's on-load sequence (`today:1080-1112`):
 *
 *  1. entry animation from router state OR `bp_enter_anim` (consumed),
 *  2. `bp_fresh_start` → clear `bp_session_done` (fresh daily queue),
 *  3. restore `bp_session_done`, consume one-shot `bp_<section>_done` flags →
 *     mark those cards done (+ append their section + record session-done),
 *  4. mood is always done; the first non-done card (DOM order) is the hero,
 *  5. success takeover only when a flag was freshly consumed AND all 4 done AND
 *     `bp_skip_success` is not set.
 *
 * Runs exactly once via a `useState` initializer (the app has no StrictMode, so
 * the one-shot consumption is not double-invoked). Client-only — the route uses
 * a `HydrateFallback`, so storage is available when this runs.
 */

export interface HubCard {
  def: CardDef
  state: CardState
}

export interface TodayInit {
  cards: HubCard[]
  heroId: CardId | null
  sparks: number
  allDone: boolean
  showSuccess: boolean
  entryAnim: boolean
  tourDone: boolean
}

export function useTodayState(): TodayInit {
  const location = useLocation()
  const navEnterAnim = (location.state as { enterAnim?: boolean } | null)?.enterAnim === true
  const [init] = useState<TodayInit>(() => computeTodayInit(navEnterAnim))
  return init
}

function computeTodayInit(navEnterAnim: boolean): TodayInit {
  const entryAnim = studentStorage.consumeEnterAnim() || navEnterAnim

  if (studentStorage.consumeFreshStart()) studentStorage.clearSessionDone()

  const sessionDone = new Set<string>(studentStorage.getSessionDone())

  const newly: CardId[] = []
  if (studentStorage.consumeWinsDone()) newly.push('card-wins')
  if (studentStorage.consumeWriteDone()) newly.push('card-write')
  if (studentStorage.consumeAboutDone()) newly.push('card-about')
  const freshCompletion = newly.length > 0
  for (const id of newly) {
    sessionDone.add(id)
    studentStorage.addSessionDone(id)
    const card = TODAY_CARDS.find((c) => c.id === id)
    if (card) studentStorage.addTodaySection(card.section)
  }

  const doneSet = new Set<CardId>(['card-mood'])
  for (const id of sessionDone) doneSet.add(id as CardId)

  const nonDone = TODAY_CARDS.filter((c) => !doneSet.has(c.id))
  const done = TODAY_CARDS.filter((c) => doneSet.has(c.id))
  const heroId = nonDone[0]?.id ?? null
  const cards: HubCard[] = [...nonDone, ...done].map((def) => ({
    def,
    state: doneSet.has(def.id) ? 'done' : def.id === heroId ? 'hero' : 'sleepy',
  }))

  const sparks = studentStorage.ensureSparks()
  const allDone = TODAY_CARDS.every((c) => doneSet.has(c.id))

  let showSuccess = false
  if (allDone) {
    const skip = studentStorage.consumeSkipSuccess() // read-and-remove (today:938-939)
    showSuccess = freshCompletion && !skip
  }

  return { cards, heroId, sparks, allDone, showSuccess, entryAnim, tourDone: studentStorage.getTourDone() }
}
