# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A standalone **LTI 1.3 tool** that launches inside Canvas and hands off to a React Router 7 SSR app, both served from a single Express process (`server.ts`). It uses [`ltijs`](https://github.com/Cvmcosta/ltijs) for the standard plumbing (JWKS, key persistence, dynamic registration stub) but overrides OIDC `/lti/login` and `/lti/launch` with our own **Cookieless OIDC + Platform Storage** flow so embedded launches survive Safari ITP and Firefox Strict ETP.

The full design (sequence diagram, why-this-exists, install paths) lives in `README.md`. The end-user install guide is `INSTALL.md`. Canvas install-method survey is in `docs/install-methods.md`. This file is the orientation for the bits a future agent has to get right immediately.

## Commands

Node 20+ required. All commands run from this directory.

```bash
npm install
npm run dev        # tsx watch + Vite middleware HMR on :3000 (NODE_ENV=development)
npm run build      # react-router build → ./build/{client,server}
npm start          # tsx server.ts (no watch, prod)
npm run typecheck  # react-router typegen + tsc --noEmit

# Unit tests — node:test under tsx (vitest is intentionally NOT installed)
npm test                                              # whole suite (lti/ + app/), 258 tests
npx tsx --test --test-force-exit lti/verify.test.ts   # single file
npx tsx --test --test-force-exit lti/dynamic-registration.test.ts
npx tsx --test --test-force-exit 'lti/*.test.ts'

# ALWAYS pass --test-force-exit (npm test already does). node:test waits for the
# event loop to drain, so one stray open handle leaves the process alive forever.
# Two test files once sat hung for 5 days holding 518 MongoDB Atlas sockets and
# exhausted the shared cluster's 500-connection cap. See the Mongo section below.

# QA harnesses (boot a mock platform + JWKS, exercise the full flow end-to-end)
npx tsx lti/cookieless.qa.ts            # Phase 3 cookieless OIDC e2e (login → launch → validate)
npx tsx scripts/dynreg-qa.ts            # Dynamic Registration against a stub platform
npx tsx scripts/dynreg-qa-phase3.ts     # Dynamic Registration follow-up phase
npx tsx scripts/check-mongo.ts          # Sanity-check MONGODB_URL connectivity
```

Env vars are documented in `.env.example` and the "Environment variables" table in `README.md`. `LTI_KEY`, `MONGODB_URL`, and `CANVAS_ISSUER` are required to boot.

**The test suite must never need Mongo.** `lti/provider.ts` throws on missing env and dials Atlas at *import* time, so `lti/platform.ts`, `lti/dynamic-registration.ts` and `lti/cookieless.qa.ts` import it **lazily** (`await import('./provider.js')` inside the function that needs it). Do not hoist those back to a top-level import — it makes every module downstream unloadable in tests and hangs the suite when the cluster is unreachable.

## Architecture — the parts that bite

<important if="you are modifying server.ts, route ordering, or any /lti/* handler">

