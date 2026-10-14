/**
 * Student-app storage adapter — the typed seam over the prototype's `bp_*`
 * localStorage / sessionStorage model (research §B).
 *
 * The prototype's *entire* data layer is ~30 `bp_*` keys. This module reproduces
 * that model 1:1 while encoding its quirks as explicit API semantics:
 *
 *  - **SSR-safe**: every accessor no-ops (returns its default) when there is no
 *    `window`, and swallows `SecurityError` from partitioned/blocked storage
 *    (Safari ITP, Chrome storage partitioning). Screens read/write through here
 *    so a future cookie/server fallback lands in one place.
 *  - **One-shot flags** (`consume*`): read-and-remove cross-page animation
 *    triggers (`bp_enter_anim`, `bp_skip_success`).
 *  - **JSON-array keys** (`bp_mood_emotions`): parsed/serialised transparently.
 *
 * Step-24 removed the journal (`bp_write_text`, `bp_journal_q1/q2`,
 * `bp_journal_notes`) and toolkit (`bp_saved`, `bp_video_watched`) keys:
 * those are `listJournals` / `createJournal` and `ContentInteraction` now.
 *
 * This adapter is the single point future backend sessions replace key-by-key;
 * screens never touch `window.localStorage` directly.
 */

// ── Storage keys (research §B) ───────────────────────────────────────────────

export const BP_KEYS = {
  // profile. `username: "bp_username"` was removed in step-7: the name comes
  // from the session (`me { preferred_name }` / the LTI claims), and a copy in
  // storage had no way to notice the record had changed. The avatar keys went
  // in step-23 for the same reason: it is `me.user.avatar`.
  // The privacy toggles and the onboarding flag were removed in step-22: both
  // are the server's now (`myPrivacySettings`, `me.user.onboardingCompletedAt`).
  // mood check-in
  moodEmotions: "bp_mood_emotions",
  moodReasons: "bp_mood_reasons",
  moodDone: "bp_mood_done",
  // wins card
  winsNote: "bp_wins_note",
  winsQuestion: "bp_wins_question",
  // The about-you keys went in step-30: the answer is `answerQuestion`, and
  // the summary reads it back from `studentActivity`.
  // The spark balance, today's sections, the per-card done flags and the
  // per-tab done queue went in step-23: `sparkBalance` / `dailyCards` decide.
  // gates / one-shots
  tourDone: "bp_tour_done",
  // session cross-page flags
  enterAnim: "bp_enter_anim",
  skipSuccess: "bp_skip_success",
  settingsFrom: "bp_settings_from",
  scale: "bp_scale",
} as const;

export type BpKey = (typeof BP_KEYS)[keyof typeof BP_KEYS];

// ── SSR-safe low-level access ────────────────────────────────────────────────

type Backend = "local" | "session";

function store(backend: Backend): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return backend === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readRaw(backend: Backend, key: string): string | null {
  try {
    return store(backend)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeRaw(backend: Backend, key: string, value: string): void {
  try {
    store(backend)?.setItem(key, value);
  } catch {
    /* partitioned / full / disabled — no-op, mirrors prototype try/catch */
  }
}

function removeRaw(backend: Backend, key: string): void {
  try {
    store(backend)?.removeItem(key);
  } catch {
    /* no-op */
  }
}

function readJson<T>(backend: Backend, key: string, fallback: T): T {
  const raw = readRaw(backend, key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(backend: Backend, key: string, value: unknown): void {
  writeRaw(backend, key, JSON.stringify(value));
}

/** Prototype flag convention: present-and-`'1'` means set. */
function readFlag(backend: Backend, key: string): boolean {
  return readRaw(backend, key) === "1";
}

function setFlag(backend: Backend, key: string, on: boolean): void {
  if (on) writeRaw(backend, key, "1");
  else removeRaw(backend, key);
}

/** Read-and-remove one-shot flag (`today.html:1102-1109`). */
function consumeFlag(backend: Backend, key: string): boolean {
  const on = readFlag(backend, key);
  if (on) removeRaw(backend, key);
  return on;
}

// ── Generic escape hatch (dev inspector, future keys) ────────────────────────

export const rawStore = {
  getLocal: (key: string) => readRaw("local", key),
  getSession: (key: string) => readRaw("session", key),
  setLocal: (key: string, value: string) => writeRaw("local", key, value),
  setSession: (key: string, value: string) => writeRaw("session", key, value),
  removeLocal: (key: string) => removeRaw("local", key),
  removeSession: (key: string) => removeRaw("session", key),
  /** Snapshot every `bp_*` key in a backend (for the dev storage inspector). */
  dump(backend: Backend): Record<string, string> {
    const s = store(backend);
    if (!s) return {};
    const out: Record<string, string> = {};
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith("bp_")) out[k] = s.getItem(k) ?? "";
      }
    } catch {
      /* no-op */
    }
    return out;
  },
  /** Wildcard-wipe every `bp_*` key across both stores (`debug-storage.html`). */
  wipeAll(): void {
    (["local", "session"] as const).forEach((backend) => {
      const s = store(backend);
      if (!s) return;
      try {
        const keys: string[] = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k && k.startsWith("bp_")) keys.push(k);
        }
        keys.forEach((k) => s.removeItem(k));
      } catch {
        /* no-op */
      }
    });
  },
} as const;

