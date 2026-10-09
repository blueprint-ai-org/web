/**
 * `/student/onboarding` index — redirects to the first step (`name`).
 * No default export: this route only owns the loader.
 */

import { redirect } from 'react-router'
import { ONBOARDING_FIRST_PATH } from '~/components/dashboard/student/onboarding-v2'

export function loader() {
  return redirect(ONBOARDING_FIRST_PATH)
}
