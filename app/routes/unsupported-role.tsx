import type { Route } from './+types/unsupported-role'
import { getLtiToken } from '~/lib/lti-session.server'
import { getAppSession, getRoleFor } from '~/lib/session.server'

export function headers() {
  return {
    'Content-Security-Policy': 'frame-ancestors https://*.instructure.com',
  }
}

export function meta() {
  return [{ title: 'Spark EQ — Unsupported role' }]
}

/**
 * The dead end, and the one screen that prints what it saw.
 *
 * `role` is now the gateway's answer rather than a local classification, and it
 * can be `null` — which is the honest value for "we could not establish one at
 * all", and distinct from "we established one this app has no screens for".
 * The raw LTI roles and custom fields are still rendered because they are what
 * a support conversation needs: the person on this page cannot tell us anything
 * the launch did not already say.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const token = await getLtiToken(request)
  const detectedRoles: string[] = token?.platformContext?.roles ?? []
  const customFields: Record<string, string> = token?.platformContext?.custom ?? {}
  const session = await getAppSession(request)
  const role = session ? await getRoleFor(session) : null
  return {
    role,
    detectedRoles,
    customFields,
    isDev: process.env.NODE_ENV !== 'production',
  }
}

export default function UnsupportedRole({ loaderData }: Route.ComponentProps) {
  const { role, detectedRoles, customFields, isDev } = loaderData
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 720 }}>
      <h1>We don&rsquo;t have a view for your role yet</h1>
      <p>
        {role ? (
          <>
            Spark EQ recognized your launch, but the role &ldquo;<code>{role}</code>&rdquo;
            doesn&rsquo;t have a dashboard yet. We&rsquo;re working on it.
          </>
        ) : (
          <>Spark EQ could not work out which role your launch carries.</>
        )}
      </p>
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Detected LTI roles</h2>
        {detectedRoles.length === 0 ? (
          <p><em>(none)</em></p>
        ) : (
          <ul>
            {detectedRoles.map((r) => (
              <li key={r}><code>{r}</code></li>
            ))}
          </ul>
        )}
        {Object.keys(customFields).length > 0 && (
          <>
            <h2 style={{ fontSize: 16, marginTop: 16 }}>Custom fields</h2>
            <ul>
              {Object.entries(customFields).map(([k, v]) => (
                <li key={k}>
                  <code>{k}</code>: <code>{String(v)}</code>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {isDev && (
        <section style={{ marginTop: 32, padding: 16, border: '1px dashed #999' }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>Dev-only preview</h2>
          <p style={{ fontSize: 13, color: '#555' }}>
            These links are hidden in production. Use them to preview each persona
            during local testing.
          </p>
          <p>
            <a href="/teacher?preview=1">Preview as teacher</a>
            {' · '}
            <a href="/counselor?preview=1">Preview as counselor</a>
          </p>
        </section>
      )}
    </main>
  )
}
