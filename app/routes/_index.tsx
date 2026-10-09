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
 *  2. **Otherwise a credential session**, which this app grants only to
 *     students (D5) — so `/student`, the same destination `/login` uses.
 *  3. **Otherwise `/login`**, because a visitor with neither is a visitor who
 *     needs to sign in.
 *
 * Note that a credential session is NOT given the role treatment above: the LTI
 * `roles` claim is what `classifyRole` reads, and a `bp-session` has no such
 * claim. If credential login ever serves more than students, this is one of the
 * places that has to learn about it.
 */

import { redirect } from 'react-router'
import type { Route } from './+types/_index'
import { readBpSession } from '~/lib/bp-ai/session.server'
import { getLtiToken } from '~/lib/lti-session.server'
import { classifyRole } from '~/lib/roles'

/** Where a credential-authenticated visitor goes — `/login`'s own destination. */
const AFTER_CREDENTIAL_SESSION = '/student'

/** Where a visitor with no session at all goes. */
const NO_SESSION = '/login'

export function meta() {
  return [
    { title: 'Blueprint LTI test tool' },
    { name: 'description', content: 'Blueprint LTI 1.3 test tool landing page.' },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const token = await getLtiToken(request)
  if (!token) {
    const session = await readBpSession(request)
    throw redirect(session ? AFTER_CREDENTIAL_SESSION : NO_SESSION)
  }

  const role = classifyRole({
    roles: token.platformContext?.roles ?? [],
    customFields: token.platformContext?.custom ?? {},
  })

  switch (role) {
    case 'teacher':
      throw redirect('/teacher')
    case 'counselor':
      throw redirect('/counselor')
    case 'student':
      throw redirect('/student/onboarding/welcome')
    case 'parent':
      throw redirect('/parent')
    case 'admin':
      throw redirect('/counselor')
    default:
      throw redirect('/unsupported-role')
  }
}
