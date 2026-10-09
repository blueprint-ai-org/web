/**
 * `/preview/student/write-it-out` — dev-only mirror of `student.write-it-out.tsx`.
 *
 * Re-exports by **name**, not `export *`: React Router reads a route's exports
 * statically to build the client manifest, and a star re-export hides them, so
 * the client believes there is no server `loader` and the `clientLoader`'s
 * `serverLoader()` call throws.
 */
export { action, clientLoader, default, HydrateFallback, loader, meta } from './student.write-it-out'
