/**
 * The economy reads: what a null from the gateway turns into on screen.
 *
 * `owned` / `affordable` are nullable on the wire (null for an API key). The
 * failure this guards is a null read as "yes" — a card shown as buyable, or as
 * already owned, that the server never vouched for.
 *
 * Same harness as `journal.test.ts`: env, a `fetch` stub, dynamic import, so
 * the real client runs.
 *
 * Run: npx tsx --test --test-force-exit app/lib/bp-ai/gamification.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type Module = typeof import('./gamification.server.ts')
let mod: Module

before(async () => {
  mod = (await import('./gamification.server.ts')) as Module
})

const originalFetch = globalThis.fetch
after(() => {
  globalThis.fetch = originalFetch
})

function stub(data: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
}

function row(over: Record<string, unknown>) {
  return { id: 'c1', name: 'Card', description: '', image_url: '', cost: 200, section: 'SHOP', ...over }
}

describe('bpCollectibles', () => {
  it('reads an absent owned/affordable as "no", never as "yes"', async () => {
    stub({ listCollectibles: { collectibles: [row({ owned: null, affordable: null }), row({ id: 'c2' })] } })
    const result = await mod.bpCollectibles('tok', 'SHOP')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)
    for (const card of result.data) {
      assert.equal(card.owned, false)
      assert.equal(card.affordable, false)
    }
  })

  it('keeps the server verdict when it gives one', async () => {
    stub({ listCollectibles: { collectibles: [row({ owned: true, affordable: false }), row({ id: 'c2', owned: false, affordable: true })] } })
    const result = await mod.bpCollectibles('tok', 'SHOP')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)
    assert.deepEqual(
      result.data.map((c) => [c.owned, c.affordable]),
      [
        [true, false],
        [false, true],
      ],
    )
  })

  it('draws no art for an empty image_url instead of a broken image', async () => {
    stub({ listCollectibles: { collectibles: [row({ image_url: '' })] } })
    const result = await mod.bpCollectibles('tok')
    if (!result.ok) throw new Error(`expected success, got ${result.error.kind}`)
    assert.equal(result.data[0].art, null)
  })
})

describe('bpNextMilestoneReward', () => {
  const milestones = [
    { id: 'm2', reward_sparks: 50, order: 2 },
    { id: 'm1', reward_sparks: 25, order: 1 },
  ]

  it('names the reward of the first milestone, in order, not yet reached', async () => {
    stub({ listMilestones: milestones, listUserMilestones: [{ milestone: 'm1' }] })
    const result = await mod.bpNextMilestoneReward('tok')
    assert.deepEqual(result, { ok: true, data: 50 })
  })

  it('shows no figure once every milestone is reached', async () => {
    stub({ listMilestones: milestones, listUserMilestones: [{ milestone: 'm1' }, { milestone: 'm2' }] })
    const result = await mod.bpNextMilestoneReward('tok')
    assert.deepEqual(result, { ok: true, data: null })
  })
})
