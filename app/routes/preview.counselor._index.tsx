/**
 * `/preview/counselor` index — redirects to `/preview/counselor/insights`
 * (the default Counselor view). No default export: loader-only, mirrors
 * `counselor._index.tsx`.
 */

import { redirect } from 'react-router'

export function loader() {
  return redirect('/preview/counselor/insights')
}
