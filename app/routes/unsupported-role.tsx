import type { Route } from './+types/unsupported-role'
import { getLtiToken } from '~/lib/lti-session.server'
import { classifyRole } from '~/lib/roles'

export function headers() {
  return {
    'Content-Security-Policy': 'frame-ancestors https://*.instructure.com',
  }
}

export function meta() {
  return [{ title: 'Spark EQ — Unsupported role' }]
}

export async function loader({ request }: Route.LoaderArgs) {
  const token = await getLtiToken(request)
  const detectedRoles: string[] = token?.platformContext?.roles ?? []
  const customFields: Record<string, string> = token?.platformContext?.custom ?? {}
  const role = classifyRole({ roles: detectedRoles, customFields })
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
        Spark EQ recognized your launch, but the role &ldquo;<code>{role}</code>&rdquo;
        doesn&rsquo;t have a dashboard yet. We&rsquo;re working on it.
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
