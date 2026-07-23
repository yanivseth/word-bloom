import type { Child, ChildProfile, Phrase, WordClassification } from "./types";
import { generatePhrases, classifyWord } from "./engine";
import { ageInMonths } from "./utils";

const CHILD_KEY = "wordbloom_child";
const WORDS_KEY = "wordbloom_words";
const CHILD_ID_KEY = "wordbloom_childId";
const ACTIVE_CHILD_ID_KEY = "wordbloom_activeChildId";
const PREMIUM_KEY = "wordbloom_premium";
const SESSION_KEY = "wordbloom_session";
const SETUP_DRAFT_KEY = "wordbloom_setup_draft";

// ── localStorage helpers ───────────────────────────────────────────────────

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

function lsRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // silently fail
  }
}

// ── Session token management ───────────────────────────────────────────────

export function getSession(): string | null {
  return lsGet(SESSION_KEY);
}

export function setSession(token: string): void {
  lsSet(SESSION_KEY, token);
}

export function clearSession(): void {
  lsRemove(SESSION_KEY);
}

// ── Account lookup (via session token) ─────────────────────────────────────

/**
 * Resolve the current account by verifying the session token against the DB.
 * Returns null if no valid session exists. Falls back to old childId pattern
 * when the DB is unavailable.
 */
export async function getAccount(): Promise<{
  id: number;
  email: string;
  isPremium: boolean;
  childId: number | null;
  childName: string | null;
  childBirthDate: string | null;
} | null> {
  const token = getSession();
  if (!token) return null;

  try {
    const { getAccountByToken } = await import("~/db/queries");
    const account = await getAccountByToken({ data: { token } });
    return account;
  } catch {
    return null;
  }
}

// ── Setup draft (try-it preview → signup handoff) ──────────────────────────

/**
 * A pre-signup draft captured from the landing "try it" preview, carried into
 * /setup so the parent doesn't re-enter what they just typed. Stored separately
 * from the real child record (CHILD_KEY) so it never trips hasChildProfile().
 */
export interface SetupDraft {
  birthDate: string;
  words: string[];
}

export function saveSetupDraft(draft: SetupDraft): void {
  lsSet(SETUP_DRAFT_KEY, JSON.stringify(draft));
}

export function getSetupDraft(): SetupDraft | null {
  const raw = lsGet(SETUP_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SetupDraft;
    if (typeof parsed?.birthDate !== "string") return null;
    return { birthDate: parsed.birthDate, words: parsed.words ?? [] };
  } catch {
    return null;
  }
}

export function clearSetupDraft(): void {
  lsRemove(SETUP_DRAFT_KEY);
}

// ── Magic-link login ───────────────────────────────────────────────────────

/**
 * Request a magic sign-in link. Returns whether the email was actually sent,
 * whether it's a new account, and (only in degraded mode, when no email
 * provider is configured) a `devToken` the caller can use to finish sign-in
 * directly — keeping the app usable before RESEND_API_KEY is set.
 */
