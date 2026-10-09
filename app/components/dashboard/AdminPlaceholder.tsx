/**
 * AdminPlaceholder — "Coming Soon" stub for the `/admin` persona route.
 *
 * The Blueprint prototype has no real admin dashboard yet, so this component
 * renders a friendly placeholder plus a small dev/QA debug panel that lists
 * the detected role URIs and LTI custom fields. The debug panel exists so
 * that during QA we can confirm admin classification — Canvas surfaces admin
 * via either `…/institution/person#Administrator` or
 * `…/system/person#Administrator`, and seeing the raw URI here is a cheap
 * sanity check that loader data made it to the view.
 */

type Props = {
  detectedRoles: string[]
  customFields: Record<string, string>
}

export function AdminPlaceholder({ detectedRoles, customFields }: Props) {
  const customEntries = Object.entries(customFields)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Admin View — Coming Soon
        </h1>
        <p className="mt-3 text-base text-slate-600">
          District-wide engagement metrics, school roll-ups, and incident
          summaries will land here.
        </p>
      </header>

      <section
        aria-label="LTI launch debug panel"
        className="rounded-lg border border-slate-200 bg-slate-50 p-5"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Launch debug
        </h2>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-700">Detected roles</h3>
          {detectedRoles.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">No roles detected.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {detectedRoles.map((uri) => (
                <li key={uri} className="break-all font-mono text-xs">
                  {uri}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-medium text-slate-700">Custom fields</h3>
          {customEntries.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">No custom fields.</p>
          ) : (
            <dl className="mt-2 divide-y divide-slate-200 rounded border border-slate-200 bg-white text-sm">
              {customEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:gap-4"
                >
                  <dt className="font-mono text-xs text-slate-500 sm:w-1/3">
                    {key}
                  </dt>
                  <dd className="break-all font-mono text-xs text-slate-800 sm:flex-1">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </main>
  )
}
