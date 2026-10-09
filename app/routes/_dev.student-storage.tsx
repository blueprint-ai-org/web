/**
 * `/_dev/student-storage` — dev-only storage inspector (ports
 * `debug-storage.html`). No `/preview` mirror.
 *
 * Reproduces the prototype's debug page onto the typed storage adapter:
 *  - dumps BOTH stores (localStorage + sessionStorage), showing every `bp_*`
 *    key and its value;
 *  - a wildcard "wipe all `bp_*`" action (both stores);
 *  - reset toggles for the one-shot gates `bp_video_watched` / `bp_tour_done`.
 *
 * Keys are enumerated from the adapter's `BP_KEYS` inventory (never hardcoded)
 * and unioned with whatever `bp_*` keys are actually present, so stray keys
 * still surface. All storage access is client-only (via `rawStore`, which
 * no-ops server-side) and deferred to a post-mount effect so SSR never touches
 * `window` and hydration stays stable. Soft `import.meta.env.DEV` gate matches
 * `_dev.student-modals.tsx`.
 */

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { BP_KEYS, rawStore } from '~/lib/student/storage'

export function meta() {
  return [{ title: 'Student storage (dev)' }]
}

/** Full key inventory from the adapter (source of truth — never hardcoded). */
const INVENTORY: readonly string[] = Object.values(BP_KEYS)

interface Snapshot {
  readonly keys: readonly string[]
  readonly local: Record<string, string>
  readonly session: Record<string, string>
  readonly localCount: number
  readonly sessionCount: number
}

/** Read both stores and build the merged, sorted key list. Client-only. */
function readSnapshot(): Snapshot {
  const local = rawStore.dump('local')
  const session = rawStore.dump('session')
  const keys = Array.from(
    new Set<string>([...INVENTORY, ...Object.keys(local), ...Object.keys(session)]),
  ).sort()
  return {
    keys,
    local,
    session,
    localCount: Object.keys(local).length,
    sessionCount: Object.keys(session).length,
  }
}

// ── Styling (self-contained, echoes the original debug-storage.html) ─────────

const COLORS = {
  bg: '#1f1f25',
  surface: '#2b2b32',
  border: '#3a3a44',
  text: '#f2f3e5',
  muted: '#8e8b85',
  purple: '#b38aff',
  orange: '#e65800',
  blue: '#3f50b8',
} as const

const btnBase: CSSProperties = {
  border: 'none',
  padding: '10px 18px',
  color: '#fff',
  cursor: 'pointer',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
}

export default function StudentStorageInspector() {
  if (!import.meta.env.DEV) {
    return (
      <main style={{ padding: 32, fontFamily: 'var(--font-student-body)' }}>
        <p>Disabled in production.</p>
      </main>
    )
  }
  return <StorageInspectorPanel />
}

function StorageInspectorPanel() {
  // `null` until the post-mount effect reads storage — keeps SSR + first client
  // render identical (no `window` access, no hydration mismatch).
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setSnapshot(readSnapshot())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const wipeAll = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm('Wipe every bp_* key from BOTH localStorage and sessionStorage?')) {
      return
    }
    rawStore.wipeAll()
    setStatus('Cleared every bp_* key from localStorage and sessionStorage.')
    refresh()
  }, [refresh])

  // Matches the prototype's resetVideo(): clears the gate from BOTH stores.
  const resetVideo = useCallback(() => {
    rawStore.removeLocal(BP_KEYS.videoWatched)
    rawStore.removeSession(BP_KEYS.videoWatched)
    setStatus('Reset bp_video_watched (removed from both stores).')
    refresh()
  }, [refresh])

  // Matches the prototype's resetTour(): the tour flag lives in localStorage.
  const resetTour = useCallback(() => {
    rawStore.removeLocal(BP_KEYS.tourDone)
    setStatus('Reset bp_tour_done — reopen the hub to replay the spotlight tour.')
    refresh()
  }, [refresh])

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 32,
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Student storage inspector</h1>
        <p style={{ margin: '0 0 20px', color: COLORS.muted }}>
          Dev-only. Dumps the <code>bp_*</code> keys from both localStorage and
          sessionStorage, backed by the <code>studentStorage</code> adapter.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={refresh} style={{ ...btnBase, background: '#555' }}>
            Refresh
          </button>
          <button type="button" onClick={resetVideo} style={{ ...btnBase, background: COLORS.purple }}>
            Reset “video watched”
          </button>
          <button type="button" onClick={resetTour} style={{ ...btnBase, background: COLORS.blue }}>
            Reset tour (spotlight)
          </button>
          <button type="button" onClick={wipeAll} style={{ ...btnBase, background: COLORS.orange }}>
            Wipe all bp_* keys
          </button>
        </div>

        {status ? (
          <p
            role="status"
            style={{
              margin: '0 0 16px',
              padding: '10px 12px',
              borderRadius: 8,
              background: COLORS.surface,
              color: COLORS.purple,
            }}
          >
            {status}
          </p>
        ) : null}

        {snapshot === null ? (
          <p style={{ color: COLORS.muted }}>Reading storage…</p>
        ) : (
          <StorageTable snapshot={snapshot} />
        )}
      </div>
    </main>
  )
}

function StorageTable({ snapshot }: { snapshot: Snapshot }) {
  const { keys, local, session, localCount, sessionCount } = snapshot

  return (
    <>
      <p style={{ margin: '0 0 12px', color: COLORS.muted }}>
        {localCount} key(s) in localStorage · {sessionCount} key(s) in sessionStorage ·{' '}
        {keys.length} row(s) (inventory ∪ present)
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: COLORS.muted }}>
              <th style={thStyle}>Key</th>
              <th style={thStyle}>localStorage</th>
              <th style={thStyle}>sessionStorage</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: COLORS.text }}>{key}</td>
                <ValueCell present={key in local} value={local[key]} />
                <ValueCell present={key in session} value={session[key]} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ValueCell({ present, value }: { present: boolean; value: string | undefined }) {
  if (!present) {
    return <td style={{ ...tdStyle, color: COLORS.muted }}>—</td>
  }
  const display = value === '' ? '(empty string)' : value
  return (
    <td style={{ ...tdStyle, wordBreak: 'break-all', color: value === '' ? COLORS.muted : COLORS.text }}>
      {display}
    </td>
  )
}

const thStyle: CSSProperties = {
  padding: '6px 12px 6px 0',
  fontWeight: 600,
  verticalAlign: 'top',
}

const tdStyle: CSSProperties = {
  padding: '8px 12px 8px 0',
  verticalAlign: 'top',
}