**Route order in `server.ts` is load-bearing.** Our cookieless handlers, the dynamic-registration handler, and `/lti-config.json` must be registered **before** `app.use(lti.app)` — otherwise ltijs intercepts them with its own (cookie-based, stub, or 401'ing) implementations. The order in `server.ts` is:

1. `/app` CSP header middleware (sets `frame-ancestors https://*.instructure.com` at the Express layer because RR's `headers()` export isn't invoked for thrown Responses).
2. `GET /lti/register` → `handleDynamicRegistration` (overrides ltijs's `dynRegRoute` stub).
3. `GET /lti-config.json` → `handleLtiConfigJson` (static-paste install fallback).
4. `app.use(bpRefreshMiddleware)` → transparent BP AI access-token refresh (`app/lib/bp-ai/refresh.server.ts`). Must precede every `rrHandler` registration: it rewrites `req.headers.cookie` so the loaders rrHandler is about to run see the refreshed token. It is a no-op for LTI by its own guards, not by position — it returns immediately for any `/lti/*` path and for any request without a `bp-session` cookie.
5. `GET /` and `GET /app` → React Router handler.
6. `POST/GET /lti/login` → `handleCookielessLogin`. When `lti_storage_target` is absent the handler calls `next()` and ltijs's cookie-based login takes over.
7. `POST /lti/launch` → `handleCookielessLaunch`. Same `next()` fallback pattern.
8. `POST /lti/validate` → `handleValidate` (our internal endpoint; ltijs never sees it).
9. Static assets — must come before `lti.app` so Canvas-fetched `/icon.png` (the Developer Key logo) isn't 401'd by ltijs auth middleware.
10. `app.use(lti.app)` — owns JWKS, dynamic-registration fallback, legacy cookie flow.
11. Catch-all `app.all('/*splat', rrHandler)` for any remaining RR routes.

**Do not** mount `express.urlencoded()` upstream of `/lti/login` or `/lti/launch`: the cookieless handlers read the raw body themselves (`readRawBody` + `_body=true` sentinel) and re-emit it when falling through to ltijs. A pre-mounted body parser would consume the stream and break the fallback.

</important>

<important if="you are editing the cookieless OIDC flow, verify.ts, templates, or the nonce store">

**Regression sentinel — TC-3 (Safari course-nav launch).** Any change to `lti/cookieless.ts`, `lti/verify.ts`, `lti/templates/*.html`, or LTI route order in `server.ts` must re-run TC-3 from the QA doc (`../thoughts/sergio/qa/2026-05-04-lti-cookieless-launch.md`) before merge. TC-3 is the canary that proves Platform Storage / postMessage is wired correctly; if it fails, Safari users silently hit `MISSING_VALIDATION_COOKIE`.

**Validation order in `handleValidate` is load-bearing**: token-nonce match → `getPlatformConfig` → `verifyIdToken` (signature, iss, aud, exp, nonce **and** `assertLaunchClaims`: `deployment_id` / `message_type` / `azp`, see `lti/launch-claims.ts`) → **`consumeNonce` last**. Consuming the nonce first (the pre-step-12 order) let anyone who saw a `(state, nonce)` pair burn it with a junk token. Replay protection is unaffected: `consumeNonce`'s `findOneAndDelete` is atomic. `lti/validate-order.test.ts` is the sentinel; `_handleValidateWithDeps` is the seam it injects into.

**Admin roles have one definition**: `app/lib/admin-roles.ts` (`ADMIN_ROLE_IDS` / `hasAdminRole`). It is mirrored by `lms-connector/internal/ltiauth/domain/claims_model.go`'s `IsAdmin` — change both together. `custom_fields.lti_role` can select any persona **except** `admin`; only a platform-asserted role grants that.

The cookieless flow is the spec'd answer (`lti-cs-oidc/v0p1` + `lti-pm-s/v0p1`) for the third-party-cookie problem: `state`/`nonce` live in Canvas's per-origin postMessage store (`lti.put_data` / `lti.get_data`) instead of in a cookie on our origin. Nonces are persisted in our `lti_nonces` Mongo collection (TTL 120s, see `lti/nonce-store.ts`) so the flow survives multi-instance deploys.

Post-launch session uses a **JWT in URL** (`/app?lti_session=<jwt>`) in addition to the legacy `lti-claims` cookie, because Safari ITP / Firefox Strict ETP drop the cookie in iframe context. `app/lib/lti-session.server.ts` prefers the URL token over the cookie. `app/routes/app.tsx` scrubs the JWT from history via `history.replaceState` on first render.

</important>

<important if="you are touching install paths, placements, or what Canvas sees during registration">

**`GET /lti/register` is gated** (`lti/registration-guard.ts`): it needs the shared `LTI_REGISTRATION_SECRET` (query param `registration_secret`, or `Authorization: Bearer`) and it only fetches an `openid_configuration` / `registration_endpoint` whose host is allowlisted (`LTI_REGISTRATION_ALLOWED_HOSTS`, defaulting to Instructure's domains + the `CANVAS_ISSUER` host). **Unset secret ⇒ the endpoint 503s** — registration fails closed, so a new environment must set it before an admin can install the tool. Without both gates anyone reachable could register their own issuer + JWKS and mint Administrator launches.

There are **two install paths** and they must stay shape-compatible:

- `GET /lti/register` (LTI 1.3 Dynamic Registration) — `lti/dynamic-registration.ts`.
- `GET /lti-config.json` (static paste-JSON for older Canvas instances) — `lti/config-json.ts`.

Both derive their payload from a single placement builder in `lti/tool-config.ts` — keep new placements/claims/scopes there so the two endpoints cannot drift. URLs are derived at request time from `PUBLIC_BASE_URL` (env) with fallback to `X-Forwarded-Host` / `Host` headers, so the same code works in dev, preview deploys, and prod.

</important>

<important if="you are working with the Mongo connection, ltijs storage, or the shared canvas-test cluster">

`lti/provider.ts` wires ltijs to `MONGODB_URL` with `maxPoolSize: 5`, `minPoolSize: 0`, `maxIdleTimeMS: 60_000`. The default `MONGODB_URL` in dev points at a **shared `canvas-test` Atlas M0 cluster with a 500-connection cap across all envs** — do not raise the pool size, and do not run load/perf tests against it. Use a local Docker Mongo or your own Atlas project for those.

**`maxPoolSize` bounds one MongoClient, not how many exist.** That distinction caused the **2026-09-11 incident**: a `tsx watch` dev server left up for 3d20h held **657 connections** — ~219 against each of the three shard hosts, with the cap set to 5 — and tripped the cluster's limit on its own. Roughly 44 orphaned pools in a single process.

The source is `ltijs@5.9.9`, `Utils/Database.js:203-229`. It listens for `'error'` → `mongoose.disconnect()`, and for `'disconnected'` → `mongoose.connect(...)` a second later. Every reconnect builds a **fresh** MongoClient on the mongoose singleton and never closes the previous one's sockets, so each sleep/wake or network blip permanently adds up to `maxPoolSize` sockets per host. `provider.ts` therefore strips **both** listeners after `lti.deploy()` and attaches its own logging-only `'error'` handler — both parts matter, and the header comment there explains why removing either one alone is worse than the leak. `maxIdleTimeMS` is the backstop that lets any pool we still orphan drain itself.

Do not re-add a reconnect handler. The Node driver has done its own topology monitoring since 3.x; ltijs's loop predates that and only duplicates clients.

**If the Atlas connection alert fires again**, start here rather than in Atlas:

```bash
netstat -an -p tcp | awk '$5 ~ /\.27017$/ && $6=="ESTABLISHED"' | wc -l   # total
lsof -nP -iTCP:27017 -sTCP:ESTABLISHED | awk 'NR>1 {print $1, $2}' | sort | uniq -c | sort -rn
```

Steady state for one dev server is **single digits** (8 measured on a fresh boot). Anything in the hundreds from one PID is this bug or the 2026-08-30 one, and `kill -TERM <pid>` releases them.

`lti.close({ silent: true })` is called on SIGINT/SIGTERM (see `server.ts` shutdown handler) to release Atlas connections cleanly — which is why SIGTERM is the right signal above, and `kill -9` is not.

**Never `import` `lti/provider.js` statically from a module a test can reach.** `provider.ts` dials Atlas at *import* time (`lti.setup()` plus a top-level `await lti.deploy()`), so a static import opens a live connection pool the instant the module graph loads — before a single assertion runs — and the pool then prevents `node --test` from ever exiting. That is exactly how the 2026-08-30 incident happened: `dynamic-registration.ts`, `platform.ts`, and `cookieless.qa.ts` each carried a static `import { ltiProvider } from './provider.js'`, so importing them for their *pure* helpers stranded two test processes for 5 days holding 518 Atlas sockets. Guarding a `main()` with an `import.meta.url` check does **not** help — static imports execute regardless.

All three now use `const { ltiProvider } = await import('./provider.js')` at the call site instead. In production `server.ts` imports provider.js at boot, so the lazy import is a module-cache hit and behavior is unchanged. Keep it that way, and keep `--test-force-exit` as the backstop.

ltijs owns the `publickey`, `privatekey`, `platform`, `platformStatus`, `accesstoken`, `idtoken`, `contexttoken`, `nonce` collections — treat them as opaque. Our application code only writes to `lti_nonces` (see `lti/nonce-store.ts`). The post-launch `lti-claims` JWT is **not** persisted server-side; it lives in the cookie + URL token only.

</important>

<important if="you are working on the React Router app under /app or adding new authenticated routes">

The RR 7 SSR app runs in the same Express process via `@react-router/express`'s `createRequestHandler`. Routes live in `app/routes/` and are wired through `app/routes.ts`. The verified LTI claims arrive in the loader via `res.locals.token` (set by ltijs) and via the URL/cookie path resolved by `app/lib/lti-session.server.ts` — **call `getLtiToken(request)` in loaders rather than reading the cookie or URL directly**, so URL-token-wins precedence stays consistent.

If you add a new route under `/app` (or any route that must render inside Canvas), make sure the `frame-ancestors` CSP header from `server.ts:25` covers it. RR's per-route `headers()` export does not fire for thrown Responses, which is why the policy is set at the Express layer.

Dev uses Vite middleware (`vite.config.ts`); production serves the prebuilt bundle from `./build/client` and SSRs from `./build/server/index.js`. Styling is TailwindCSS 4 via `@tailwindcss/vite`.

</important>

<important if="you are building or modifying a /student/onboarding/* screen">

**Student onboarding screens follow a fixed 3-layer pattern.** Canonical reference: `app/routes/student.onboarding.privacy-intro.tsx` — read it before touching any onboarding route. The route wraps everything in `<OnboardingLayout fluid step="<step>" showProgress={false} showFooter={false} surroundClassName="bg-student-<color>">` (the surround *is* the flat background field — there is no separate background `<div>`), then renders **three explicit sibling layers, back-to-front**:

- **Layer 1 — Polygon** (`z-0`): an inline background `<svg>` of the Figma "Layer 1 Polygon" (a different shape per screen), `className="pointer-events-none absolute z-0"`, fill `var(--color-student-bg)` (`#1f1f25`). **Sizing rule is constant**: `height: 125vh`, `width: calc(125vh * <aspect>)` where `<aspect> = vectorWidth / vectorHeight`, centered with `left:50% top:50% transform:translate(-50%,-50%)` so it bleeds off the top and bottom and stays centered. Keep `preserveAspectRatio="xMidYMid meet"`.
- **Layer 2 — Content** (`z-10`, `absolute inset-0`): headings use Anton (`--font-student-display`, Figma `Title/Large` 80 or `Title/Medium` 64, letter-spacing ~1.5), body uses Barlow (`--font-student-body`), text color `--color-student-surface-cream`. Content is flex-centered and scaled by a unitless `useViewportScale()` factor (because `transform: scale()` can't take `vh`). **The back+Next CTA row is already built — reuse it verbatim, do not reinvent it**: `absolute left-1/2 -translate-x-1/2 items-center gap-3` pinned at `bottom: 64`, a 48×48 ghost back button (`bg-student-fill-secondary`, the `<BackArrow/>` glyph) + a 200×48 cream Next (`bg-student-surface-cream text-student-on-primary`). Wire Back/Next via `useOnboardingNav().goToStep(...)`.
- **Layer 3 — Progress bar** (`z-30`): reuse `<ProgressBar step="<step>" />` as-is. The percentage is derived from `ONBOARDING_STEPS_WITH_PROGRESS` in `app/components/dashboard/student/onboarding/onboarding-steps.ts` — privacy-intro 20% · avatar 40% · baseline-mood 60% · helpers 80% · trusted-person 100% (welcome has no bar). `complete` is excluded from that map but still shows a full bar via the explicit override `<ProgressBar step="complete" value={100} />`. Just pass the step (and `value` only for `complete`); never hard-code the width.

Figma assets (polygons, avatars, icons) are exported as SVGs into `app/assets/onboarding-*/` and imported **as URLs** rendered via `<img src=…>` (no SVGR). All Figma fills map to existing `--color-student-*` tokens in `app/app.css` — use the token, not the raw hex.

</important>

## Repo note

This directory has its own `.git` and is independent of the surrounding `agatha/` monorepo — the parent `agatha/CLAUDE.md` describes services that don't apply here. Do not introduce a `.git` at the `agatha/` root.

<important if="you are adding, removing, or modifying MongoDB collections, fields, or indexes owned by this service">

Document every schema change in the cross-service registry `agatha-db-schema.json` at the repo root (collection `description`, `owner_service`, `indexes`, representative `samples`). Then regenerate the Moon Modeler view:

```bash
python3 scripts/dmm/agatha_schema_to_dmm.py
```

`agatha.dmm` is **derived** — never hand-edit it. **Do NOT run `scripts/dmm/extend_schema.py`** — it is a historical one-shot seeder that re-injects collections this and other services have since moved out of `main`; it produces a schema that contradicts the post-refactor tenant model. See `scripts/dmm/README.md`.

</important>
