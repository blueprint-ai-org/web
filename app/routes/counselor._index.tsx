/**
 * `/counselor` index — redirects to `/counselor/insights` (the default
 * Counselor view). No default export: this route only owns the loader.
 */

import { redirect } from 'react-router'

export function loader() {
  return redirect('/counselor/insights')
}
