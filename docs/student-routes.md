# Student routes — URL contract

Route map for the migrated student flow (prototype → React Router v7). Every
prototype page from `blueprint-prototype-main` is a registered route under
`/student/*`, mirrored for LTI-less QA under `/preview/student/*`.

**Status**: Phase 3 registers every route as a **stub** (a `StagePlaceholder`
inside a `StudentStage`) with the loader/clientLoader/action **seams** in place.
Real screens land in later phases (see the "Fill phase" column). This doc is the
contract future backend-wiring sessions read to know which loader/action each
route owns and which `bp_*` storage keys it touches.

## Conventions

- **Two mounts.** Each route exists at `/student/<path>` (LTI, gated by
  `_persona.tsx`) and `/preview/student/<path>` (dev-only, `_preview.tsx` 404s in
  production). Navigation is mount-agnostic (`useStudentNavBase`,
  `useOnboardingNav` derive the base from the current location).
- **Stage vs full-bleed.**
  - *Stage pages* (the six sidebar-bearing hub destinations) sit under the
    `student._app` grouping layout and render the in-canvas `Sidebar`.
  - *Full-bleed pages* are flat **sibling** `route(...)` entries **outside**
    `student._app` (multi-segment paths like `journal/past-notes`). The page
    module renders the screen directly — it has no `<Outlet/>`.
- **Loader/clientLoader/action seam** (per RR7 route-module docs — first
  `clientLoader` usage in this repo):
  - `loader` — server; returns `null`. The future backend-endpoint seam.
  - `clientLoader` (+ `clientLoader.hydrate = true` + `HydrateFallback`) — reads
    `bp_*` state through the `studentStorage` adapter (`app/lib/student/storage.ts`)
    for pages that need storage. Backend sessions swap the adapter internals (or
    move the read to `serverLoader`) key-by-key without touching screens.
  - `action` — server; returns `null`. Present only on pages the prototype
    writes data from (the future write seam).
- **Preview mirrors.** Stage pages reuse the LTI module with an explicit route
  `id`; the index is a separate module (`preview.student._index.tsx`); full-bleed
  pages are re-export modules (`export { default }` + `export *`) that carry the
  LTI module's full export set (component + loader/clientLoader/action/
  HydrateFallback/meta).

## Route table

| Path (`/student/…`) | Prototype source | Query params | Kind | `loader` | `clientLoader` reads | `action` | Fill phase |
|---|---|---|---|---|---|---|---|
| `` (index) | `today.html` | — | stage | stub | sparks, today_sections, mood_emotions, tour_done | — | 6 |
| `journal` | `journal.html` | `?demo`, `?wt` | stage | stub | mood_emotions, journal_notes, write_text (session) | stub | 8 |
| `toolkit` | `my-toolkit.html` | `?tab`, `?explore`, `?reset`, `?preview` | stage | stub | video_watched, saved | stub | 9 |
| `journey` | `journey.html` | `?from` | stage | stub | today_sections, mood_emotions | — | 10 |
| `school` | `grades.html` | `?tab` | stage | stub | grades_note, saved | stub | 12 |
| `sparks` | `sparks.html` | `?back` | stage | stub | sparks, today_sections | stub | 11 |
| `mood-checkin` | `mood-checkin.html` | `?edit` | full-bleed | stub | mood_emotions, mood_reasons | stub | 5 |
| `summary` | `summary.html` | — | full-bleed | stub | today_sections, mood_*, wins_note, write_text, about_emoji | — | 7 |
| `journal/past-notes` | `journal-past-notes.html` | — | full-bleed | stub | — | — | 8 |
| `journal/question` | `journal-question.html` | `?q` (1\|2) | full-bleed | stub | journal_q1, journal_q2 | stub | 8 |
| `write-it-out` | `write-it-out.html` | — | full-bleed | stub | write_text | stub | 7 |
| `notice-wins` | `notice-wins.html` | — | full-bleed | stub | wins_note, wins_question | stub | 7 |
| `all-about-you` | `all-about-you.html` | — | full-bleed | stub | about_emoji | stub | 7 |
| `completed` | `completed.html` | `?card`, `?from` | full-bleed | stub | today_sections | stub | 6 |
| `toolkit/category` | `category.html` | `?cat` | full-bleed | stub | saved | — | 9 |
| `toolkit/video` | `toolkit-video.html` | `?video`, `?from` | full-bleed | stub | video_watched | stub | 9 |
| `sparks/collection` | `collection.html` | — | full-bleed | stub | today_sections | — | 11 |
| `sparks/collectible` | `collectible.html` | `?c`, `?anim` | full-bleed | stub | — | — | 11 |
| `recap` | `recap.html` | — | full-bleed | stub | — | — | 10 |
| `settings` | `settings.html` | — | full-bleed | stub | username, avatar_id, privacy_1/2, settings_from | stub | 13 |
| `support/write` | `support-write.html` | — | full-bleed | stub | — | stub | 13 |
| `helpful-content` | `helpful-content.html` | — | full-bleed | stub | — | stub | 9 |
| `session-feedback` | `session-feedback.html` | — | full-bleed | stub | — | stub | 13 |
| `sleeping` | `sleeping.html` | — | full-bleed | stub | — | — | 13 |
| `onboarding/{name,this-space,sharing,privacy,avatar,baseline-mood,helpers,trusted-person,complete}` | `onboarding.html` (s-name, s0–s7) | — | full-bleed | — | — | — | **4** |

