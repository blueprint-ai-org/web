/**
 * `/` — the public root, which is now only ever a signpost.
 *
 * **Every path through this loader redirects**, which is why the module has no
 * component. It used to render a placeholder explaining that launches happen at
 * `/lti/login`; that sentence was true and useless — the only people who read it
 * were people who had arrived at the wrong URL and were given no way onward.
 *
 * The two session sources are checked in the order that cannot be wrong:
 *
 *  1. **An LTI launch wins.** Somebody inside Canvas is already authenticated as
 *     a specific person with a specific role, and that role decides where they
 *     go. Checking `bp-session` first could send a launched teacher to a
 *     student screen because of a stale cookie on the same browser.
 *  2. **Otherwise a credential session**, routed by its own `role` claim —
 *     which is new in step-7. It used to go to `/student` unconditionally,
 *     because `login` carried no role and students were the only people who
 *     could use one; a teacher with a password now lands in the teacher app.
 *  3. **Otherwise `/login`**, because a visitor with neither is a visitor who
 *     needs to sign in.
 *
 * Both session kinds take the same path table (`pathForRole`), which is the
 * other half of the change: this file used to carry its own copy of the
 * six-case switch and had drifted from `/app`'s, sending students to a
 * hard-coded `/student/onboarding/welcome` instead of the exported first step.
 */

import { redirect } from 'react-router'
import type { Route } from './+types/_index'
import { pathForRole } from '~/lib/personas'
import { getAppSession, getRoleFor } from '~/lib/session.server'

/** Where a visitor with no session at all goes. */
const NO_SESSION = '/login'

export function meta() {
  return [
    { title: 'Blueprint LTI test tool' },
    { name: 'description', content: 'Blueprint LTI 1.3 test tool landing page.' },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAppSession(request)
  if (!session) throw redirect(NO_SESSION)

  throw redirect(pathForRole(await getRoleFor(session)))
}
