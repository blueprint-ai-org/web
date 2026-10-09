import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("app", "routes/app.tsx"),
  route("_demo/primitives", "routes/_demo.primitives.tsx"),
  route("_demo/tokens", "routes/_demo.tokens.tsx"),
  route("_dev/student-primitives", "routes/_dev.student-primitives.tsx"),
  // Dev-only student storage inspector (ports `debug-storage.html`). No preview
  // mirror — it operates directly on `bp_*` storage. Filled in Phase 13.
  route("_dev/student-storage", "routes/_dev.student-storage.tsx"),
  route("api/theme", "routes/api.theme.tsx"),
  // The daily check-in's write. A resource route rather than the screen's own
  // `action` because `/student/mood-checkin` is a client-only imperative
  // animation orchestrator — a form post would revalidate its loader and
  // re-render the tree underneath a running transition. See the route header.
  // Covered by `app.all('/api/*splat')` in `server.ts`, so the POST lands.
  route("api/mood-checkin", "routes/api.mood-checkin.tsx"),
  // `/unsupported-role` sits outside the persona layout — users who land here
  // shouldn't see the Canvas header or persona-specific theme chrome.
  route("unsupported-role", "routes/unsupported-role.tsx"),
  // Credential auth entry points — the non-LTI way into the app. Top level,
  // OUTSIDE `_persona.tsx` for the same reason as `/unsupported-role` above,
  // but here it is load-bearing rather than cosmetic: that layout's loader
  // throws 401 without a session, so nesting the login page inside it would
  // make the login page unreachable to exactly the people who need it.
  // `/logout` is action-only (no component) and answers 405 on GET.
  // NOTE: all four are also registered with `app.all` in `server.ts` — with
  // `app.get` the form POST falls through to ltijs and is 401'd.
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  // `/invite` redeems an invitation token from the email link and lands the
  // invitee signed in. Unlike the two above it does NOT bounce an
  // already-authenticated visitor — the token names a specific person, and the
  // device carrying a stale session is often not theirs. See the route header.
  route("invite", "routes/invite.tsx"),
  route("logout", "routes/logout.tsx"),
  // Shared persona layout (`/teacher` + `/counselor/*`). Owns the LTI
  // session gate, theme cookie, Canvas header chrome, and `frame-ancestors`
  // CSP. The `/counselor` parent layout adds a sub-nav for its 3 views;
  // the index slot is filled in phase C5.
  layout("routes/_persona.tsx", [
    route("teacher", "routes/teacher.tsx"),
    route("student", "routes/student.tsx", [
      // Pathless grouping layout for the six sidebar-bearing "stage" pages
      // (Today index + Journal, My toolkit, Journey, Grades, Sparkz). Each hub
      // page renders its own in-canvas Sidebar inside a `StudentStage`, so the
      // layout is now a passthrough (see `student._app.tsx`). The full-bleed
      // pages + onboarding are deliberate SIBLINGS outside this layout.
      layout("routes/student._app.tsx", [
        index("routes/student._index.tsx"),
        // The topic overlay is a child route so each prompt has its own URL,
        // action and error boundary; it renders into the home's <Outlet/>.
        route("journal", "routes/student.journal.tsx", [
          route("prompt/:questionId", "routes/student.journal.prompt.tsx"),
        ]),
        route("toolkit", "routes/student.toolkit.tsx"),
        route("journey", "routes/student.journey.tsx"),
        route("school", "routes/student.school.tsx"),
        route("sparks", "routes/student.sparks.tsx"),
      ]),
      // Full-bleed student pages (no sidebar) — flat sibling routes with
      // multi-segment paths, OUTSIDE the `_app` layout (the page modules render
      // screens, not `<Outlet/>`s). Registered here in Phase 3 as stubs; filled
      // in Phases 5–13. See `docs/student-routes.md` for the URL contract.
      route("mood-checkin", "routes/student.mood-checkin.tsx"),
      route("summary", "routes/student.summary.tsx"),
      route("journal/past-notes", "routes/student.journal.past-notes.tsx"),
      route("journal/question", "routes/student.journal.question.tsx"),
      route("write-it-out", "routes/student.write-it-out.tsx"),
      route("notice-wins", "routes/student.notice-wins.tsx"),
      route("all-about-you", "routes/student.all-about-you.tsx"),
      route("completed", "routes/student.completed.tsx"),
      route("toolkit/category", "routes/student.toolkit.category.tsx"),
      route("toolkit/video", "routes/student.toolkit.video.tsx"),
      route("sparks/collection", "routes/student.sparks.collection.tsx"),
      route("sparks/collectible", "routes/student.sparks.collectible.tsx"),
      route("recap", "routes/student.recap.tsx"),
      route("settings", "routes/student.settings.tsx"),
      route("support/write", "routes/student.support.write.tsx"),
      route("helpful-content", "routes/student.helpful-content.tsx"),
      route("session-feedback", "routes/student.session-feedback.tsx"),
      route("sleeping", "routes/student.sleeping.tsx"),
      // Onboarding tree — prototype flow (Phase 4). Nine screens under a
      // passthrough `<Outlet/>` layout; the index redirects to `name`. This
      // atomically replaced the old 7-step Figma tree (five slugs collided, so
      // an incremental swap was impossible). The old-only `welcome` /
      // `privacy-intro` modules + the legacy onboarding components were deleted
      // in Phase 4B.
      route("onboarding", "routes/student.onboarding.tsx", [
        index("routes/student.onboarding._index.tsx"),
        route("this-space", "routes/student.onboarding.this-space.tsx"),
        route("sharing", "routes/student.onboarding.sharing.tsx"),
        route("privacy", "routes/student.onboarding.privacy.tsx"),
        route("avatar", "routes/student.onboarding.avatar.tsx"),
        route("baseline-mood", "routes/student.onboarding.baseline-mood.tsx"),
        route("helpers", "routes/student.onboarding.helpers.tsx"),
        route("trusted-person", "routes/student.onboarding.trusted-person.tsx"),
        route("complete", "routes/student.onboarding.complete.tsx"),
      ]),
    ]),
    route("parent", "routes/parent.tsx"),
    route("admin", "routes/admin.tsx"),
    route("counselor", "routes/counselor.tsx", [
      index("routes/counselor._index.tsx"),
      route("insights", "routes/counselor.insights.tsx"),
      route("class-health", "routes/counselor.class-health.tsx"),
      route("student-wellbeing", "routes/counselor.student-wellbeing.tsx"),
    ]),
  ]),
  // Dev-only `/preview/*` layout for visual QA without an LTI session.
  // The layout loader 404s in production builds — see `routes/_preview.tsx`.
  layout("routes/_preview.tsx", [
    route("preview/teacher", "routes/preview.teacher.tsx"),
    route("preview/counselor", "routes/preview.counselor.tsx", [
      index("routes/preview.counselor._index.tsx"),
      route("insights", "routes/preview.counselor.insights.tsx"),
      route("class-health", "routes/preview.counselor.class-health.tsx"),
      route("student-wellbeing", "routes/preview.counselor.student-wellbeing.tsx"),
    ]),
    route("preview/student", "routes/preview.student.tsx", [
      // Mirror of the LTI student app shell for LTI-less QA. Reuses the same
      // `_app` layout + placeholder route modules (RR7 allows a module file to
      // be referenced from multiple route entries). Onboarding stays a
      // rail-free sibling, same as the LTI tree.
      // The shared `_app` + placeholder modules are reused here; RR7 derives a
      // route id from the module path, so each reuse needs an explicit unique
      // `id` to avoid colliding with the LTI mount above.
      layout("routes/student._app.tsx", { id: "preview/student/_app" }, [
        index("routes/preview.student._index.tsx"),
        route("journal", "routes/student.journal.tsx", { id: "preview/student/journal" }, [
          route("prompt/:questionId", "routes/student.journal.prompt.tsx", { id: "preview/student/journal/prompt" }),
        ]),
        route("toolkit", "routes/student.toolkit.tsx", { id: "preview/student/toolkit" }),
        route("journey", "routes/student.journey.tsx", { id: "preview/student/journey" }),
        route("school", "routes/student.school.tsx", { id: "preview/student/school" }),
        route("sparks", "routes/student.sparks.tsx", { id: "preview/student/sparks" }),
      ]),
      // Full-bleed preview mirrors — separate re-export modules (they re-export
      // the LTI module's default + all named exports, so the loader/clientLoader/
      // action seam behaves identically). Auto-derived route ids (distinct files).
      route("mood-checkin", "routes/preview.student.mood-checkin.tsx"),
      route("summary", "routes/preview.student.summary.tsx"),
      route("journal/past-notes", "routes/preview.student.journal.past-notes.tsx"),
      route("journal/question", "routes/preview.student.journal.question.tsx"),
      route("write-it-out", "routes/preview.student.write-it-out.tsx"),
      route("notice-wins", "routes/preview.student.notice-wins.tsx"),
      route("all-about-you", "routes/preview.student.all-about-you.tsx"),
      route("completed", "routes/preview.student.completed.tsx"),
      route("toolkit/category", "routes/preview.student.toolkit.category.tsx"),
      route("toolkit/video", "routes/preview.student.toolkit.video.tsx"),
      route("sparks/collection", "routes/preview.student.sparks.collection.tsx"),
      route("sparks/collectible", "routes/preview.student.sparks.collectible.tsx"),
      route("recap", "routes/preview.student.recap.tsx"),
      route("settings", "routes/preview.student.settings.tsx"),
      route("support/write", "routes/preview.student.support.write.tsx"),
      route("helpful-content", "routes/preview.student.helpful-content.tsx"),
      route("session-feedback", "routes/preview.student.session-feedback.tsx"),
      route("sleeping", "routes/preview.student.sleeping.tsx"),
      // Dev-only mirror of the LTI onboarding tree (prototype flow, Phase 4A).
      // Reuses the real step components; navigation stays inside `/preview/*`
      // because the steps derive their base path from the current location
      // (`useOnboardingNav`).
      route("onboarding", "routes/preview.student.onboarding.tsx", [
        index("routes/preview.student.onboarding._index.tsx"),
        route("this-space", "routes/preview.student.onboarding.this-space.tsx"),
        route("sharing", "routes/preview.student.onboarding.sharing.tsx"),
        route("privacy", "routes/preview.student.onboarding.privacy.tsx"),
        route("avatar", "routes/preview.student.onboarding.avatar.tsx"),
        route("baseline-mood", "routes/preview.student.onboarding.baseline-mood.tsx"),
        route("helpers", "routes/preview.student.onboarding.helpers.tsx"),
        route("trusted-person", "routes/preview.student.onboarding.trusted-person.tsx"),
        route("complete", "routes/preview.student.onboarding.complete.tsx"),
      ]),
    ]),
    route("preview/parent", "routes/preview.parent.tsx"),
    route("preview/admin", "routes/preview.admin.tsx"),
  ]),
] satisfies RouteConfig;