**Dev-only (no `/preview` mirror):**

| Path | Prototype source | Kind | Fill phase |
|---|---|---|---|
| `/_dev/student-storage` | `debug-storage.html` | dev tool (soft `import.meta.env.DEV` gate) | 13 |

> **Onboarding is NOT registered in Phase 3.** Five new slugs (`avatar`,
> `baseline-mood`, `helpers`, `trusted-person`, `complete`) collide with the live
> old onboarding tree; React Router would silently shadow one set by declaration
> order. Phase 4 swaps the whole onboarding tree atomically and repoints the
> `/app` dispatcher (`app.tsx`) target. Until then the OLD onboarding tree
> (both mounts) is unchanged and `/app` still lands students on
> `/student/onboarding/welcome`.

## Navigation edges

Prototype navigation is `window.location.href` + `history.back()`; the port
re-expresses it as client `navigate()` while preserving the sessionStorage
protocol for full-page-load survival. Edges below are the target contract
(realised as each page's fill phase lands).

- **Sidebar** (present on all six stage pages): `Today → /student`,
  `Journal → /student/journal`, `My toolkit → /student/toolkit`,
  `Journey → /student/journey`, `Grades → /student/school`,
  `Sparkz → /student/sparks`; settings avatar → `/student/settings`.
- **Onboarding** (Phase 4) → completion → `/student/mood-checkin`.
- **`/student` (Today hub)**
  - daily cards → `/student/notice-wins`, `/student/write-it-out`,
    `/student/all-about-you`; mood edit → `/student/mood-checkin?edit=1`.
  - "View summary" → `/student/summary`.
  - `goJournal` copies `bp_write_text` local→session, then → `/student/journal`.
  - entry animation consumed from navigation state **or** `bp_enter_anim`.
- **`/student/mood-checkin`** → finish (blob exit) → `/student` (with enter-anim
  state + `bp_enter_anim`/`bp_fresh_start`); `?edit=1` = "Check-in updated!" copy.
- **`/student/{write-it-out,notice-wins,all-about-you}`** → save →
  `/student/completed?card={write|wins|about}`; back = `navigate(-1)`.
- **`/student/completed`** → auto-navigates (t≈3900ms) → `/student` (or
  `/student/journal` when `?from=journal`), with enter-anim.
- **`/student/summary`** → per-card Edit deep links (`/student/mood-checkin?edit=1`,
  `/student/notice-wins`, `/student/write-it-out`, `/student/all-about-you`);
  back → `/student`.
- **`/student/journal`** → `/student/journal/past-notes`,
  `/student/journal/question?q=…`, write/question overlays (in-page).
- **`/student/journal/question`** → finish → `/student/journal`.
- **`/student/toolkit`** → `/student/toolkit/category?cat=…`,
  `/student/toolkit/video?video=…&from=…`.
- **`/student/toolkit/category`** → back → `/student/toolkit?tab=browse`.
- **`/student/toolkit/video`** → `destAfter` matrix from `?from` →
  `/student` · `/student/school` · `/student/school?tab=attend` · `/student/toolkit`.
- **`/student/helpful-content`** → `/student` (enter-anim); sets `bp_video_watched`.
- **`/student/journey`** → wrap overlay → `/student/recap`; `?from=recap` = return
  animation.
- **`/student/recap`** → exit → `/student/journey?from=recap`.
- **`/student/sparks`** → `/student/sparks/collection`,
  `/student/sparks/collectible?c=…` (hand-off); `?back=1` = re-entry animation.
- **`/student/sparks/collectible`** → exit → `/student/sparks?back=1`.
- **`/student/school`** → video promos → `/student/toolkit/video?video=calming-breath&from={grades|grades-attend}`;
  support CTA → `/student/support/write`.
- **`/student/settings`** → return via `bp_settings_from` / location state.
- **`/student/support/write`** → both exits `navigate(-1)`.
- **`/student/session-feedback`** → `/student/mood-checkin`. *No inbound link in
  the prototype — direct-URL scenario.*
- **`/student/sleeping`** — static gate, no time logic (Phase 13).

## Query-param semantics

| Route | Param | Meaning |
|---|---|---|
| `journal` | `?demo=1\|2\|3` | Render one of 3 canned preview states. |
| `journal` | `?wt=<text>` | Inject `<text>` into the session `bp_write_text` copy (shows as today's note). |
| `toolkit` | `?tab=<section>` | Filter to a section (e.g. `browse`). |
| `toolkit` | `?explore=1` | Explore mode (hides sidebar). |
| `toolkit` | `?reset=video` | Reset the video gate → simple view. |
| `toolkit` | `?preview=simple` | Force the simple view. |
| `journey` | `?from=recap` | Play the recap-return animation. |
| `school` | `?tab=attend` | Open the Attendance tab. |
| `sparks` | `?back=1` | Play the collection→shop re-entry animation. |
| `mood-checkin` | `?edit=1` | Edit variant ("Check-in updated!" copy, prefilled selection). |
| `journal/question` | `?q=1\|2` | Which guided question to show. |
| `completed` | `?card=<mood\|wins\|write\|about\|…>` | Which card art + section to complete. |
| `completed` | `?from=journal` | Return to `/student/journal` instead of `/student`. |
| `toolkit/category` | `?cat=<id>` | Which category to render. |
| `toolkit/video` | `?video=<id>` | Which video to play (`VIDEO_CFG`). |
| `toolkit/video` | `?from=<origin>` | Return-destination key (today/grades/grades-attend/toolkit). |
| `sparks/collectible` | `?c=<id>` | Which collectible to show (`COLLECTIBLES`). |
| `sparks/collectible` | `?anim=1` | Play the cloud-entrance animation. |

## Storage keys touched (per route)

Keys are `bp_*` accessed via `studentStorage` (`app/lib/student/storage.ts`).
R = read, W = write, C = consume (read-and-remove one-shot).

| Route | Keys |
|---|---|
| `` (index / today) | R/C `bp_enter_anim`, `bp_fresh_start`, `bp_skip_success`; C `bp_mood_done`\*, `bp_wins_done`, `bp_write_done`, `bp_about_done`; R `bp_today_sections`, `bp_mood_emotions`; R/W `bp_sparks` (lazy 360), `bp_tour_done`; W (promote) `bp_write_text` local→session; R profile (`bp_username`/`bp_avatar`/`bp_avatar_bg`) |
| `mood-checkin` | R (edit) `bp_mood_emotions`, `bp_mood_reasons`; W `bp_mood_emotions`, `bp_mood_reasons`, `bp_mood_done`, `bp_fresh_start`, `bp_enter_anim` |
| `summary` | R `bp_today_sections`, `bp_mood_emotions`, `bp_mood_reasons`, `bp_wins_note`, `bp_wins_question`, `bp_write_text`, `bp_about_emoji`, `bp_about_question` |
| `journal` | R `bp_mood_emotions`, `bp_journal_notes`, `bp_write_text` (session); W `bp_journal_notes` (unshift); session inject via `?wt` |
| `journal/past-notes` | — (static archive) |
| `journal/question` | R/W `bp_journal_q1`, `bp_journal_q2` (dual-store) |
| `write-it-out` | R (edit) `bp_write_text`; W `bp_write_text` (dual local+session), `bp_write_done` |
| `notice-wins` | R (edit) `bp_wins_note`, `bp_wins_question`; W same + `bp_wins_done` |
| `all-about-you` | R (pre-select) `bp_about_emoji`; W `bp_about_emoji`, `bp_about_done` |
| `completed` | R/W (append) `bp_today_sections` |
| `toolkit` | R `bp_video_watched`, `bp_saved` (seed `["v2"]`); W `bp_saved` (min-1 rule) |
| `toolkit/category` | R/W `bp_saved` |
| `toolkit/video` | R/W `bp_video_watched` |
| `sparks` | R/W `bp_sparks` (decrement on unlock); R `bp_today_sections` |
| `sparks/collection` | R `bp_today_sections` (x/20 counter) |
| `sparks/collectible` | — (query-driven) |
| `recap` | — |
| `settings` | R/W `bp_username`, `bp_avatar`, `bp_avatar_id`, `bp_avatar_bg`, `bp_privacy_1`, `bp_privacy_2`; R `bp_settings_from` |
| `support/write` | — (future message POST) |
| `helpful-content` | W `bp_video_watched` |
| `session-feedback` | — (future feedback POST) |
| `sleeping` | — |
| `/_dev/student-storage` | dump / wildcard-wipe all `bp_*`; reset `bp_video_watched`, `bp_tour_done` |

\* `bp_mood_done` / `bp_grades_note` are **write-only** in the prototype (no read
site); `bp_about_question` is **read-never-written** (defaults `''`). Ported as-is;
the backend session reconciles these quirks.

## Backend wiring guide (future sessions)

Each future per-route backend session replaces the stub `loader`/`action` and the
`clientLoader`'s adapter reads for that route:

1. **Mood endpoint first** (`mood-checkin`, then `` / `summary` / `journal`
   reads of `bp_mood_*`) — also resolves the emotion-palette source-of-truth
   question (JS `EMOTIONS` constant vs `--mood-*` tokens).
2. **Daily cards** (`write-it-out`, `notice-wins`, `all-about-you`, `completed`)
   — activity writes + `bp_today_sections`.
3. **Journal** (`journal`, `journal/question`, `journal/past-notes`) — notes +
   guided-question persistence.
4. **Toolkit / video** (`toolkit`, `toolkit/category`, `toolkit/video`,
   `helpful-content`) — saved-items set + video-watched gate.
5. **Sparks economy** (`sparks`, `sparks/collection`, `sparks/collectible`) —
   balance + collection; note the prototype only *decrements* (no earn path yet).
6. **Grades** (`school`) — grades-journal note + heart.
7. **Profile / satellites** (`settings`, `support/write`, `session-feedback`) —
   profile + privacy + support/feedback POSTs.

Until wired, `loader` returns `null` and state lives entirely in `bp_*` storage
(via the adapter). The storage-partitioning assumption (Safari ITP / Chrome
partitioning inside the Canvas iframe) is validated by Phase 13's in-iframe smoke
test; the storage adapter is the single seam where a cookie/server fallback lands.
