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
 *  - **One-shot flags** (`consume*`): read-and-remove, matching `today.html`'s
 *    done-flag consumption (`today.html:1102-1109`).
 *  - **Dual-store keys** (`bp_write_text`, `bp_journal_q1/q2`): written to BOTH
 *    localStorage and sessionStorage; the journal renders the *session* copy
 *    (research §B, `write-it-out.html:285-286`, `journal.html:1344-1345`).
 *  - **JSON-array keys** (`bp_mood_emotions`, `bp_today_sections`, `bp_saved`,
 *    `bp_journal_notes`, `bp_session_done`): parsed/serialised transparently.
 *  - **Lazy defaults** baked to match the prototype's read sites: `bp_sparks`
 *    ⇒ `360` (`today.html:732`), `bp_today_sections` ⇒ `["mood"]`
 *    (`today.html:920`).
 *
 * This adapter is the single point future backend sessions replace key-by-key;
 * screens never touch `window.localStorage` directly.
 */

// ── Storage keys (research §B) ───────────────────────────────────────────────

export const BP_KEYS = {
  // profile
  username: "bp_username",
  avatar: "bp_avatar",
  avatarBg: "bp_avatar_bg",
  avatarId: "bp_avatar_id",
  privacy1: "bp_privacy_1",
  privacy2: "bp_privacy_2",
  // mood check-in
  moodEmotions: "bp_mood_emotions",
  moodReasons: "bp_mood_reasons",
  moodDone: "bp_mood_done",
  freshStart: "bp_fresh_start",
  // wins card
  winsNote: "bp_wins_note",
  winsQuestion: "bp_wins_question",
  winsDone: "bp_wins_done",
  // write card
  writeText: "bp_write_text",
  writeDone: "bp_write_done",
  // about-you card
  aboutEmoji: "bp_about_emoji",
  aboutQuestion: "bp_about_question",
  aboutDone: "bp_about_done",
  // journal
  journalQ1: "bp_journal_q1",
  journalQ2: "bp_journal_q2",
  journalNotes: "bp_journal_notes",
  // grades
  gradesNote: "bp_grades_note",
  // economy / hub state
  sparks: "bp_sparks",
  todaySections: "bp_today_sections",
  saved: "bp_saved",
  sessionDone: "bp_session_done",
  // gates / one-shots
  videoWatched: "bp_video_watched",
  tourDone: "bp_tour_done",
  /**
   * Onboarding completion (decision D6). NOT from the prototype — the first
   * `bp_*` key this app adds on its own, because a credential login has to
   * decide between "new here" and "back again" and the prototype never had a
   * login to decide it for. Device-scoped like everything else in this model:
   * the same account on a second device walks the onboarding once more, which
   * is accepted until the data migration moves these keys server-side.
   */
  onboardingDone: "bp_onboarding_done",
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
  // ---- Profile -------------------------------------------------------------
  // Raw reads (no display defaults — `useStudentProfile` layers the 'Sophie' /
  // avatar-3 / #b8c0ed fallbacks at the read site, matching `today.html:740-754`).
  getUsername: (): string | null => readRaw("local", BP_KEYS.username),
  setUsername: (name: string) => writeRaw("local", BP_KEYS.username, name),
  getAvatar: (): string | null => readRaw("local", BP_KEYS.avatar),
  setAvatar: (src: string) => writeRaw("local", BP_KEYS.avatar, src),
  getAvatarBg: (): string | null => readRaw("local", BP_KEYS.avatarBg),
  setAvatarBg: (bg: string) => writeRaw("local", BP_KEYS.avatarBg, bg),
  getAvatarId: (): string | null => readRaw("local", BP_KEYS.avatarId),
  setAvatarId: (id: string) => writeRaw("local", BP_KEYS.avatarId, id),

  /** Privacy toggles — written by settings as `String(boolean)` (`settings.html:359-360`). */
  getPrivacy: (n: 1 | 2): boolean =>
    readRaw("local", n === 1 ? BP_KEYS.privacy1 : BP_KEYS.privacy2) === "true",
  setPrivacy: (n: 1 | 2, on: boolean) =>
    writeRaw("local", n === 1 ? BP_KEYS.privacy1 : BP_KEYS.privacy2, String(on)),

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

  /** Session one-shot: mood check-in just completed (`mood-checkin.html:913`). */
  getFreshStart: (): boolean => readFlag("session", BP_KEYS.freshStart),
  setFreshStart: (on: boolean) => setFlag("session", BP_KEYS.freshStart, on),
  consumeFreshStart: (): boolean => consumeFlag("session", BP_KEYS.freshStart),

  // ---- Wins card -----------------------------------------------------------
  getWinsNote: (): string | null => readRaw("local", BP_KEYS.winsNote),
  getWinsQuestion: (): string | null => readRaw("local", BP_KEYS.winsQuestion),
  setWins: (note: string, question: string) => {
    writeRaw("local", BP_KEYS.winsNote, note);
    writeRaw("local", BP_KEYS.winsQuestion, question);
    setFlag("local", BP_KEYS.winsDone, true);
  },
  /** One-shot done flag consumed by the hub on next load. */
  consumeWinsDone: (): boolean => consumeFlag("local", BP_KEYS.winsDone),

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
    setFlag("local", BP_KEYS.writeDone, true);
  },
  /** Copy the durable local write-text into the session store (`goJournal`, `today.html:865-866`). */
  promoteWriteTextToSession: () => {
    const note = readRaw("local", BP_KEYS.writeText);
    if (note !== null) writeRaw("session", BP_KEYS.writeText, note);
  },
  /** Inject a note directly into the session store (`journal?wt=`, `journal.html:802-804`). */
  injectWriteTextSession: (text: string) =>
    writeRaw("session", BP_KEYS.writeText, text),
  consumeWriteDone: (): boolean => consumeFlag("local", BP_KEYS.writeDone),

  // ---- About-you card ------------------------------------------------------
  getAboutEmoji: (): string | null => readRaw("local", BP_KEYS.aboutEmoji),
  setAbout: (emoji: string) => {
    writeRaw("local", BP_KEYS.aboutEmoji, emoji);
    setFlag("local", BP_KEYS.aboutDone, true);
  },
  /**
   * A catalogue question's answer: the question (which the summary card shows)
   * and the picked option's emoji, if it had one. Marks the card done like
   * {@link setAbout}, which stays the path for the prototype's emoji grid.
   */
  setAboutAnswer: (question: string, emoji: string | null) => {
    writeRaw("local", BP_KEYS.aboutQuestion, question);
    if (emoji) writeRaw("local", BP_KEYS.aboutEmoji, emoji);
    else removeRaw("local", BP_KEYS.aboutEmoji);
    setFlag("local", BP_KEYS.aboutDone, true);
  },
  /** Written by {@link setAboutAnswer}; the prototype never wrote it (`summary.html:432`). */
  getAboutQuestion: (): string => readRaw("local", BP_KEYS.aboutQuestion) ?? "",
  consumeAboutDone: (): boolean => consumeFlag("local", BP_KEYS.aboutDone),

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

  // ---- Grades --------------------------------------------------------------
  /** Write-only in the prototype (`grades.html:1289`) — no read site. */
  setGradesNote: (note: string) => writeRaw("local", BP_KEYS.gradesNote, note),
  getGradesNote: (): string | null => readRaw("local", BP_KEYS.gradesNote),

  // ---- Economy -------------------------------------------------------------
  /** Sparks balance, lazily defaulting to 360 (`today.html:732`, `sparks.html:686`). */
  getSparks: (): number => {
    const raw = readRaw("local", BP_KEYS.sparks);
    const n = parseInt(raw ?? "360", 10);
    return Number.isNaN(n) ? 360 : n;
  },
  setSparks: (total: number) => writeRaw("local", BP_KEYS.sparks, String(total)),
  /** Lazy-init to 360 if unset (mirrors `today.html:732`). Returns the balance. */
  ensureSparks: (): number => {
    if (readRaw("local", BP_KEYS.sparks) === null) {
      writeRaw("local", BP_KEYS.sparks, "360");
    }
    return studentStorage.getSparks();
  },

  // ---- Today sections (durable card completion) ---------------------------
  /** Completed hub sections, defaulting to `["mood"]` (`today.html:920`). */
  getTodaySections: (): string[] =>
    readJson<string[]>("local", BP_KEYS.todaySections, ["mood"]),
  setTodaySections: (sections: string[]) =>
    writeJson("local", BP_KEYS.todaySections, sections),
  /** Append a section if not already present (`today.html:921`). */
  addTodaySection: (section: string): string[] => {
    const sections = readJson<string[]>("local", BP_KEYS.todaySections, [
      "mood",
    ]);
    if (!sections.includes(section)) sections.push(section);
    writeJson("local", BP_KEYS.todaySections, sections);
    return sections;
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

  // ---- Session-scoped queue + cross-page animation flags ------------------
  /** Per-tab completed-card order (`today.html:915-916`). */
  getSessionDone: (): string[] =>
    readJson<string[]>("session", BP_KEYS.sessionDone, []),
  addSessionDone: (id: string): string[] => {
    const sd = readJson<string[]>("session", BP_KEYS.sessionDone, []);
    if (!sd.includes(id)) sd.push(id);
    writeJson("session", BP_KEYS.sessionDone, sd);
    return sd;
  },
  clearSessionDone: () => removeRaw("session", BP_KEYS.sessionDone),

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

  /**
   * Onboarding completion (D6) — the flag `/student`'s `clientLoader` reads to
   * decide whether a returning user lands on the hub or walks the onboarding
   * again. Set by `onboarding-v2/CompleteScreen` on the way out.
   *
   * Same `readFlag`/`setFlag` `'1'` convention as every other gate here, so the
   * dev storage inspector and `rawStore.wipeAll()` treat it like the rest — a
   * wipe puts the device back to "new here", which is exactly what a tester
   * wants from it.
   */
  getOnboardingDone: (): boolean => readFlag("local", BP_KEYS.onboardingDone),
  setOnboardingDone: (on: boolean) =>
    setFlag("local", BP_KEYS.onboardingDone, on),

  // ---- Return-navigation ---------------------------------------------------
  /** Where settings should return to (`settings.html:362-367`). */
  getSettingsFrom: (): string | null => readRaw("session", BP_KEYS.settingsFrom),
  setSettingsFrom: (from: string) =>
    writeRaw("session", BP_KEYS.settingsFrom, from),

  /** Write-only scale cache (`today.html:864`) — never read; kept for parity. */
  setScale: (scale: string) => writeRaw("session", BP_KEYS.scale, scale),
} as const;
