# Spark EQ — Canvas Install Guide for District Admins

This guide walks a Canvas administrator through installing **Spark EQ** as
an LTI 1.3 tool in a Canvas instance. The tool ships as a single hosted
service; no software is installed on Canvas servers.

Estimated time: **5 minutes.** You'll need root- or sub-account admin
access in Canvas.

---

## What you're installing

Spark EQ is an external learning tool that launches inside Canvas via the
LTI 1.3 standard. Once installed, users see a **Spark EQ** entry in:

- **Global navigation** (the left sidebar — Account, Courses, Calendar…),
  with the Spark EQ logo.
- **Course navigation** (per course), so teachers can place it inside
  individual courses.
- **Course navigation — "Spark EQ — Counselor"** (per course), a second
  course-navigation entry intended for school counselors.

All authentication is handled by Canvas's standard LTI 1.3 OIDC flow.
Spark EQ never sees a user's Canvas password.

### About the "Spark EQ — Counselor" placement

The third placement, labeled **Spark EQ — Counselor**, is meant to be
restricted (in Canvas) to a custom role such as **Counselor**. Canvas
admins control this visibility via the placement's
**Availability and Exceptions** settings — assign the placement only to
the Canvas custom role you use for counselors.

Internally, Spark EQ routes counselor users via the per-placement
`custom_fields: { lti_role: "counselor" }` claim — **not** via a
distinct URI or a separate tool registration. This means the same
`/lti/launch` endpoint handles all roles, and the counselor experience
is keyed off the `lti_role` custom field that Canvas attaches to
launches originating from that placement. If you forget to restrict
visibility on this placement, non-counselor users who click it will be
treated as counselors — so make sure the **Availability and Exceptions**
step is completed for it.

---

## Before you start

You'll need:

1. **Admin access** to the Canvas account (or sub-account) where Spark EQ
   should be available.
2. The **registration URL** Blueprint provided you. It looks like:

   ```
   https://<spark-eq-host>/lti/register
   ```

   This is the LTI 1.3 Dynamic Registration endpoint. Canvas calls it
   directly during install — you don't need to open it yourself.
3. About 5 minutes and the ability to log out + log back in once.

---

## Step 1 — Register the tool via Dynamic Registration

A *Developer Key* tells Canvas about an external tool's identity (its
launch URLs, public keys, requested scopes). With LTI Dynamic
Registration, Canvas creates the Developer Key for you in one step.