// ── Typed accessors ──────────────────────────────────────────────────────────

export const studentStorage = {
  // ---- Mood check-in -------------------------------------------------------
  /** Selected emotion keys, in pick order (`mood-checkin.html:895`). */
  getMoodEmotions: (): string[] =>
    readJson<string[]>("local", BP_KEYS.moodEmotions, []),
  setMoodEmotions: (keys: string[]) =>
    writeJson("local", BP_KEYS.moodEmotions, keys),
  /** Selected reason chip labels (`mood-checkin.html:898`). */
  getMoodReasons: (): string[] =>
    readJson<string[]>("local", BP_KEYS.moodReasons, []),
  setMoodReasons: (reasons: string[]) =>
    writeJson("local", BP_KEYS.moodReasons, reasons),
  /** Write-only in the prototype (`mood-checkin.html:912`) — no read site. */
  setMoodDone: (done: boolean) => setFlag("local", BP_KEYS.moodDone, done),
  getMoodDone: (): boolean => readFlag("local", BP_KEYS.moodDone),

  // ---- Wins card -----------------------------------------------------------
  getWinsNote: (): string | null => readRaw("local", BP_KEYS.winsNote),
  getWinsQuestion: (): string | null => readRaw("local", BP_KEYS.winsQuestion),
  setWins: (note: string, question: string) => {
    writeRaw("local", BP_KEYS.winsNote, note);
    writeRaw("local", BP_KEYS.winsQuestion, question);
  },

  // ---- Cross-page animation flags ----------------------------------------
  /** Cross-page entry-animation flag (`today.html:712-713`). One-shot. */
  getEnterAnim: (): boolean => readFlag("session", BP_KEYS.enterAnim),
  setEnterAnim: (on: boolean) => setFlag("session", BP_KEYS.enterAnim, on),
  consumeEnterAnim: (): boolean => consumeFlag("session", BP_KEYS.enterAnim),

  /** Skip the success takeover on next hub load (`today.html:938-939`). One-shot. */
  getSkipSuccess: (): boolean => readFlag("session", BP_KEYS.skipSuccess),
  setSkipSuccess: (on: boolean) => setFlag("session", BP_KEYS.skipSuccess, on),
  consumeSkipSuccess: (): boolean => consumeFlag("session", BP_KEYS.skipSuccess),

  // ---- Gates ---------------------------------------------------------------
  /** Spotlight-tour completion (`today.html:1349`). */
  getTourDone: (): boolean => readFlag("local", BP_KEYS.tourDone),
  setTourDone: (on: boolean) => setFlag("local", BP_KEYS.tourDone, on),

  // ---- Return-navigation ---------------------------------------------------
  /** Where settings should return to (`settings.html:362-367`). */
  getSettingsFrom: (): string | null => readRaw("session", BP_KEYS.settingsFrom),
  setSettingsFrom: (from: string) =>
    writeRaw("session", BP_KEYS.settingsFrom, from),

  /** Write-only scale cache (`today.html:864`) — never read; kept for parity. */
  setScale: (scale: string) => writeRaw("session", BP_KEYS.scale, scale),
} as const;
