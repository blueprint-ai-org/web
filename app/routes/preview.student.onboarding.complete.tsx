/**
 * `/preview/student/onboarding/complete` — dev-only re-export of the real
 * `student.onboarding.complete.tsx` step. Its "Start with Your Mood" CTA exits
 * via `useOnboardingNav`, which resolves to `/preview/student/mood-checkin`
 * under preview.
 */
export { default } from "./student.onboarding.complete";
export * from "./student.onboarding.complete";
