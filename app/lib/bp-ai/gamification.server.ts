/**
 * The student economy, as the gateway keeps it: spark balance, today's cards,
 * the shop and the collection, what each action is worth, and milestones.
 *
 * All of it used to live in `localStorage` — a balance that started at a fixed
 * 360, card flags that decided "done", and a shop of eight hand-priced cards —
 * so a second device, or a cleared browser, started the economy over. Every
 * read here is the caller's own (no user id travels; the gateway resolves it
 * from the token), and every figure the student sees comes from a row.
 *
 * **Absent is "don't show", never zero or yes.** `owned`, `affordable` and
 * `sparksAwarded` are nullable on the wire (null for an API key, or when the
 * ledger failed). {@link sparkReward} and {@link shopCard} turn null into "no
 * figure" and "not owned / not affordable": a `+0` badge or a buyable card the
 * server never vouched for is the failure this module exists to prevent.
 */

import { graphql } from './client.server'
import { gql } from './gql'
import type { CollectibleSection, DailyCardFamily } from './gql/schema'
import type { GqlResult } from './types'

// ── Reward figures ────────────────────────────────────────────────────────────

/** A figure worth showing: positive, or null. 0 = paid nothing; null = unknown. */
export function sparkReward(amount: number | null | undefined): number | null {
  return typeof amount === 'number' && amount > 0 ? amount : null
}

/**
 * The spark-rule event each card family pays (`activity-ingestor`
 * `engagement/app/service.go`). Typed against the generated enum, so a new
 * family fails the typecheck instead of silently paying nothing here.
 */
export const FAMILY_EVENT: Record<DailyCardFamily, string> = {
  MOOD: 'mood_checkin',
  ABOUT: 'about_you',
  WINS: 'wins',
  WRITE: 'write',
}

/** `event → amount`, from `listSparkRules`. A screen that announces a reward BEFORE the write reads this. */
export type SparkRules = Readonly<Record<string, number>>

const SPARK_RULES = gql(`query SparkRules { listSparkRules { event amount } }`)

export async function bpSparkRules(accessToken: string): Promise<GqlResult<SparkRules>> {
  const result = await graphql(SPARK_RULES, {}, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: Object.fromEntries(result.data.listSparkRules.map((r) => [r.event, r.amount])) }
}

/** What one event pays, or null — through the same "show only when > 0" rule. */
export async function bpRuleReward(accessToken: string, event: string): Promise<number | null> {
  const rules = await bpSparkRules(accessToken)
  if (!rules.ok) {
    console.error(`[gamification] listSparkRules failed (${rules.error.kind}): ${rules.error.message}`)
    return null
  }
  return sparkReward(rules.data[event])
}

// ── Hub: balance + today's cards ──────────────────────────────────────────────

const HUB = gql(`query Hub($date: String) {
  sparkBalance { balance }
  dailyCards(date: $date) { cards { family done } }
}`)

export interface HubState {
  balance: number
  /** Families the server counts as done today. */
  done: DailyCardFamily[]
}

/** The empty state: what a launch with no BP session (or a failed read) shows. */
export const EMPTY_HUB: HubState = { balance: 0, done: [] }

/**
 * Balance and today's cards in one request.
 *
 * `date` is the student's LOCAL day (`YYYY-MM-DD`): the proto asks for it in
 * their zone, and the gateway's default is the UTC day, which flips "today" at
 * the wrong hour everywhere but London.
 */
export async function bpHub(accessToken: string, date: string | undefined): Promise<GqlResult<HubState>> {
  const result = await graphql(HUB, { date }, { accessToken })
  if (!result.ok) return result
  return {
    ok: true,
    data: {
      balance: result.data.sparkBalance.balance,
      done: result.data.dailyCards.cards.filter((c) => c.done).map((c) => c.family),
    },
  }
}

// ── Collectibles ──────────────────────────────────────────────────────────────

const COLLECTIBLES = gql(`query Collectibles($section: CollectibleSection) {
  listCollectibles(section: $section, status: ACTIVE, pageSize: 100) {
    collectibles { id name description image_url cost section owned affordable }
  }
}`)

export interface ShopCard {
  id: string
  /** The art, or null: an operator has not uploaded it yet. Drawn as an empty card. */
  art: string | null
  cost: number
  section: CollectibleSection
  /** For the collectible detail screen. */
  text: string
  owned: boolean
  affordable: boolean
}

type CollectibleRow = {
  id: string
  name: string
  description: string
  image_url: string
  cost: number
  section: CollectibleSection
  owned?: boolean | null
  affordable?: boolean | null
}

export function shopCard(c: CollectibleRow): ShopCard {
  return {
    id: c.id,
    art: c.image_url.trim() || null,
    cost: c.cost,
    section: c.section,
    text: c.description.trim() || c.name,
    // `=== true`: null (API key, or a server that did not compute it) is "no".
    owned: c.owned === true,
    affordable: c.affordable === true,
  }
}

/**
 * The tenant's live collectibles, with `owned`/`affordable` computed for the
 * caller. `section` omitted ⇒ every section. 100 is a ceiling, not a guess: the
 * seed has eleven, and a catalogue that outgrew a page would want paging.
 */
export async function bpCollectibles(
  accessToken: string,
  section?: CollectibleSection,
): Promise<GqlResult<ShopCard[]>> {
  const result = await graphql(COLLECTIBLES, { section }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.listCollectibles.collectibles.map(shopCard) }
}

const PURCHASE = gql(`mutation PurchaseCollectible($id: ID!) {
  purchaseCollectible(collectibleId: $id) { balance }
}`)

/** Buy one; charge and delivery are one transaction server-side. Resolves to the new balance. */
export async function bpPurchase(accessToken: string, collectibleId: string): Promise<GqlResult<number>> {
  const result = await graphql(PURCHASE, { id: collectibleId }, { accessToken })
  if (!result.ok) return result
  return { ok: true, data: result.data.purchaseCollectible.balance }
}

// ── Collection: earned collectibles + the next milestone ──────────────────────

const MILESTONES = gql(`query Milestones {
  listMilestones { id reward_sparks order }
  listUserMilestones { milestone }
}`)

/** The reward of the next milestone not yet reached, or null when there is none worth showing. */
export async function bpNextMilestoneReward(accessToken: string): Promise<GqlResult<number | null>> {
  const result = await graphql(MILESTONES, {}, { accessToken })
  if (!result.ok) return result
  const reached = new Set(result.data.listUserMilestones.map((m) => m.milestone))
  const next = [...result.data.listMilestones]
    .sort((a, b) => a.order - b.order)
    .find((m) => !reached.has(m.id))
  return { ok: true, data: sparkReward(next?.reward_sparks) }
}
