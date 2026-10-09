// Short-TTL Mongo-backed store for cookieless OIDC nonces. Reuses the
// mongoose connection ltijs established at startup (see lti/provider.ts).
//
// Each (nonce, state) pair lives ~120s, just long enough for the
// platform-storage round-trip. A TTL index on `createdAt` guarantees Mongo
// expires records even if `consumeNonce` is never called (e.g. user closes
// the tab between login and launch).
import mongoose from 'mongoose'

const COLLECTION = 'lti_nonces'
const DEFAULT_TTL_SECONDS = 120

type NonceDoc = {
  nonce: string
  state: string
  createdAt: Date
}

let indexEnsured: Promise<void> | null = null

function getCollection() {
  const conn = mongoose.connection
  if (!conn || !conn.db) {
    throw new Error('nonce-store: mongoose connection not ready (db is undefined)')
  }
  return conn.db.collection<NonceDoc>(COLLECTION)
}

async function ensureIndex(ttlSeconds: number): Promise<void> {
  if (indexEnsured) return indexEnsured
  indexEnsured = (async () => {
    const col = getCollection()
    await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds })
    await col.createIndex({ nonce: 1, state: 1 }, { unique: true })
  })()
  return indexEnsured
}

/**
 * Persist a (nonce, state) pair. Mongo's TTL monitor will expire it after
 * `ttlSeconds` seconds. Idempotent on (nonce, state).
 */
export async function saveNonce(
  nonce: string,
  state: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  await ensureIndex(ttlSeconds)
  const col = getCollection()
  await col.updateOne(
    { nonce, state },
    { $set: { nonce, state, createdAt: new Date() } },
    { upsert: true }
  )
}

/**
 * Atomically remove and return whether a matching unexpired (nonce, state)
 * record existed. Returns true on first valid use, false on any subsequent
 * call (replay protection) or if the pair is unknown / already expired.
 */
export async function consumeNonce(nonce: string, state: string): Promise<boolean> {
  await ensureIndex(DEFAULT_TTL_SECONDS)
  const col = getCollection()
  const result = await col.findOneAndDelete({ nonce, state })
  // mongoose 7 / driver 5: findOneAndDelete returns the doc directly or null.
  // mongoose 6 / driver 4: returns { value, ok }. Handle both shapes.
  if (!result) return false
  if (typeof result === 'object' && 'value' in result) {
    return (result as { value: NonceDoc | null }).value !== null
  }
  return true
}