export async function requestMagicLink(email: string): Promise<{
  ok: boolean;
  sent: boolean;
  isNew: boolean;
  devToken?: string;
  error?: string;
}> {
  try {
    const { requestMagicLink: dbRequest } = await import("~/db/queries");
    const result = await dbRequest({ data: { email: email.toLowerCase().trim() } });
    if (!result.ok) {
      return { ok: false, sent: false, isNew: false, error: result.error };
    }
    return {
      ok: true,
      sent: result.sent,
      isNew: result.isNew,
      devToken: "devToken" in result ? result.devToken : undefined,
    };
  } catch {
    return {
      ok: false,
      sent: false,
      isNew: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

/**
 * Complete a magic-link sign-in from a token. On success, stores the session
 * token + premium cache and hydrates the child locally, then returns where to
 * go next.
 */
export async function verifyMagicLink(token: string): Promise<{
  ok: boolean;
  hasChild: boolean;
  reason?: string;
}> {
  try {
    const { verifyMagicLink: dbVerify } = await import("~/db/queries");
    const result = await dbVerify({ data: { token } });
    if (!result.ok) {
      return { ok: false, hasChild: false, reason: result.reason };
    }

    setSession(result.sessionToken);
    lsSet(PREMIUM_KEY, String(result.isPremium));

    if (result.childId && result.childName) {
      setChildId(result.childId);
      setActiveChildId(result.childId);
      try {
        const { getWords: dbGetWords } = await import("~/db/queries");
        const dbWords = await dbGetWords({ data: { childId: result.childId } });
        saveChild({
          name: result.childName,
          birthDate: result.childBirthDate ?? "",
          words: dbWords ?? [],
        });
      } catch {
        saveChild({
          name: result.childName,
          birthDate: result.childBirthDate ?? "",
          words: [],
        });
      }
    }

    return { ok: true, hasChild: Boolean(result.childId) };
  } catch {
    return { ok: false, hasChild: false, reason: "error" };
  }
}

// ── Setup / restore account ────────────────────────────────────────────────

/**
 * Setup or restore an account by email.
 *
 * - If the email already exists: restores the session silently, returns the
 *   existing linked child data (if any).
 * - If the email is new: creates an account, creates a child linked to it.
 *
 * Returns the account info with child data, or null on failure.
 */
export async function setupAccount(
  email: string,
  name?: string,
  birthDate?: string,
  words?: string[],
): Promise<{
  accountId: number;
  email: string;
  isPremium: boolean;
  childId: number | null;
  childName: string | null;
  childBirthDate: string | null;
  isNew: boolean;
} | null> {
  const cleanEmail = email.toLowerCase().trim();

  try {
    const { createAccount, getAccountByEmail, createChild, linkChildToAccount } =
      await import("~/db/queries");

    // Check if account exists
    const existing = await getAccountByEmail({ data: { email: cleanEmail } });

    if (existing) {
      // Returning parent — create a fresh session token
      const result = await createAccount({ data: { email: cleanEmail } });
      if ("error" in result) throw new Error(result.error);
      setSession(result.sessionToken);

      // Get full account + child data via the new token
      const { getAccountByToken } = await import("~/db/queries");
      const fullAccount = await getAccountByToken({
        data: { token: result.sessionToken },
      });

      // Update localStorage premium cache
      lsSet(PREMIUM_KEY, String(fullAccount?.isPremium ?? false));

      // Sync local child data from the account's child
      if (fullAccount?.childId && fullAccount.childName) {
        setChildId(fullAccount.childId);
        const existingChild = getChild();
        if (!existingChild || existingChild.name !== fullAccount.childName) {
          // Load words from DB
          const { getWords: dbGetWords } = await import("~/db/queries");
          const dbWords = await dbGetWords({
            data: { childId: fullAccount.childId },
          });
          saveChild({
            name: fullAccount.childName,
            birthDate: fullAccount.childBirthDate ?? birthDate ?? "",
            words: dbWords ?? [],
          });
        }
      }

      return {
        accountId: result.id,
        email: cleanEmail,
        isPremium: result.isPremium,
        childId: fullAccount?.childId ?? null,
        childName: fullAccount?.childName ?? null,
        childBirthDate: fullAccount?.childBirthDate ?? null,
        isNew: false,
      };
    }

    // New account
    const result = await createAccount({ data: { email: cleanEmail } });
    if ("error" in result) throw new Error(result.error);
    setSession(result.sessionToken);
    lsSet(PREMIUM_KEY, String(result.isPremium));

    // Create child if name/birthDate provided
    let childId: number | null = null;
    if (name && birthDate) {
      const childResult = await createChild({
        data: { name, birthDate, accountId: result.id },
      });
      if ("id" in childResult) {
        childId = childResult.id;
        setChildId(childId);

        // Save locally too
        saveChild({
          name,
          birthDate,
          words: words ?? [],
        });

        // Sync words to DB
        if (words && words.length > 0) {
          const { addWord: dbAddWord } = await import("~/db/queries");
          for (const word of words) {
            const normalized = word.toLowerCase().trim();
            await dbAddWord({ data: { childId, word: normalized } }).catch(() => {});
          }
        }
      }
    }

    return {
      accountId: result.id,
      email: cleanEmail,
      isPremium: result.isPremium,
      childId,
      childName: name ?? null,
      childBirthDate: birthDate ?? null,
      isNew: true,
    };
  } catch {
    // DB unavailable — fall back to localStorage-only
    if (name && birthDate) {
      const child: Child = { name, birthDate, words: words ?? [] };
      saveChild(child);
    }
    return null;
  }
}

// ── childId management (kept for backward compat) ──────────────────────────

export function getChildId(): number | null {
  const raw = lsGet(CHILD_ID_KEY);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export function setChildId(id: number): void {
  lsSet(CHILD_ID_KEY, String(id));
}

// ── Multi-child support ──────────────────────────────────────────────────────

/**
 * Get all children for an account from the database.
 */
export async function getChildren(accountId: number): Promise<ChildProfile[]> {
  try {
    const { getChildrenByAccount } = await import("~/db/queries");
    const dbChildren = await getChildrenByAccount({ data: { accountId } });
    return dbChildren.map((c) => ({
      id: c.id,
      name: c.name,
      birthDate: c.birth_date,
    }));
  } catch {
    return [];
  }
}

/**
 * Get the number of children for an account (for premium gating).
 */
export async function getChildCount(): Promise<number> {
  const account = await getAccount();
  if (!account) return 0;
  const children = await getChildren(account.id);
  return children.length;
}

export function setActiveChildId(childId: number): void {
  lsSet(ACTIVE_CHILD_ID_KEY, String(childId));
}

export function getActiveChildId(): number | null {
  const raw = lsGet(ACTIVE_CHILD_ID_KEY);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

// Per-child local word cache — keeps multi-child words separated offline
// (the legacy single-child CHILD_KEY record can't distinguish children).
function childWordsKey(childId: number): string {
  return `wordbloom_words_${childId}`;
}

function getCachedChildWords(childId: number): string[] {
  const raw = lsGet(childWordsKey(childId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function setCachedChildWords(childId: number, words: string[]): void {
  lsSet(childWordsKey(childId), JSON.stringify(words));
}

/**
 * Load words for a specific child from the database, falling back to the
 * per-child local cache when the DB is unreachable.
 */
export async function getWordsForChild(childId: number): Promise<string[]> {
  try {
    const { getWords: dbGetWords } = await import("~/db/queries");
    const words = await dbGetWords({ data: { childId } });
    setCachedChildWords(childId, words);
    return words;
  } catch {
    return getCachedChildWords(childId);
  }
}

// ── Existing localStorage functions ────────────────────────────────────────

export function saveChild(child: Child): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CHILD_KEY, JSON.stringify(child));
      localStorage.setItem(WORDS_KEY, JSON.stringify(child.words));
    } catch {
      // localStorage full or unavailable — silently fail
    }
  }
}

export function getChild(): Child | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHILD_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Child;
  } catch {
    return null;
  }
}

export function addWord(
  word: string,
  source: "manual" | "suggestion" = "manual",
): void {
  if (typeof window === "undefined") return;
  const trimmed = word.trim().toLowerCase();
  if (!trimmed) return;

  const childId = getActiveChildId() ?? getChildId();

  // Per-child cache (multi-child safe) — case-insensitive dedup
  if (childId) {
    const cached = getCachedChildWords(childId);
    if (!cached.some((w) => w.toLowerCase() === trimmed)) {
      setCachedChildWords(childId, [...cached, trimmed]);
    }
  }

  // Legacy single-child record — only when it's the offline fallback store
  // (no childId) so multi-child accounts don't mix words into one record.
  if (!childId) {
    const child = getChild();
    if (!child || child.words.some((w) => w.toLowerCase() === trimmed)) return;
    child.words.push(trimmed);
    saveChild(child);
    return;
  }

  // Fire-and-forget: write to DB in the background
  import("~/db/queries").then(({ addWord: dbAddWord }) => {
    dbAddWord({ data: { childId, word: trimmed, source } }).catch(() => {});
  });
}

export function getWords(): string[] {
  if (typeof window === "undefined") return [];
  const child = getChild();
  return child?.words ?? [];
}

export function deleteWord(word: string): void {
  if (typeof window === "undefined") return;

  const childId = getActiveChildId() ?? getChildId();

  if (childId) {
    setCachedChildWords(
      childId,
      getCachedChildWords(childId).filter((w) => w.toLowerCase() !== word.toLowerCase()),
    );
    // Fire-and-forget: delete from DB in the background
    import("~/db/queries").then(({ deleteWord: dbDeleteWord }) => {
      dbDeleteWord({ data: { childId, word: word.toLowerCase() } }).catch(() => {});
    });
    return;
  }

  // Offline fallback record
  const child = getChild();
  if (!child) return;
  child.words = child.words.filter((w) => w.toLowerCase() !== word.toLowerCase());
  saveChild(child);
}

export function hasChildProfile(): boolean {
  return getChild() !== null;
}

/** Compute age in months from a birth date string (YYYY-MM-DD) */
export function getAgeMonths(): number {
  if (typeof window === "undefined") return 18; // SSR default: ~18 months
  const child = getChild();
  if (!child?.birthDate) return 18;
  return ageInMonths(child.birthDate);
}

/** Pick up to `count` phrases using the phrase generation engine */
export function getSuggestedPhrases(
  count: number = 3,
  contextHint?: string,
): Phrase[] {
  const words = getWords();
  const ageMonths = getAgeMonths();
  return generatePhrases(words, ageMonths, count, contextHint);
}

/** Re-export classifyWord for dashboard use */
export { classifyWord };

/** Return words that aren't in the lexicon and aren't proper nouns */
export function getUnknownWords(): string[] {
  const words = getWords();
  return words.filter((w) => {
    const c = classifyWord(w);
    return c.type === "unknown";
  });
}

// ── DB-backed sync functions ───────────────────────────────────────────────

/**
 * Create or update a child in the database.
 * On success, stores the returned childId in localStorage.
 * Falls back gracefully when DATABASE_URL is not set.
 */
export async function getOrCreateChild(
  name: string,
  birthDate: string,
): Promise<number | null> {
  const existingId = getChildId();

  // If we already have a childId, update the existing record
  if (existingId) {
    try {
      const { updateChild: dbUpdateChild } = await import("~/db/queries");
      await dbUpdateChild({
        data: { childId: existingId, name, birthDate },
      });
      return existingId;
    } catch {
      // DB not available — localStorage still has the data
      return existingId;
    }
  }

  // Create a new child in the DB
  try {
    const { createChild: dbCreateChild } = await import("~/db/queries");
    const result = await dbCreateChild({ data: { name, birthDate } });
    if (result && "id" in result) {
      setChildId(result.id);
      return result.id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sync words from the database into localStorage.
 * Call this on dashboard mount to hydrate from server state.
 */
export async function syncWordsFromDb(): Promise<void> {
  const childId = getChildId();
  if (!childId) return;

  try {
    const { getWords: dbGetWords } = await import("~/db/queries");
    const words = await dbGetWords({ data: { childId } });
    if (words && words.length > 0) {
      const child = getChild();
      if (child) {
        // Merge and normalize to lowercase to prevent case-duplicates
        const existingLower = new Set(child.words.map((w) => w.toLowerCase()));
        const newWords = words.filter((w) => !existingLower.has(w.toLowerCase()));
        const merged = [...child.words, ...newWords.map((w) => w.toLowerCase())];
        child.words = merged;
        saveChild(child);
      }
    }
  } catch {
    // DB not available — keep localStorage data
  }
}

export async function syncInitialWordsToDb(words: string[]): Promise<void> {
  const childId = getChildId();
  if (!childId || words.length === 0) return;

  try {
    const { addWord: dbAddWord } = await import("~/db/queries");
    for (const word of words) {
      await dbAddWord({ data: { childId, word } }).catch(() => {});
    }
  } catch {
    // DB not available — words are in localStorage
  }
}

// ── Premium tier ───────────────────────────────────────────────────────────

export function isPremium(): boolean {
  return lsGet(PREMIUM_KEY) === "true";
}

export function setPremium(value: boolean): void {
  lsSet(PREMIUM_KEY, String(value));
}

/**
 * Verify premium status against the DB and update the local cache.
 * Call this on dashboard mount.
 */
export async function verifyPremiumFromDb(): Promise<boolean> {
  const token = getSession();
  if (!token) return isPremium();

  try {
    const { getAccountByToken } = await import("~/db/queries");
    const account = await getAccountByToken({ data: { token } });
    if (account) {
      setPremium(account.isPremium);
      return account.isPremium;
    }
  } catch {
    // DB unavailable — use local cache
  }
  return isPremium();
}

/**
 * Set premium in DB (server-side) and update local cache.
 */
export async function setPremiumDb(
  accountId: number,
  value: boolean,
): Promise<void> {
  setPremium(value); // optimistic local cache
  try {
    const { setPremium: dbSetPremium } = await import("~/db/queries");
    await dbSetPremium({ data: { accountId, value } });
  } catch {
    // DB unavailable — local cache is set
  }
}

/**
 * Redeem a promo code to upgrade to Premium.
 * Returns the result from the server function.
 */
export async function redeemPromoCode(
  email: string,
  code: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const { redeemPromoCode: dbRedeem } = await import("~/db/queries");
    const result = await dbRedeem({ data: { email, code } });
    if (result.success) {
      setPremium(true);
    }
    return result;
  } catch {
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
