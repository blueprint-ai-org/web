/**
 * Standalone preview/test server for the student frontend.
 *
 * `server.ts` boots ltijs, which requires LTI_KEY + MONGODB_URL + CANVAS_ISSUER and
 * dials MongoDB Atlas before the first request is served. That's the right entry
 * point for launch-flow work, but it's a heavy (and network-dependent) way to look
 * at a student screen. This server mounts ONLY the React Router handler behind
 * Vite's dev middleware — no ltijs, no Mongo, no env vars, no LTI session — so the
 * dev-only `/preview/student/*` mirror renders on its own.
 *
 * It also serves a route catalog at `/preview` (a real 404 in the RR tree, since
 * `preview/student` has no index of its own) built by walking `app/routes.ts` at
 * runtime, so the link list can't drift from the route table.
 *
 *   npm run dev:preview          # → http://localhost:3100/preview
 *   PREVIEW_PORT=4000 npm run dev:preview
 *
 * `NODE_ENV` is pinned to `development`: `routes/_preview.tsx` throws a 404 in
 * production builds on purpose, which would make every route here unreachable.
 */

import express from 'express'
import { createRequestHandler } from '@react-router/express'
import routeConfig from './app/routes.js'

// Must be set before the RR handler + `_preview.tsx`'s production gate observe it.
process.env.NODE_ENV = 'development'

type RouteEntry = { path?: string; file: string; index?: boolean; children?: RouteEntry[] }

type FlatRoute = { url: string; file: string; layouts: string[] }

/**
 * Flatten the `routes.ts` config into concrete URLs, carrying the chain of
 * pathless layout files so the catalog can group by shell (sidebar stage pages
 * vs. full-bleed pages) without hard-coding a list.
 */
function flatten(entries: RouteEntry[], parent = '', layouts: string[] = []): FlatRoute[] {
  return entries.flatMap((entry) => {
    // A layout entry has no `path`; it contributes a shell but not a URL segment.
    const isLayout = entry.path === undefined && !entry.index
    const url = entry.path ? `${parent}/${entry.path}`.replace(/\/+/g, '/') : parent
    const nextLayouts = isLayout ? [...layouts, entry.file] : layouts
    const self: FlatRoute[] =
      isLayout || !url ? [] : [{ url: url.startsWith('/') ? url : `/${url}`, file: entry.file, layouts }]
    const kids = entry.children ? flatten(entry.children, url, nextLayouts) : []
    return [...self, ...kids]
  })
}

const allRoutes = flatten(routeConfig as RouteEntry[])
const studentPreview = allRoutes.filter((r) => r.url === '/preview/student' || r.url.startsWith('/preview/student/'))

const groups = [
  {
    title: 'Stage pages (in-canvas sidebar)',
    note: 'Rendered inside the shared <code>student._app.tsx</code> shell.',
    routes: studentPreview.filter((r) => r.layouts.some((f) => f.includes('student._app'))),
  },
  {
    title: 'Onboarding flow',
    note: 'Nine steps; the index redirects to <code>name</code>.',
    routes: studentPreview.filter((r) => r.url.includes('/onboarding')),
  },
  {
    title: 'Full-bleed pages (no sidebar)',
    note: 'Siblings of the stage shell — the modules render screens, not outlets.',
    routes: studentPreview.filter(
      (r) => !r.layouts.some((f) => f.includes('student._app')) && !r.url.includes('/onboarding')
    ),
  },
  {
    title: 'Dev tools',
    note: 'Not part of the student flow — storage inspector + primitives gallery.',
    routes: allRoutes.filter((r) => r.url.startsWith('/_dev/')),
  },
]

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function catalogHtml(port: number): string {
  const sections = groups
    .filter((g) => g.routes.length > 0)
    .map(
      (g) => `
      <section>
        <h2>${g.title} <span class="count">${g.routes.length}</span></h2>
        <p class="note">${g.note}</p>
        <ul>
          ${g.routes
            .map(
              (r) => `<li>
                <a href="${r.url}">${escapeHtml(r.url)}</a>
                <code>app/routes/${escapeHtml(r.file.replace(/^routes\//, ''))}</code>
              </li>`
            )
            .join('\n          ')}
        </ul>
      </section>`
    )
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Student frontend — preview server</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; padding: 32px clamp(16px, 5vw, 64px) 64px; background: #14100e; color: #f5efe9;
           font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, sans-serif; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .sub { color: #a9998c; margin: 0 0 28px; font-size: 13px; }
    .sub code { background: #241d19; padding: 1px 5px; border-radius: 4px; }
    section { margin-bottom: 28px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #e2b887; margin: 0 0 2px; }
    .count { color: #6f6157; font-weight: 400; letter-spacing: 0; text-transform: none; }
    .note { color: #8b7d72; font-size: 12px; margin: 0 0 10px; }
    .note code { color: #b3a49a; }
    ul { list-style: none; margin: 0; padding: 0;
         display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 6px; }
    li { display: flex; align-items: baseline; gap: 10px; background: #1c1714; border: 1px solid #2b231e;
         border-radius: 7px; padding: 8px 11px; min-width: 0; }
    a { color: #f5efe9; text-decoration: none; font-weight: 600; white-space: nowrap; }
    a:hover { color: #ffb865; text-decoration: underline; }
    li code { color: #6f6157; font-size: 11px; margin-left: auto;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>
  <h1>Student frontend — preview server</h1>
  <p class="sub">
    Port <code>${port}</code> · no LTI session, no MongoDB, no ltijs.
    The <code>/preview/*</code> mirror renders the same route modules the Canvas-embedded
    <code>/student/*</code> tree does. Student storage lives in <code>bp_*</code> localStorage keys —
    clear them from the storage inspector below to replay onboarding.
  </p>
${sections}
</body>
</html>
`
}

const app = express()

const viteDevServer = await import('vite').then((v) => v.createServer({ server: { middlewareMode: true } }))

const rrHandler = createRequestHandler({
  build: () => viteDevServer.ssrLoadModule('virtual:react-router/server-build') as any,
  // No LTI launch here — the persona routes that require a session are reached
  // through their `/preview/*` mirrors, which don't read `ltiToken`.
  getLoadContext: () => ({ ltiToken: undefined }),
})

const port = Number(process.env.PREVIEW_PORT ?? 3100)

// Route catalog. Registered before the RR handler so it wins for the bare
// `/preview` path (which the RR tree leaves as a 404).
app.get('/preview', (_req, res) => {
  res.type('html').send(catalogHtml(port))
})
app.get('/', (_req, res) => res.redirect('/preview'))

app.use(viteDevServer.middlewares)
app.all('/*splat', rrHandler)

app.listen(port, () => {
  console.log(`\n  student preview server → http://localhost:${port}/preview`)
  console.log(`  dashboard              → http://localhost:${port}/preview/student`)
  console.log(`  onboarding             → http://localhost:${port}/preview/student/onboarding\n`)
})
