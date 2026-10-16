/**
 * `/preview/student/recap` — dev-only mirror of `student.recap.tsx`.
 *
 * Re-exports by **name**, not `export *`: React Router reads a route's exports
 * statically to build the client manifest, and a star re-export hides the
 * server `loader` from it.
 */
export { default, loader, meta } from './student.recap'
