import { useLocation } from "react-router";

// The two mounts of the student app shell. Under LTI the rail + pages live at
// `/student/*`; the dev-only `_preview` layout re-mounts the same components at
// `/preview/student/*`. The nav items carry mount-relative `to` values, so this
// hook derives the correct base from the current pathname — a single rail
// resolves to the LTI tree under LTI and stays inside preview under preview.
// Mirrors `useOnboardingNav.ts`.
const LTI_BASE = "/student";
const PREVIEW_BASE = "/preview/student";

/**
 * Resolve the current student-shell mount base (`/student` vs
 * `/preview/student`) so `NavLink` `to` values resolve under both mounts.
 */
export function useStudentNavBase(): string {
  const { pathname } = useLocation();
  return pathname.startsWith(PREVIEW_BASE) ? PREVIEW_BASE : LTI_BASE;
}
