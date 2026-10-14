/**
 * Loader tests for `/student` — the post-login fork into onboarding.
 *
 * Since step-22 the fork is decided by the server (`me.user.onboardingCompletedAt`)
 * instead of a `localStorage` flag, so a second device no longer walks the
 * onboarding again. These pin which `me` answers send a student there.
 *
 * Same harness as `_index.test.ts` (a real sealed `bp-session`) plus a `fetch`
 * stub for the gateway, as in `app/lib/bp-ai/journal.test.ts`.
 *
 * Run: npx tsx --test --test-force-exit app/routes/student._index.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { ONBOARDING_FIRST_PATH } from '../components/dashboard/student/onboarding-v2/steps.ts'
import { Role } from '../lib/bp-ai/gql/schema.ts'

process.env.BP_SESSION_SECRET = 'test-bp-session-secret-for-student-index-tests'
process.env.LTI_KEY = 'a-deliberately-different-lti-key'
process.env.BP_AI_GRAPHQL_URL = 'https://bp-ai.test/graphql'

type IndexModule = typeof import('./student._index.tsx')
type SessionModule = typeof import('../lib/bp-ai/session.server.ts')

let loader: IndexModule['loader']
let cookie: string

before(async () => {
  loader = ((await import('./student._index.tsx')) as IndexModule).loader
  const { sealBpSession } = (await import('../lib/bp-ai/session.server.ts')) as SessionModule
  cookie = `bp-session=${await sealBpSession({
    accessToken: 'access',
    refreshToken: 'refresh',
    userId: '332a53ba-0000-4000-8000-00000000000a',
    tenant: '2ecc258c-0000-4000-8000-00000000000b',
    accessTokenExpiresAt: Date.now() + 900_000,
    role: Role.Student,
    refreshExpiresAt: Date.now() + 30 * 24 * 3_600_000,
  })}`
})

const originalFetch = globalThis.fetch
after(() => {
  globalThis.fetch = originalFetch
})

// The loader also reads the hub (balance + today's cards) and the mood
// catalogue in parallel; those reads have their own answers so `payload` only
// has to describe `me`.
const HUB = { data: { sparkBalance: { balance: 0 }, dailyCards: { cards: [] } } }
const NO_MOODS = { data: { listMoods: { moods: [] } } }

function stubGateway(payload: unknown, moods: unknown = NO_MOODS): void {
  globalThis.fetch = (async (_url: unknown, init: RequestInit = {}) => {
    const body = String(init.body)
    const answer = body.includes('query Hub') ? HUB : body.includes('query ListCheckinMoods') ? moods : payload
    return new Response(JSON.stringify(answer), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof globalThis.fetch
}

function load() {
  const request = new Request('https://example.test/student', { headers: { cookie } })
  return loader({ request, params: {}, context: {} as never } as never)
}

/** The redirect Location, or `null` when the loader lets the hub render. */
async function landing(): Promise<string | null> {
  try {
    await load()
    return null
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw thrown
    return thrown.headers.get('Location')
  }
}

describe('/student loader', () => {
  const cases: Array<{ name: string; gateway: unknown; expected: string | null }> = [
    {
      name: 'sends a student who has not finished onboarding into it',
      gateway: { data: { me: { preferredName: 'Ada', user: { avatar_id: null, avatar: null, onboardingCompletedAt: null } } } },
      expected: ONBOARDING_FIRST_PATH,
    },
    {
      name: 'lets a student with a completion date through to the hub',
      gateway: {
        data: { me: { preferredName: 'Ada', user: { avatar_id: null, avatar: null, onboardingCompletedAt: '2026-10-13T09:00:00Z' } } },
      },
      expected: null,
    },
    {
      // The tenant owner and a support pass have no `User`, so their null date
      // is not "not done" — bouncing them would trap them in onboarding.
      name: 'lets a session with no User record through',
      gateway: { data: { me: { preferredName: 'Owner', user: null } } },
      expected: null,
    },
    {
      // A welcome tour, not an access gate: a gateway hiccup must not replay it.
      name: 'lets the student through when `me` fails',
      gateway: { data: null, errors: [{ message: 'unavailable', extensions: { code: 'UNAVAILABLE' } }] },
      expected: null,
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      stubGateway(c.gateway)
      assert.equal(await landing(), c.expected)
    })
  }

  it("hands the mood overlay each tile's catalogue chips, keyed by the art key the check-in stores", async () => {
    const category = { id: 'cat-happy', identifier: 'checkin_happy', label: 'Happy', order: 1 }
    const mood = (id: string, level: number, chips: string[]) => ({
      id, identifier: id, label: id, level, emoji: null, color: null, secondaryColor: null, chips, order: level, category,
    })
    stubGateway(
      { data: { me: { preferredName: 'Ada', user: null } } },
      { data: { listMoods: { moods: [mood('happy_1', 1, ['Joyful']), mood('happy_2', 2, ['Content'])] } } },
    )
    const data = await load()
    // `happy`, not `checkin_happy`: the overlay looks chips up by what
    // `studentStorage.getMoodEmotions()` holds.
    assert.deepEqual(data.moodChips, { happy: ['Joyful', 'Content'] })
  })
})
