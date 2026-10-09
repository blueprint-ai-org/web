/**
 * `/preview/student/mood-checkin` — dev-only mirror of `student.mood-checkin.tsx`.
 * Re-exports the full route module (component + loader/clientLoader/action/
 * HydrateFallback/meta) so the preview mount behaves identically.
 */
export { default } from './student.mood-checkin'
export * from './student.mood-checkin'