1. In Canvas, go to **Admin → Developer Keys**.
2. Click **+ Developer Key → + LTI Registration**.
   (If you only see **+ LTI Key**, your Canvas instance doesn't support
   Dynamic Registration — skip to the
   [Fallback: manual install](#fallback-manual-install-older-canvas-versions-or-restricted-instances)
   section below.)
3. Paste the registration URL Blueprint gave you:

   ```
   https://<spark-eq-host>/lti/register
   ```

4. Click **Continue**. Canvas opens a registration dialog that talks to
   Spark EQ behind the scenes, then shows you the requested scopes and
   placements (course navigation + global navigation).
5. Review the scopes and click **Install** / **Enable**. The dialog
   closes automatically when registration succeeds.
6. Back on the Developer Keys list, find the new **Spark EQ** key and
   confirm its **State** column is set to **ON**. (Canvas usually does
   this for you on Dynamic Registration; toggle it on if not.)

---

## Step 2 — Make Spark EQ available in your account

Some Canvas instances install Dynamic-Registration tools with their
**Availability** defaulting to "Not Available" for the root account.
You need to flip this once, per install.

1. Go to **Admin → Settings → Apps tab → View App Configurations**.
   You should see **Spark EQ** in the list.
2. Click into **Spark EQ** to open its detail view, then go to the
   **Availability and Exceptions** tab.
3. On the root-account row, look at the **Availability** column. If it
   reads **Not Available**, click the pencil icon next to it.
4. Set it to **Available** and save.

> If your Canvas instance defaults new Dynamic-Registration tools to
> **Available** already, skip this step — you'll see the icon in global
> nav as soon as you reload (Step 3).

---

## Step 3 — Log out and log back in

Canvas computes the global-navigation sidebar at login time. To pick up
Spark EQ:

1. **Log out** of Canvas.
2. **Log back in** as the same admin (or as any user in the account).
3. The left **global navigation** should now show a **Spark EQ** entry
   with the Spark EQ logo below History/Inbox.

Tell your end users (teachers and students) to log out and log back in
once after the install so the new nav item appears for them too.

---

## Step 4 — Verify the install

1. In the left **global navigation**, click the **Spark EQ**
   logo. Canvas should open Spark EQ inside the Canvas
   chrome (no new tab). The first launch may take a few seconds while
   keys are exchanged.
2. If you see "Canvas launch successful" with your name, role, and
   course context listed, the install is working.
3. (Optional) Open any course → **Course Navigation** → confirm
   **Spark EQ** is also listed there. Teachers can enable/disable it
   per course from **Course Settings → Navigation**.

---

## Optional polish — Selected-tab highlight

Canvas does not, by default, paint the white "selected" pill on global-nav
**LTI tools** the way it does for built-in items like Courses or
Calendar. This is a Canvas-side cosmetic limitation that affects all LTI
tools, not Spark EQ specifically. Most institutions live with it.

If you want the selected highlight, add this short JavaScript shim via
**Admin → Themes → Edit theme → Upload**:

```js
(function () {
  function applyExternalToolActive() {
    var m = window.location.pathname.match(
      /^\/(?:accounts|courses)\/\d+\/external_tools\/(\d+)/
    );
    if (!m) return;
    var li = document.getElementById(
      'context_external_tool_' + m[1] + '_menu_item'
    );
    if (!li) return;
    document
      .querySelectorAll('#menu .ic-app-header__menu-list-item--active')
      .forEach(function (el) {
        el.classList.remove('ic-app-header__menu-list-item--active');
        el.removeAttribute('aria-current');
      });
    li.classList.add('ic-app-header__menu-list-item--active');
    li.setAttribute('aria-current', 'page');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyExternalToolActive);
  } else {
    applyExternalToolActive();
  }
})();
```

Save it as `global-nav-active.js`, upload, and apply the theme. The same
shim improves selected-state for any LTI tool placed in global nav, not
just Spark EQ.

> Some Canvas plans disable custom Theme JS. If yours does, skip this
> step — the tool still works, you just won't see the white pill on the
> selected nav item.

---

## Troubleshooting

### Registration dialog hangs or never closes

Canvas opened the registration dialog but it spins forever, or closes
without creating a Developer Key.

- Confirm Spark EQ's `PUBLIC_BASE_URL` env var matches the host you're
  pasting (Blueprint sets this; if you're self-hosting, double-check).
- Confirm the registration URL is reachable from the public internet
  (open it in an incognito tab — you should see a 400 about missing
  `openid_configuration`, *not* a 404 or 502).
- Ask Blueprint support to check the server logs for the registration
  POST and the response Canvas got back.

### Tool shows installed but the icon doesn't appear in global nav

Spark EQ is listed under **Settings → Apps**, but the Spark EQ logo
never appears in the left sidebar.

- Confirm Step 2: **Account → Apps → Spark EQ → Availability and
  Exceptions** shows **Available**, not "Not Available". Some Canvas
  instances default new Dynamic-Registration deployments to "Not
  Available" on the root account.
- Then log out + log back in (Step 3). Global navigation is computed at
  login time; the icon won't appear mid-session.

### Developer Key list shows a broken-image placeholder for the Spark EQ logo

The icon failed to load when Canvas built the Developer Keys list.

- Confirm Spark EQ serves `/icon.png` (open
  `https://<spark-eq-host>/icon.png` in a tab — you should see the Spark
  EQ logo).
- If 404, contact Blueprint support — the deploy is missing
  `public/icon.png`.

### "MISSING_VALIDATION_COOKIE" on launch (Safari users)

Spark EQ implements the spec's **cookieless OIDC + Platform Storage**
flow specifically to avoid this. If a user reports it, please send us:

- Their browser + version
- Whether the tool was launched from global nav or course nav
- The full URL from the address bar at the moment of failure

This almost always indicates a mis-installed Developer Key or an outdated
tool installation that pre-dates the cookieless rollout — re-running the
install (delete the Developer Key + Spark EQ app, then redo Step 1)
usually resolves it.

### The tool launches but says "401 / unauthenticated"

The Developer Key is enabled but the tool installation in your account
is stale. Uninstall the app under **Settings → Apps** and redo Step 1.

### Other issues

Contact Blueprint support and include:

- Your Canvas instance URL.
- The Spark EQ Developer Key ID (from **Admin → Developer Keys**).
- A screenshot or screen recording of the issue.
- Browser + OS.

---

## Fallback: manual install (older Canvas versions or restricted instances)

If your Canvas instance does not offer **+ LTI Registration** in the
Developer Keys page (only **+ LTI Key**), or your Canvas plan disables
Dynamic Registration, use this manual flow instead. It produces the same
result — the dynamic-registration flow above is just a one-paste
shortcut for it.

You'll need the **tool configuration URL** Blueprint gave you:

```
https://<spark-eq-host>/lti-config.json
```

### Step 1 (fallback) — Create the Developer Key by pasting JSON

1. In Canvas, go to **Admin → Developer Keys**.
2. Click **+ Developer Key → + LTI Key**.
3. In the **Configure** panel:
   - **Method**: choose **Paste JSON**.
   - **Key Name**: `Spark EQ` (anything descriptive).
   - **Owner Email**: your admin email.
   - **JSON**: open the configuration URL Blueprint gave you in another
     tab, copy the **entire JSON response**, and paste it here.

   > Some Canvas versions also offer a **URL** option in the Method
   > dropdown. If yours does, you can paste the configuration URL
   > directly instead of copying the JSON.
4. Click **Save**.
5. Back on the Developer Keys list, find the new key and toggle its
   **State** column to **ON**.
6. Copy the **Details → Client ID** (a 16-19 digit number). You'll need
   it next.

### Step 2 (fallback) — Install the tool by Client ID

1. Go to **Admin → Settings → Apps tab → View App Configurations**.
2. Click **+ App**.
3. In the **Add App** dialog:
   - **Configuration Type**: **By Client ID**.
   - **Client ID**: paste the Client ID you copied above.
4. Click **Submit**, then confirm by clicking **Install** on the
   "Tool found" prompt.

You should now see **Spark EQ** in the app list with a green check.

### Step 3 (fallback) — Availability + log out / in

If your Canvas instance defaults the new app to "Not Available", follow
Step 2 and Step 3 of the primary flow above (Availability and
Exceptions, then log out + log back in).

> Fallback troubleshooting tip: if the global-nav entry shows no logo at
> all, the Developer Key was likely created with **Method: Manual Entry**
> and the global_navigation placement's **Icon Url** field was left
> blank. Either fill it in with `https://<spark-eq-host>/icon.png` or
> re-create the key with **Paste JSON**.

---

## What Spark EQ stores

For transparency:

- Spark EQ stores **no** Canvas passwords (it never sees them — Canvas
  signs an LTI launch token instead).
- Spark EQ persists the launching user's LTI subject ID, name, email,
  course context, and roles for the duration of their session.
- See Blueprint's privacy notice for full data handling details.

---

## Updating

Spark EQ deploys are transparent to your Canvas install — you do not
need to re-run any of the above when Blueprint ships updates. The
hosted configuration URL is stable, and Canvas re-fetches the JWKS from
`/.well-known/jwks.json` automatically.

You only need to revisit this guide if Blueprint notifies you of a
**breaking placement change** (rare; we'll email you in advance).
