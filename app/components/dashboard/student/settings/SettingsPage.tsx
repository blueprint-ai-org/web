import { useState, type CSSProperties } from 'react'
import { useFetcher, useNavigate, useOutletContext } from 'react-router'

import type { PersonaOutletContext } from '~/routes/_persona'
import { BP_KEYS, rawStore, studentStorage } from '~/lib/student/storage'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import {
  BG_TO_ID,
  DEFAULT_AVATAR_ID,
  PRIVACY_ROWS,
  SETTINGS_AVATARS,
  SETTINGS_COPY,
  SRC_TO_ID,
  type AvatarId,
} from './settings-data'
import { SETTINGS_CSS } from './settings-styles'

/**
 * `/student/settings` — avatar + privacy settings (ports `settings.html`).
 *
 * A full-bleed stage page (NO sidebar — the prototype markup has only a back
 * button; settings is reached from the sidebar avatar). Two tabs (Avatar /
 * Privacy) over a `.bp-device` `#1f1f25` field: the Avatar tab is a 4-option
 * ring-selectable picker; the Privacy tab is three cards (two ON/OFF toggles +
 * a locked, always-private Journal row). Save is gated by a dirty check
 * (`checkDirty`, `:346-351`) and, on commit, writes the avatar (src/bg/id) and
 * both privacy flags, then returns to the caller.
 *
 * This is a genuinely stateful controlled page (tabs/toggles/selection change on
 * interaction), so — unlike the render-once imperative stages (SparksShop) — it
 * uses ordinary React state + re-render (like `GradesJournalOverlay`). Storage
 * is read in `useState` initializers; the route is client-only (see its
 * `HydrateFallback` + `clientLoader.hydrate`), so `window` exists at mount.
 *
 * Deviations from the prototype (documented, all faithful ports):
 *  - **Privacy init reads `bp_privacy_*` via `rawStore.getLocal`, not
 *    `getPrivacy`.** The prototype defaults an *unset* toggle to ON and only
 *    overrides when the key is present (`:301-304`); `studentStorage.getPrivacy`
 *    returns `false` for an unset key, which would flip a fresh account to OFF.
 *    Reading the raw value preserves the prototype's default-ON. Writes still go
 *    through the sanctioned `setPrivacy` (which serialises `String(bool)`, 1:1
 *    with `:359-360`).
 *  - **`SRC_TO_ID` is keyed by the `public/` avatar paths**, not the
 *    prototype's `./foundations/...` — the RR app stores those in `bp_avatar`
 *    (see onboarding `AvatarScreen`), so the src→id fallback matches real
 *    stored data. (`bp_avatar_id` / `bp_avatar_bg` are unchanged.)
 *  - **Return navigation** maps the prototype's `history.back()` (back button →
 *    `navigate(-1)`) and `sessionStorage.bp_settings_from || 'today.html'`
 *    (save → `getSettingsFrom()`; navigate there when it's an in-app path, else
 *    the hub index `${base}`). The prototype's on-load `document.referrer` write
 *    is intentionally NOT reproduced — it is meaningless under SPA navigation,
 *    and the sidebar avatar routes here without setting the key.
 */

/** Init cascade (`settings.html:289-311`): avatar_id → avatar_bg → avatar src. */
function readInitialAvatar(): AvatarId {
  const savedId = studentStorage.getAvatarId()
  if (savedId) {
    const n = parseInt(savedId, 10)
    if (n >= 1 && n <= 4) return n as AvatarId
  }
  const savedBg = studentStorage.getAvatarBg()
  if (savedBg && BG_TO_ID[savedBg]) return BG_TO_ID[savedBg]
  const savedSrc = studentStorage.getAvatar()
  if (savedSrc && SRC_TO_ID[savedSrc]) return SRC_TO_ID[savedSrc]
  return DEFAULT_AVATAR_ID
}

/** Prototype default-ON semantics (`settings.html:301-304`) — see JSDoc. */
function readInitialToggle(n: 1 | 2): boolean {
  const raw = rawStore.getLocal(n === 1 ? BP_KEYS.privacy1 : BP_KEYS.privacy2)
  return raw === null ? true : raw === 'true'
}

type Tab = 'avatar' | 'privacy'

/**
 * Is this page being viewed on a credential session?
 *
 * The answer decides whether a "Log out" control exists at all — see the JSDoc
 * on {@link LogOutForm}. It comes from `_persona.tsx`'s outlet context, which
 * reaches this component through React context rather than props, so no route
 * module has to thread it down.
 *
 * `Partial<…>` because this same component is also mounted at
 * `/preview/student/settings`, whose parent is `_preview.tsx` and whose context
 * is `{ themeMode }` — no `sessionKind` at all. Typing the read as partial is
 * the honest description of "either parent may be above me"; the `?? null`
 * covers the preview mount, and preview correctly gets no log-out control.
 *
 * The `PersonaOutletContext` import is type-only and therefore erased at
 * build time — importing the route module's *values* here would pull its
 * server-only imports (`~/lib/session.server`, `~/lib/theme-cookie.server`)
 * into the client bundle.
 */
