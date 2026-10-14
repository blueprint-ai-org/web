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
 *  - **Dual-store keys** (`bp_write_text`, `bp_journal_q1/q2`): written to BOTH
 *    localStorage and sessionStorage; the journal renders the *session* copy
 *    (research §B, `write-it-out.html:285-286`, `journal.html:1344-1345`).
 *  - **JSON-array keys** (`bp_mood_emotions`, `bp_saved`, `bp_journal_notes`):
 *    parsed/serialised transparently.
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
  // write card
  writeText: "bp_write_text",
  // about-you card
  aboutEmoji: "bp_about_emoji",
  aboutQuestion: "bp_about_question",
  // journal
  journalQ1: "bp_journal_q1",
  journalQ2: "bp_journal_q2",
  journalNotes: "bp_journal_notes",
  // The spark balance, today's sections, the per-card done flags and the
  // per-tab done queue went in step-23: `sparkBalance` / `dailyCards` decide.
  saved: "bp_saved",
  // gates / one-shots
  videoWatched: "bp_video_watched",
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

// ── Note shape (bp_journal_notes) ────────────────────────────────────────────

export interface JournalNote {
  readonly text: string;
  readonly date: string;
}

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

  // ---- Write card (dual-store) --------------------------------------------
  /**
   * Write-it-out text. Written to BOTH stores; the hub copies local→session on
   * the way to the journal, which renders the session copy ("today's notes
   * only"). Pass `backend` to pick which copy to read.
   */
  getWriteText: (backend: Backend = "local"): string | null =>
    readRaw(backend, BP_KEYS.writeText),
  setWriteText: (text: string) => {
    writeRaw("session", BP_KEYS.writeText, text);
    writeRaw("local", BP_KEYS.writeText, text);
  },
  /** Copy the durable local write-text into the session store (`goJournal`, `today.html:865-866`). */
  promoteWriteTextToSession: () => {
    const note = readRaw("local", BP_KEYS.writeText);
    if (note !== null) writeRaw("session", BP_KEYS.writeText, note);
  },
  /** Inject a note directly into the session store (`journal?wt=`, `journal.html:802-804`). */
  injectWriteTextSession: (text: string) =>
    writeRaw("session", BP_KEYS.writeText, text),

  // ---- About-you card ------------------------------------------------------
  getAboutEmoji: (): string | null => readRaw("local", BP_KEYS.aboutEmoji),
  setAbout: (emoji: string) => {
    writeRaw("local", BP_KEYS.aboutEmoji, emoji);
  },
  /**
   * A catalogue question's answer: the question (which the summary card shows)
   * and the picked option's emoji, if it had one. {@link setAbout} stays the
   * path for the prototype's emoji grid.
   */
  setAboutAnswer: (question: string, emoji: string | null) => {
    writeRaw("local", BP_KEYS.aboutQuestion, question);
    if (emoji) writeRaw("local", BP_KEYS.aboutEmoji, emoji);
    else removeRaw("local", BP_KEYS.aboutEmoji);
  },
  /** Written by {@link setAboutAnswer}; the prototype never wrote it (`summary.html:432`). */
  getAboutQuestion: (): string => readRaw("local", BP_KEYS.aboutQuestion) ?? "",

  // ---- Journal (q1/q2 dual-store; notes array) ----------------------------
  getJournalAnswer: (
    q: 1 | 2,
    backend: Backend = "local",
  ): string | null => readRaw(backend, q === 1 ? BP_KEYS.journalQ1 : BP_KEYS.journalQ2),
  setJournalAnswer: (q: 1 | 2, text: string) => {
    const key = q === 1 ? BP_KEYS.journalQ1 : BP_KEYS.journalQ2;
    writeRaw("session", key, text);
    writeRaw("local", key, text);
  },
  /** All saved notes, newest-first (`journal.html:1119`). */
  getJournalNotes: (): JournalNote[] =>
    readJson<JournalNote[]>("local", BP_KEYS.journalNotes, []),
  /** Prepend a note (prototype `unshift`, `journal.html:1157-1159`). */
  addJournalNote: (note: JournalNote): JournalNote[] => {
    const notes = readJson<JournalNote[]>("local", BP_KEYS.journalNotes, []);
    const next = [note, ...notes];
    writeJson("local", BP_KEYS.journalNotes, next);
    return next;
  },

  // ---- Saved / hearted toolkit items --------------------------------------
  /**
   * Hearted item ids. The prototype has two divergent seed defaults —
   * `["v2"]` (toolkit, `my-toolkit.html:702`) vs `["v1"]` (grades,
   * `grades.html:1318`). The adapter unifies the *mechanism* (JSON array,
   * SSR-safe); each caller still passes its own seed so 1:1 behaviour is
   * preserved until the backend session reconciles them.
   */
  getSaved: (fallback: string[] = []): string[] =>
    readJson<string[]>("local", BP_KEYS.saved, fallback),
  setSaved: (ids: string[]) => writeJson("local", BP_KEYS.saved, ids),

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
  /** Toolkit simple→full view gate (`toolkit-video.html:484`). */
  getVideoWatched: (): boolean => readFlag("local", BP_KEYS.videoWatched),
  setVideoWatched: (on: boolean) => setFlag("local", BP_KEYS.videoWatched, on),

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
