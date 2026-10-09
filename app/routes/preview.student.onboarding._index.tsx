/**
 * `/preview/student/onboarding` index — redirects to the first step
 * (`ONBOARDING_FIRST`) within the preview mount. Mirrors `student.onboarding._index.tsx`
 * but targets `/preview/...` so the index slot stays inside preview rather than
 * bouncing into the LTI-gated tree.
 */

import { redirect } from "react-router";
import { ONBOARDING_FIRST } from '~/components/dashboard/student/onboarding-v2'

export function loader() {
  return redirect(`/preview/student/onboarding/${ONBOARDING_FIRST}`);
}