function useSessionKind(): PersonaOutletContext['sessionKind'] | null {
  const ctx = useOutletContext<Partial<PersonaOutletContext> | null>()
  return ctx?.sessionKind ?? null
}

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-display)',
  fontWeight: 400,
  fontSize: 64,
  lineHeight: 1.06,
  color: '#f2f3e5',
  letterSpacing: '1.5px',
  textAlign: 'center',
  margin: 0,
}

const LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#a4a59f',
  letterSpacing: '-0.1px',
  margin: 0,
}

const DESC_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 16,
  fontWeight: 500,
  color: '#f2f3e5',
  letterSpacing: '-0.1px',
  lineHeight: 1.25,
  margin: 0,
}

const HINT_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 12,
  fontWeight: 500,
  color: '#a4a59f',
  margin: 0,
}

const STATE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-student-body)',
  fontSize: 10,
  fontWeight: 500,
  color: '#a4a59f',
  letterSpacing: '0.1px',
}

const CARD_BASE: CSSProperties = {
  borderRadius: 20,
  border: '1px solid #444450',
  background: '#1f1f25',
  padding: 24,
  boxSizing: 'border-box',
}

/**
 * "Log out", for credential sessions only.
 *
 * **Why it is conditional.** An LTI user's session belongs to Canvas — we hold
 * no credential of theirs and clearing our cookie would end nothing. A log-out
 * button there would either do visibly nothing or imply we can sign them out of
 * Canvas, and neither is a control worth shipping. So it exists only when there
 * is a session of ours to end.
 *
 * **Why a plain `<form>` and not RR's `<Form>`.** This is the one navigation in
 * the app that must not stay inside the client router. A `<Form>` submits by
 * fetch and then client-navigates, which leaves the router's loader cache — and
 * every already-rendered authenticated screen — alive in memory behind the login
 * page; `_persona.tsx`'s `shouldRevalidate` deliberately skips the gate on GET
 * navigations, so a back-button press would re-render the authenticated view
 * from that cache without ever re-asking whether the user is still signed in. A
 * document POST tears the whole client down: the browser follows `/logout`'s
 * redirect as a fresh page load, and any subsequent navigation re-enters
 * through the gate. Correctness here is worth losing the SPA transition.
 *
 * `/logout` is `POST`-only (a GET logout is triggerable by a prefetch), and
 * clears the cookie unconditionally — see the route module.
 */
