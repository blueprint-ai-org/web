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
