# Canvas Install Methods for Spark EQ

There are three ways a Canvas administrator can install an LTI 1.3 tool
like Spark EQ. They differ in **friction for the admin**, **work required
from us (Blueprint)**, and **how much of the placement config we control**.

This doc is an internal reference — for the end-user district guide, see
[`../INSTALL.md`](../INSTALL.md).

## At a glance

| Method                          | Admin friction | Our effort                                  | Placement fidelity     | Status                |
| ------------------------------- | -------------- | ------------------------------------------- | ---------------------- | --------------------- |
| 1. Edu App Center (search-by-name) | One click       | Submit + get approved by Instructure        | Full (we author config) | Not yet submitted     |
| 2. Dynamic Registration         | Paste one URL   | Custom `/lti/register` handler (shipped)    | Full (we author body)  | **Live** — primary install path; see [`../INSTALL.md`](../INSTALL.md) |
| 3. Manual Developer Key + JSON  | Paste JSON, install by Client ID | Done                          | Full (we author JSON)  | Live — fallback for older Canvas versions / restricted instances |

---

## Method 1 — Edu App Center (search by name)

The Canvas-native catalog. Admins go to **Settings → Apps → + App → "By
Name"**, type "Spark EQ", click Install. Zero JSON, zero URLs.

### How it works

Instructure runs a public app catalog at <https://www.eduappcenter.com/>.
Apps listed there appear in Canvas's in-product search. The catalog entry
itself wraps either a Dynamic Registration URL or a static JSON config —
so this method *layers on top of* one of the other two; it doesn't bypass
LTI install entirely. The admin just doesn't see the underlying URL.

### What we'd need to do

- Submit Spark EQ to Instructure via the partner program / app catalog
  submission process. Requires:
  - Production hosting (not a Railway preview URL)
  - Privacy policy URL
  - Terms of service URL
  - Support contact
  - Screenshots, descriptions
  - Working Dynamic Registration **or** stable JSON config URL
- Pass Instructure's review (security, quality, UX). Timeline measured in
  weeks, not days.

### When this is the right choice

End-state for productized rollout. Until Spark EQ is past pilot stage and
has the policy / support surface ready, this is premature.

---

## Method 2 — Dynamic Registration

The LTI 1.3 spec's "paste one URL, Canvas handles the rest" flow. Admin
goes to **Admin → Developer Keys → + LTI Registration**, pastes a single
URL (`https://<host>/lti/register`), confirms scopes, done. Canvas
auto-creates the Developer Key, fetches the tool's config, exchanges
keys, and installs.

### How it works

`ltijs` ships a `DynamicRegistration` service that responds to the
registration endpoint with a config payload. Canvas POSTs an OpenID
configuration discovery URL + a registration token; `ltijs` returns a
client registration response; Canvas creates the Developer Key on the
spot.

### Status today

**Live — primary install path.** We ship a custom `/lti/register`
handler (`lti/dynamic-registration.ts`) registered on the bare Express
app before `app.use(lti.app)`, mirroring the override pattern in
`lti/cookieless.ts`. The handler builds the LTI 1.3 Dynamic Registration
client metadata body from `buildToolConfig(...)` (`lti/tool-config.ts`)
so placement fidelity (icon_svg_path_64, course_navigation,
global_navigation) matches `/lti-config.json` exactly. Persistence
hooks `ltiProvider.registerPlatform(...)` so a freshly-registered Canvas
instance can launch immediately.

We continue to set `dynRegRoute: '/lti/register'` on `lti.setup()` so
ltijs's auth whitelist keeps the path open; we do **not** set the
`dynReg` config object — that would activate ltijs's own DR service and
collide with our handler.

### Post-install: Availability + login refresh

Registration alone doesn't make the tool visible. After Canvas
confirms the install, the admin must still:

1. Flip the tool's **Availability** from "Not Available" to
   "Available" at the root account (Admin → Settings → Apps →
   View App Configurations → Spark EQ → Availability and
   Exceptions). Direct URL: `/accounts/<id>/apps/manage`.
2. Log out + log back in (global nav is computed at login).

Both steps are walked through in [`../INSTALL.md`](../INSTALL.md)
Steps 2 and 3.

### When this is the right choice

The default install today. One paste, full placement fidelity. Method 3
remains a fallback for Canvas instances that don't expose **+ LTI
Registration** in Developer Keys.

---

## Method 3 — Manual Developer Key + JSON paste

Admin creates a Developer Key by pasting our config JSON, copies the
Client ID, then installs the app *By Client ID*. Two screens, one paste,
one copy.

