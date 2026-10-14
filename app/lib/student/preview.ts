/**
 * `/preview/student/*` mounts the same route modules as `/student/*` (see
 * `routes.ts`), with no session behind them. A loader that reads the gateway
 * asks this to serve a constant fixture there instead of an empty screen.
 */
export function isPreviewRequest(request: Request): boolean {
  return new URL(request.url).pathname.startsWith('/preview/')
}