function LogOutForm() {
  return (
    <form
      method="post"
      action="/logout"
      style={{ position: 'absolute', left: 24, bottom: 31, margin: 0 }}
    >
      <button
        type="submit"
        className="st-logout-btn"
        style={{
          height: 48,
          padding: '0 24px',
          borderRadius: 8,
          border: 'none',
          background: '#2b2b35',
          color: 'rgba(242,243,229,0.7)',
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: '-0.1px',
          cursor: 'pointer',
          transition: 'background 120ms, color 120ms, opacity 120ms',
        }}
      >
        Log out
      </button>
    </form>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const fetcher = useFetcher<{ saved: boolean }>()
  const base = useStudentNavBase()
  const sessionKind = useSessionKind()

  // Initial snapshot for the dirty check (`initialAvatar` / `initialToggles`).
  const [initial] = useState(() => ({
    avatar: readInitialAvatar(),
    t1: readInitialToggle(1),
    t2: readInitialToggle(2),
  }))

  const [tab, setTab] = useState<Tab>('avatar')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(initial.avatar)
  const [toggles, setToggles] = useState<Record<1 | 2, boolean>>({ 1: initial.t1, 2: initial.t2 })

  const dirty =
    selectedAvatar !== initial.avatar || toggles[1] !== initial.t1 || toggles[2] !== initial.t2

  function togglePrivacy(n: 1 | 2) {
    setToggles((prev) => ({ ...prev, [n]: !prev[n] }))
  }

  function saveSettings() {
    if (!dirty) return
    const spec = SETTINGS_AVATARS.find((a) => a.id === selectedAvatar) ?? SETTINGS_AVATARS[2]
    studentStorage.setAvatar(spec.src)
    studentStorage.setAvatarBg(spec.bg)
    studentStorage.setAvatarId(String(selectedAvatar))
    studentStorage.setPrivacy(1, toggles[1])
    studentStorage.setPrivacy(2, toggles[2])

    // The avatar also goes to the gateway, so this screen and onboarding
    // cannot leave the record disagreeing with what the hub pages draw.
    // Deliberately not awaited: Save navigates away immediately, exactly as it
    // did before, and the action logs its own failures. Privacy stays local —
    // `bp_privacy_1/2` have no gateway operation behind them yet.
    fetcher.submit({ avatarSlug: spec.slug }, { method: 'post' })

    // Return target: bp_settings_from (in-app path) → hub index fallback.
    const from = studentStorage.getSettingsFrom()
    if (from && from.startsWith('/')) navigate(from)
    else navigate(base)
  }

  return (
    <StudentStage style={{ backgroundColor: '#1f1f25' }} data-testid="settings">
      <style>{SETTINGS_CSS}</style>

      {/* Back button → history.back() (settings.html:179-183) */}
      <button
        type="button"
        aria-label="Back"
        className="st-back-btn"
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          left: 24,
          top: 48,
          width: 48,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.16)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 120ms',
          zIndex: 10,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="#f2f3e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Header: title + tabs (settings.html:186-192) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 52,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 48,
          pointerEvents: 'none',
        }}
      >
        <h1 style={{ ...TITLE_STYLE, pointerEvents: 'auto' }}>{SETTINGS_COPY.title}</h1>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <TabButton label={SETTINGS_COPY.tabAvatar} active={tab === 'avatar'} onClick={() => setTab('avatar')} />
          <TabButton label={SETTINGS_COPY.tabPrivacy} active={tab === 'privacy'} onClick={() => setTab('privacy')} />
        </div>
      </div>

      {/* Panels — centered between tabs and save button (settings.html:195-260) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 211,
          bottom: 79,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Avatar panel */}
        <div
          style={{
            display: tab === 'avatar' ? 'flex' : 'none',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              ...CARD_BASE,
              width: 730,
              height: 350,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
            }}
          >
            {SETTINGS_AVATARS.map((av) => (
              <button
                key={av.id}
                type="button"
                aria-label={`Avatar ${av.id}`}
                className={`st-avatar-opt${selectedAvatar === av.id ? ' selected' : ''}`}
                onClick={() => setSelectedAvatar(av.id)}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 99,
                  border: 'none',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  flexShrink: 0,
                  position: 'relative',
                  padding: 0,
                  background: av.bg,
                  transition: 'transform 120ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
              >
                <img
                  src={av.src}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Privacy panel */}
        <div
          style={{
            display: tab === 'privacy' ? 'flex' : 'none',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {PRIVACY_ROWS.map((row) => (
            <div key={row.label} style={{ ...CARD_BASE, width: 500, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  borderBottom: '1px solid #444450',
                }}
              >
                <p style={LABEL_STYLE}>{row.label}</p>
                {row.kind === 'toggle' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={STATE_STYLE}>{toggles[row.toggle] ? SETTINGS_COPY.toggleOn : SETTINGS_COPY.toggleOff}</span>
                    <button
                      type="button"
                      aria-label={`Toggle ${row.label}`}
                      className={`st-toggle${toggles[row.toggle] ? '' : ' off'}`}
                      onClick={() => togglePrivacy(row.toggle)}
                      style={{
                        width: 32,
                        height: 20,
                        borderRadius: 10,
                        background: toggles[row.toggle] ? '#219653' : '#444450',
                        position: 'relative',
                        cursor: 'pointer',
                        border: 'none',
                        padding: 0,
                        transition: 'background 160ms',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#444450',
                      border: 'none',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="7" width="10" height="8" rx="2" fill="#f2f3e5" />
                      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="#f2f3e5" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={DESC_STYLE}>{row.desc}</p>
                <p style={HINT_STYLE}>{row.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button (settings.html:263) */}
      <button
        type="button"
        className="st-save-btn"
        onClick={saveSettings}
        disabled={!dirty}
        style={{
          position: 'absolute',
          bottom: 31,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 270,
          height: 48,
          borderRadius: 8,
          background: '#f2f3e5',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-student-body)',
          fontSize: 16,
          fontWeight: 500,
          color: '#1f1f25',
          letterSpacing: '-0.1px',
          transition: 'opacity 120ms',
        }}
      >
        {SETTINGS_COPY.save}
      </button>

      {/* Credential sessions only — see LogOutForm. */}
      {sessionKind === 'bp' && <LogOutForm />}
    </StudentStage>
  )
}

// ── Tab button ──────────────────────────────────────────────────────────────

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 43,
        padding: '0 20px',
        borderRadius: 12,
        border: 'none',
        fontFamily: 'var(--font-student-body)',
        fontSize: 16,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 120ms, color 120ms',
        background: active ? '#f2f3e5' : '#2b2b35',
        color: active ? '#2b2b35' : 'rgba(242,243,229,0.5)',
      }}
    >
      {label}
    </button>
  )
}