### How it works

Documented end-to-end in [`../INSTALL.md`](../INSTALL.md). Works on every
Canvas version, including instances that disable Dynamic Registration or
restrict the App Center.

### Status today

**Live — fallback.** The hosted config is served at:

```
GET /lti-config.json
```

…implemented in `lti/config-json.ts`. URLs in the response are derived
from `PUBLIC_BASE_URL` (env), with `X-Forwarded-Host` / `Host` fallback,
so the same code works in dev, preview, and prod.

#### Example payload

The shape returned by `GET /lti-config.json` (host substituted for
illustration — the live response uses your deployment's host):

```json
{
  "title": "Spark EQ",
  "description": "Spark EQ — Blueprint LTI 1.3 tool for Canvas.",
  "target_link_uri": "https://<host>/lti/launch",
  "oidc_initiation_url": "https://<host>/lti/login",
  "oidc_initiation_urls": {},
  "redirect_uris": ["https://<host>/lti/launch"],
  "public_jwk_url": "https://<host>/.well-known/jwks.json",
  "public_jwk": null,
  "custom_fields": {},
  "scopes": [],
  "extensions": [
    {
      "domain": "",
      "tool_id": "",
      "privacy_level": "public",
      "platform": "canvas.instructure.com",
      "settings": {
        "platform": "canvas.instructure.com",
        "placements": [
          {
            "text": "Spark EQ",
            "placement": "course_navigation",
            "message_type": "LtiResourceLinkRequest",
            "target_link_uri": "https://<host>/lti/launch"
          },
          {
            "text": "Spark EQ",
            "icon_url": "https://<host>/icon.png",
            "placement": "global_navigation",
            "message_type": "LtiResourceLinkRequest",
            "target_link_uri": "https://<host>/lti/launch"
          }
        ]
      }
    }
  ]
}
```

```json

{
  "title": "Spark EQ",
  "description": "Spark EQ — Blueprint LTI 1.3 tool for Canvas.",
  "target_link_uri": "https://canvas-lti-test.up.railway.app/lti/launch",
  "oidc_initiation_url": "https://canvas-lti-test.up.railway.app/lti/login",
  "oidc_initiation_urls": {},
  "redirect_uris": ["https://canvas-lti-test.up.railway.app/lti/launch"],
  "public_jwk_url": "https://canvas-lti-test.up.railway.app/.well-known/jwks.json",
  "public_jwk": null,
  "custom_fields": {},
  "scopes": [],
  "extensions": [
    {
      "domain": "",
      "tool_id": "",
      "privacy_level": "public",
      "platform": "canvas.instructure.com",
      "settings": {
        "platform": "canvas.instructure.com",
        "placements": [
          {
            "text": "Spark EQ",
            "placement": "course_navigation",
            "message_type": "LtiResourceLinkRequest",
            "target_link_uri": "https://canvas-lti-test.up.railway.app/lti/launch"
          },
          {
            "text": "Spark EQ",
            "icon_url": "https://canvas-lti-test.up.railway.app/icon.png",
            "placement": "global_navigation",
            "message_type": "LtiResourceLinkRequest",
            "target_link_uri": "https://canvas-lti-test.up.railway.app/lti/launch"
          }
        ]
      }
    }
  ]
}
```

The single source of truth for this shape is `buildToolConfig(baseUrl)`
in `lti/tool-config.ts`, shared with Method 2's `/lti/register` handler.

### Post-install: Availability + login refresh

Same as Method 2 — after the *Install by Client ID* step, the admin
must flip **Availability** to "Available" at `/accounts/<id>/apps/manage`
(Spark EQ → Availability and Exceptions) and log out + log back in
before the global-nav icon appears. Walked through in
[`../INSTALL.md`](../INSTALL.md) Step 3 (fallback).

### When this is the right choice

- Pilot phase, before Method 2 is verified.
- Districts with stricter Canvas configurations that block Dynamic
  Registration or the App Center.
- As the documented fallback once Method 2 is the default.

---

## Recommended rollout order

1. ~~**Today**: Method 3 only. Done. Documented in `INSTALL.md`.~~ ✓ done.
2. ~~**Next sprint**: enable Method 2.~~ ✓ done — custom `/lti/register`
   handler shipped, `INSTALL.md` now leads with it; Method 3 retained
   as fallback.
3. **When productized**: submit to Edu App Center (Method 1). Update
   `INSTALL.md` to lead with "search Spark EQ in your Canvas app
   catalog," keep Methods 2 and 3 as fallbacks. Status: submit when
   productized.
