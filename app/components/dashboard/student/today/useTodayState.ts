import { useState } from 'react'
import { useLocation } from 'react-router'

import type { HubState } from '~/lib/bp-ai/gamification.server'
import { studentStorage } from '~/lib/student/storage'

import { TODAY_CARDS, type CardDef, type CardId, type CardState } from './today-data'

/**
 * Load-time hydration of the Today hub — the React equivalent of today.html's
 * on-load sequence (`today:1080-1112`), with the STATE taken from the server:
 *
 *  1. entry animation from router state OR `bp_enter_anim` (consumed),
 *  2. which cards are done, and the balance, come from `dailyCards` /
 *     `sparkBalance` (the route's loader). The first non-done card (DOM order)
 *     is the hero,
 *  3. success takeover only when all 4 are done AND the student arrived
 *     straight from finishing a card (router state `justCompleted`, set by the
 *     completed sequence and the mood check-in) AND `bp_skip_success` is not
 *     set. It used to key off one-shot `bp_<section>_done` flags, which also
 *     decided "done"; the router state is only the animation trigger.
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

export function useTodayState(hub: HubState): TodayInit {
  const location = useLocation()
  const state = location.state as { enterAnim?: boolean; justCompleted?: boolean } | null
  const [init] = useState<TodayInit>(() =>
    computeTodayInit(hub, state?.enterAnim === true, state?.justCompleted === true),
  )
  return init
}

function computeTodayInit(hub: HubState, navEnterAnim: boolean, justCompleted: boolean): TodayInit {
  const entryAnim = studentStorage.consumeEnterAnim() || navEnterAnim

  const doneSet = new Set(hub.done)
  const nonDone = TODAY_CARDS.filter((c) => !doneSet.has(c.family))
  const done = TODAY_CARDS.filter((c) => doneSet.has(c.family))
  const heroId = nonDone[0]?.id ?? null
  const cards: HubCard[] = [...nonDone, ...done].map((def) => ({
    def,
    state: doneSet.has(def.family) ? 'done' : def.id === heroId ? 'hero' : 'sleepy',
  }))

  const allDone = nonDone.length === 0

  let showSuccess = false
  if (allDone) {
    const skip = studentStorage.consumeSkipSuccess() // read-and-remove (today:938-939)
    showSuccess = justCompleted && !skip
  }

  return { cards, heroId, sparks: hub.balance, allDone, showSuccess, entryAnim, tourDone: studentStorage.getTourDone() }
}
