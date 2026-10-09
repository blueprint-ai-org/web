/**
 * BP AI gateway configuration.
 *
 * Reads `process.env` directly, which is this repo's only config convention —
 * see `lti/provider.ts:5-6` (required-env loop) and
 * `app/lib/lti-session.server.ts:3`. There is no config abstraction to hook
 * into and this phase does not invent one.
 *
 * `BP_AI_GRAPHQL_URL` is **required**, and is validated at module evaluation
 * the way `lti/provider.ts` validates `LTI_KEY` / `MONGODB_URL` /
 * `CANVAS_ISSUER`: a misconfigured deploy fails loudly at boot instead of
 * silently failing on a user's first login attempt.
 *
 * Consequence for tests and scripts: set the variable *before* this module is
 * evaluated. The repo's pattern for that is `process.env.X ??= …` at the top of
 * the file plus a dynamic `import()` inside `before()` — see
 * `app/routes/app.test.ts:19-30` and `app/lib/bp-ai/client.test.ts`.
 */

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Missing env ${name} — required to reach the BP AI GraphQL gateway. See .env.example.`,
    )
  }
  return value
}

/**
 * Absolute URL of the BP AI GraphQL gateway, e.g.
 * `https://api-test.blueprinteq.ai/graphql`.
 *
 * Server-only by design: the browser never learns this URL. Nothing bootstraps
 * env into `window`, and keeping every call server-side also satisfies the
 * API's `NO_USER` constraint for free (a server call carries no ambient
 * credential).
 */
export const BP_AI_GRAPHQL_URL: string = requireEnv('BP_AI_GRAPHQL_URL')

/**
 * Is self-service signup switched on? **Off unless `BP_SIGNUP_ENABLED` says
 * otherwise**, and off for the product reason below rather than a technical one.
 *
 * **Why the screen exists but the route does not.** The gateway's `signup` is
 * an **org-creation** flow: every self-service signup provisions a brand-new,
 * empty tenant and makes the signer its `role: "admin"` — measured, five
 * distinct tenant UUIDs from five signups, each with an `admin` claim (see
 * `thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md`
 * §"Tenant assignment"). That contradicts D5 ("everyone who signs up is a
 * student") and D7 ("no tenant field"): a student who signed up here would own
 * an empty school with admin rights over it, which is not a state the product
 * has any screen for. What the product needs — a student joining an *existing*
 * school tenant — has no operation in this schema at all.
 *
 * So the flag is not waiting on a bug fix. It is waiting on a backend
 * operation that does not exist yet. (`signup` is *also* answering
 * `rpc error: code = Internal desc = internal error` as of 2026-08-25, but that
 * outage is incidental — fixing it would not make this flag safe to flip.)
 *
 * **Read per call, not captured at module load.** The value is cheap, the
 * indirection buys per-test control of the flag without a second process, and
 * nothing here can fail — unlike {@link BP_AI_GRAPHQL_URL}, an absent flag is a
 * valid, meaningful configuration.
 *
 * Truthiness is explicit: `1` / `true` / `yes` / `on` (any case) enable it and
 * **everything else disables it**. `Boolean(process.env.BP_SIGNUP_ENABLED)`
 * would read `BP_SIGNUP_ENABLED=false` as ON, which is the one way a config
 * flag can lie in the dangerous direction.
 */
export function isSignupEnabled(): boolean {
  const raw = process.env.BP_SIGNUP_ENABLED?.trim().toLowerCase()
  if (!raw) return false
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}
