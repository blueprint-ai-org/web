# lti-server-test

A minimum-viable **LTI 1.3 tool** that launches inside Canvas (Instructure)
and hands off to a small React Router app once the launch is verified. It
implements the **Cookieless OIDC + Platform Storage** flow so embedded
launches work in Safari (ITP) and Firefox (Strict ETP), where the legacy
third-party-cookie OIDC flow silently fails.

The server is built on [`ltijs`](https://github.com/Cvmcosta/ltijs) for the
boilerplate (JWKS, dynamic registration, MongoDB key persistence) and
overrides only the OIDC login/launch routes. Post-launch UI is rendered
by [React Router 7](https://reactrouter.com/) in SSR mode, sharing the
same Express process.

---

## Project layout

```
lti-server-test/
├── server.ts             # Express entrypoint — wires LTI + React Router
├── lti/
│   ├── provider.ts             # ltijs setup, Mongo connection, platform registration
│   ├── cookieless.ts           # Our cookieless OIDC handlers (login/launch/validate)
│   ├── dynamic-registration.ts # Our /lti/register handler (LTI 1.3 Dynamic Registration)
│   ├── tool-config.ts          # Shared placement builder (used by /lti-config.json + /lti/register)
│   ├── config-json.ts          # /lti-config.json handler (manual-paste install fallback)
│   ├── nonce-store.ts          # Mongo-backed TTL store for cookieless nonces
│   ├── session.ts              # Signs the post-launch `lti-claims` JWT
│   ├── verify.ts               # id_token verification via Canvas JWKS
│   ├── platform.ts             # Platform lookup helpers
│   └── templates/              # HTML returned to Canvas (postMessage bridges)
├── app/                  # React Router 7 app (renders /app post-launch)
│   ├── root.tsx
│   ├── routes.ts
│   └── routes/{_index,app,home}.tsx
├── scripts/
│   ├── check-mongo.ts          # Verify MONGODB_URL is reachable
│   └── get-lti-token.harness.ts
├── Dockerfile
├── react-router.config.ts
└── vite.config.ts
```

`server.ts` is the only entrypoint — it mounts our cookieless handlers
*before* `app.use(lti.app)` so they win for `/lti/login` and `/lti/launch`,
then falls through to ltijs for the legacy cookie flow and for endpoints
ltijs owns (JWKS, dynamic registration).

---

## Getting started

### Prerequisites

- Node 20+
- A reachable MongoDB instance (local Docker or Atlas — ltijs uses it for
  RSA key persistence and platform registration; we also use it for nonce
  storage, see below)
- A Canvas instance with a Developer Key whose `Client ID` you can hand
  to this server

### Environment variables

Create a `.env` file in this directory:

| Variable           | Required | Purpose                                                                 |
| ------------------ | -------- | ----------------------------------------------------------------------- |
| `LTI_KEY`          | yes      | Symmetric secret. Used by ltijs internally and to sign the `lti-claims` JWT. |
| `MONGODB_URL`      | yes      | Mongo connection string. ltijs persists keys here; we add a `lti_nonces` collection. **This is the shared `canvas-test` Atlas M0 cluster (500-connection cap). Use a local Docker Mongo or your own Atlas project for any load/perf testing — the shared cluster is for LTI integration testing only.** |
| `CANVAS_ISSUER`    | yes      | Canvas issuer URL, e.g. `https://canvas.instructure.com`.               |
| `CANVAS_CLIENT_ID` | no       | Developer Key client ID. If set, the platform is auto-registered on boot. |
| `PUBLIC_BASE_URL`  | no       | Base URL embedded in `/lti-config.json` (e.g. `https://canvas-lti-test.up.railway.app`). Falls back to the inbound request's `X-Forwarded-Host` / `Host` header. |
| `LTI_REGISTRATION_SECRET` | no*      | Shared secret required by `GET /lti/register`. Admins paste `…/lti/register?registration_secret=<value>`. **Unset ⇒ dynamic registration is disabled (503)** — required if you want the DR install path at all. |
| `LTI_REGISTRATION_ALLOWED_HOSTS` | no | Comma-separated hosts allowed as the `openid_configuration` / `registration_endpoint` fetch target (suffix-matched, https only). Defaults to `instructure.com`, `canvaslms.com` and the `CANVAS_ISSUER` host. |
| `LTI_ALLOWED_DEPLOYMENT_IDS` | no | Comma-separated `deployment_id` allowlist enforced at `/lti/validate`. Unset ⇒ any non-empty id. Pin it in production. |
| `SERVER_HTTP_PORT` | no       | Defaults to `3000`.                                                     |
| `NODE_ENV`         | no       | `development` enables ltijs `devMode` and Vite middleware HMR.          |

### Install & run

```bash
npm install
npm run dev      # tsx watch + Vite middleware HMR on :3000
```

Sanity-check the Mongo connection:

```bash
npx tsx scripts/check-mongo.ts
```

### Production build

```bash
npm run build    # react-router build → ./build/{client,server}
npm start        # tsx server.ts (no watch)
```

### Docker

```bash
docker build -t lti-server-test .
docker run -p 3000:3000 --env-file .env lti-server-test
```

---

## Hosted tool configuration

The server exposes two install paths:

```
GET /lti/register      # LTI 1.3 Dynamic Registration (recommended)
GET /lti-config.json   # Static tool config JSON (manual-paste fallback)
```

- **`/lti/register`** is the LTI 1.3 Dynamic Registration endpoint. A
  Canvas admin pastes this URL into **Developer Keys → + LTI
  Registration** and Canvas creates the Developer Key automatically with
  our exact placements. Implemented in `lti/dynamic-registration.ts`,
  registered before `app.use(lti.app)` so it wins over ltijs's stub.
- **`/lti-config.json`** is the same placement payload as a static JSON
  document, for older Canvas instances that don't offer Dynamic
  Registration. Implemented in `lti/config-json.ts`. Both endpoints
  share their placement shape via `lti/tool-config.ts` so they cannot
  drift.

URLs in both responses are derived at request time from
`PUBLIC_BASE_URL` (env), falling back to the inbound request's host
headers — so the same code works in dev, preview deploys, and prod
without per-environment edits.

End-user install steps for districts live in [`INSTALL.md`](./INSTALL.md).
For the broader picture of how Canvas tools can be installed (App Center
search, Dynamic Registration, manual JSON paste) and where Spark EQ
stands on each, see [`docs/install-methods.md`](./docs/install-methods.md).

## How it's used

1. **Register the tool in Canvas.** Either point Canvas's dynamic
   registration UI at `POST /lti/register`, or configure a Developer Key
   manually with these endpoints:
   - Target Link URI: `https://<host>/lti/launch`
   - OIDC Initiation URL: `https://<host>/lti/login`
   - JWKS URL: `https://<host>/.well-known/jwks.json`
2. **Set `CANVAS_CLIENT_ID`** in the environment so `provider.ts` can
   `lti.registerPlatform(...)` on startup. Without this the tool will
   accept launches but cannot mint outbound platform tokens (e.g. Names &
   Roles, AGS).
3. **Launch from Canvas.** Course nav, assignment, or deep-link
   placements all hit `/lti/login` → `/lti/launch` → `/lti/validate` →
   `302 /app?lti_session=<jwt>`. The React Router `/app` route reads the
   JWT from the URL, scrubs it from history, and renders the post-launch
   UI.

---

## What we send to MongoDB

The Mongo database backs **two distinct concerns**:

### 1. ltijs-managed collections (we don't touch these)

`lti.setup(LTI_KEY, { url: MONGODB_URL }, ...)` in `lti/provider.ts` hands
the connection to ltijs, which manages:

- **`publickey` / `privatekey`** — the RSA keypair this tool advertises
  via `/.well-known/jwks.json`. Generated on first boot, persisted so
  restarts don't invalidate Canvas's cached JWKS.
- **`platform`** — registered Canvas platforms (issuer, client_id, auth
  endpoints, JWK_SET URL). Populated by `lti.registerPlatform(...)` on
  startup or by dynamic registration.
- **`platformStatus`**, **`accesstoken`**, **`idtoken`**,
  **`contexttoken`**, **`nonce`** (ltijs's own nonce collection for the
  legacy cookie flow), and a few internal bookkeeping collections.

These are ltijs implementation details. Treat them as opaque — see
[ltijs docs](https://cvmcosta.me/ltijs/#/) for the schema.

### 2. Our `lti_nonces` collection (cookieless flow)

`lti/nonce-store.ts` writes a small document for each cookieless OIDC
login:

```ts
{
  nonce: string,    // opaque random value
  state: string,    // OIDC state parameter
  createdAt: Date   // TTL anchor
}
```

Indexes:

- `{ nonce: 1, state: 1 }` unique
- `{ createdAt: 1 }` with `expireAfterSeconds: 120` — Mongo's TTL monitor
  deletes the doc ~2 minutes after creation if it isn't consumed first.

Lifecycle:

1. `POST /lti/login` (cookieless) generates `(nonce, state)`, calls
   `saveNonce` → `upsert` into `lti_nonces`.
2. Canvas round-trips the values via `lti.put_data` / `lti.get_data` in
   its per-origin platform store.
3. `POST /lti/validate` calls `consumeNonce`, which `findOneAndDelete`s
   the record. First call wins (replay protection); any later call with
   the same pair returns `false`.

We use Mongo (rather than an in-memory `Map`) so the flow survives
multi-instance deploys behind a load balancer and so a TTL is enforced
even if the user closes the tab between login and launch.

Nothing else is written by application code. The post-launch
`lti-claims` JWT lives in a cookie + URL token; it is **not** persisted
server-side.

---

## How LTI launches work

This tool implements **LTI 1.3 Cookieless OIDC Login** (`lti-cs-oidc/v0p1`)
backed by Canvas's **Platform Storage** postMessage protocol
(`lti-pm-s/v0p1`). We bypass `ltijs`'s built-in cookie-based `/lti/login`
and `/lti/launch` handlers because Safari ITP — and increasingly other
browsers' privacy modes — block the third-party state cookie those
handlers rely on, breaking embedded Canvas iframe launches.

`ltijs` is still mounted: it owns the JWKS endpoint, dynamic registration,
and key persistence in MongoDB. We only override OIDC login + launch.

### Two launch paths

| Path           | When                                                 | Who handles it                       |
| -------------- | ---------------------------------------------------- | ------------------------------------ |
| **Cookieless** | Default. Canvas always sends `lti_storage_target`.   | Our handlers in `lti/cookieless.ts`  |
| **Cookie**     | Legacy fallback when `lti_storage_target` is absent. | `ltijs` (unmodified)                 |

Our handlers detect the cookieless case and serve it directly. When
`lti_storage_target` is missing, the handler calls `next()` and Express
falls through to `app.use(lti.app)`, which runs ltijs's classic cookie
flow.

### Handlers we own

- `POST /lti/login` — Cookieless OIDC initiation. Generates `state` +
  `nonce`, persists `nonce` server-side (**120s** TTL in Mongo —
  `lti/nonce-store.ts:11` `DEFAULT_TTL_SECONDS = 120`, matching the index
  described above; this line used to say 60s and contradicted it), returns HTML
  that posts the `nonce` into Canvas's platform store via `lti.put_data`,
  then auto-form-POSTs the OIDC auth request to Canvas.
- `POST /lti/launch` — Receives Canvas's `id_token` POST. Returns HTML
  that retrieves the stored `nonce` from platform storage via
  `lti.get_data`, then form-POSTs `(state, id_token, retrieved_nonce)`
  to `/lti/validate`.
- `POST /lti/validate` — Internal endpoint. Consumes the nonce, verifies
  the `id_token` against Canvas's JWKS via `jose`, signs the `lti-claims`
  cookie, and `302`s to `/app`.

### Handlers ltijs owns

- `GET /.well-known/jwks.json` — public JWKS for Canvas to verify our
  outbound JWTs.
- `POST /lti/register` — dynamic registration endpoint.
- `POST /lti/login`, `POST /lti/launch` — fallbacks when our cookieless
  handlers call `next()`.

### Cookieless flow (sequence)

```mermaid
sequenceDiagram
    participant Canvas
    participant Tool as Tool (this server)
    participant Store as Canvas Platform Store
    Canvas->>Tool: POST /lti/login (login_hint, lti_storage_target)
    Tool-->>Canvas: HTML (lti.put_data nonce -> Store; auto-POST auth req)
    Canvas->>Tool: POST /lti/launch (id_token)
    Tool-->>Canvas: HTML (lti.get_data nonce <- Store; POST /lti/validate)
    Tool->>Tool: verify id_token via jose + JWKS; set lti-claims cookie; 302 /app
```

### Post-launch session: URL token (Safari ITP-safe)

After `/lti/validate` verifies the `id_token`, it signs an HS256
`lti-claims` JWT (1h TTL) and **both** sets the legacy `lti-claims`
cookie and embeds the same JWT in the redirect target as
`/app?lti_session=<jwt>`. `/app`'s loader prefers the URL token over the
cookie, so a fresh launch always wins over a stale cookie. On first
render, a small `useEffect` calls `history.replaceState({}, '', '/app')`
to scrub the JWT from the visible URL and from any future
`history.back()` entry.

This exists because Safari ITP (and Firefox Strict ETP) silently drop
the `lti-claims` cookie in iframe context — the same third-party-cookie
problem that motivated cookieless OIDC, but for the post-launch session.
The cookie path is kept as a bonus for browsers that accept it (Chrome).

**Caveat — log leakage**: the JWT briefly appears in Railway / Cloudflare
edge logs for the `/app?lti_session=...` request. Mitigated by the JWT's
1h TTL and HTTPS-only transport. If logs become a real concern, switch
to a session-id-in-URL design where the URL contains an opaque ID and
the JWT lives in Mongo.

### Why this design exists

Canvas iframe launches in Safari (default ITP) fail with
`MISSING_VALIDATION_COOKIE` because the third-party state cookie ltijs
sets during OIDC is blocked. Canvas's recommended workaround is a
top-level new-tab launch — which breaks the embedded UX. Cookieless OIDC
+ Platform Storage is the spec-blessed answer: state/nonce live in
Canvas's per-origin postMessage store instead of in a third-party cookie
on our origin.

### Regression sentinel

Any change touching `lti/cookieless.ts`, `lti/verify.ts`,
`lti/templates/*.html`, or the LTI route order in `server.ts` **must
re-run TC-3 (Safari course-nav launch)** from the QA doc before merge:

- QA doc: [`../thoughts/sergio/qa/2026-05-04-lti-cookieless-launch.md`](../thoughts/sergio/qa/2026-05-04-lti-cookieless-launch.md)

TC-3 is the canary that proves Platform Storage / postMessage is wired
correctly. If it fails, do not merge — Safari users will silently hit
`MISSING_VALIDATION_COOKIE`.

### References

- Plan: [`../thoughts/sergio/plans/2026-05-04-lti-platform-storage-cookieless.md`](../thoughts/sergio/plans/2026-05-04-lti-platform-storage-cookieless.md)
- Research: [`../thoughts/sergio/research/2026-05-04-lti-platform-storage-cookieless-flow.md`](../thoughts/sergio/research/2026-05-04-lti-platform-storage-cookieless-flow.md)
- Original MVP plan: [`../thoughts/sergio/plans/2026-04-25-lti-server-test-mvp.md`](../thoughts/sergio/plans/2026-04-25-lti-server-test-mvp.md)
- LTI postMessage Storage spec: https://www.imsglobal.org/spec/lti-pm-s/v0p1
- LTI Cookieless OIDC spec: https://www.imsglobal.org/spec/lti-cs-oidc/v0p1
- Canvas postMessage doc: https://www.canvas.instructure.com/doc/api/file.lti_window_post_message.html

---

## React Router (post-launch UI)

The `/app` route — and anything we add under it — is a standard
**React Router 7** SSR app. It runs in the same Express process as the
LTI server via `@react-router/express`'s `createRequestHandler`, sharing
the request context so the loader can read the verified LTI claims out
of `res.locals.token`.

What's worth knowing:

- **Routes** live under `app/routes/` and are wired in `app/routes.ts`.
  `_index.tsx` handles `/`, `app.tsx` handles `/app`.
- **Dev mode** uses Vite middleware (`vite.config.ts`) for HMR; in
  production we serve the prebuilt bundle from `./build/client` and SSR
  from `./build/server/index.js`.
- **Iframe embedding**: `server.ts` sets
  `Content-Security-Policy: frame-ancestors https://*.instructure.com`
  on `/app` at the Express layer because RR's per-route `headers()`
  export is not invoked for thrown Responses (e.g. an unauthenticated
  401 from the loader).
- **Session read**: `app/lib/lti-session.server.ts` (the loader helper)
  prefers the `?lti_session=` URL token over the `lti-claims` cookie —
  see "Post-launch session" above.
- **Styling**: TailwindCSS 4 via `@tailwindcss/vite`.

For everything else, the React Router 7 docs apply unchanged:
<https://reactrouter.com/>.
