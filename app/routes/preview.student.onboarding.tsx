/**
 * `/preview/student/onboarding` — dev-only re-export of the LTI onboarding
 * wizard layout (`student.onboarding.tsx`). RR7 requires a unique module file
 * per route path, so this is a one-liner that reuses the real layout (a plain
 * `<Outlet/>` passthrough — cross-screen state lives in the storage adapter).
 * The `_preview.tsx` parent owns the production 404 gate and the `student-dark`
 * scope.
 */
export { default } from "./student.onboarding";
