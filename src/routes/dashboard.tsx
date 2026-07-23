import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  getChild,
  getWords,
  addWord,
  hasChildProfile,
  deleteWord,
  isPremium,
  getAccount,
  getSession,
  verifyPremiumFromDb,
  classifyWord,
  getChildren,
  getActiveChildId,
  setActiveChildId,
  getWordsForChild,
  redeemPromoCode,
} from "~/store";
import { generatePhrases } from "~/engine";
import { ageInMonths, todayKey } from "~/utils";
import {
  getPushState,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  type PushState,
} from "~/push";
import { WordBadge } from "~/components/WordBadge";
import { PhraseCard } from "~/components/PhraseCard";
import { PremiumBanner } from "~/components/PremiumBanner";
import { ChildSwitcher } from "~/components/ChildSwitcher";
import type { Phrase, ChildProfile } from "~/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "WordBloom — Dashboard" }],
  }),
  component: Dashboard,
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ── Daily edition helpers ────────────────────────────────────────────────────
// "Today's phrases" is a stable daily edition: the same child + day + edition
// number always produces the same phrases. Refreshing bumps the edition (and
// persists it, so the reshuffled set is what you see all day). Free users get
// one reshuffle per day; premium refreshes freely and can pick a context.

const FREE_MAX_EDITION = 1;

function editionKey(childKey: string): string {
  return `wordbloom_edition_${childKey}_${todayKey()}`;
}

function getStoredEdition(childKey: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(editionKey(childKey));
    const n = raw ? parseInt(raw, 10) : 0;
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

function storeEdition(childKey: string, edition: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(editionKey(childKey), String(edition));
  } catch {
    // ignore
  }
}

/** Gentle time-of-day default so phrases fit the moment without any input */
function timeOfDayContext(): string | undefined {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return "mealtime";
  if (hour >= 12 && hour < 14) return "mealtime";
  if (hour >= 18 && hour < 20) return "bathtime";
  if (hour >= 20 || hour < 6) return "bedtime";
  return undefined;
}

const CONTEXT_CHIPS: { label: string; value: string | undefined }[] = [
  { label: "✨ Auto", value: undefined },
  { label: "🧸 Play", value: "playtime" },
  { label: "🍌 Meals", value: "mealtime" },
  { label: "🛁 Bath", value: "bathtime" },
  { label: "🌙 Bed", value: "bedtime" },
  { label: "🌳 Outside", value: "outside" },
];

/** Consecutive-day streak ending today or yesterday (UTC day keys) */
function computeStreak(sessionDays: string[]): number {
  if (sessionDays.length === 0) return 0;
  const days = [...new Set(sessionDays)].sort().reverse();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayUtc = new Date().toISOString().slice(0, 10);
  const yesterdayUtc = new Date(Date.now() - dayMs).toISOString().slice(0, 10);
  if (days[0] !== todayUtc && days[0] !== yesterdayUtc) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00Z").getTime();
    const cur = new Date(days[i] + "T00:00:00Z").getTime();
    if (prev - cur === dayMs) streak++;
    else break;
  }
  return streak;
}

function Dashboard() {
  const navigate = useNavigate();

  // Redirect to setup if no profile
  if (typeof window !== "undefined" && !hasChildProfile() && !getSession()) {
    navigate({ to: "/setup", replace: true });
    return null;
  }

  return <DashboardContent />;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function WordListSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <SkeletonBlock className="h-8 w-16" />
      <SkeletonBlock className="h-8 w-20" />
      <SkeletonBlock className="h-8 w-14" />
      <SkeletonBlock className="h-8 w-24" />
      <SkeletonBlock className="h-8 w-18" />
    </div>
  );
}

function PhraseCardSkeleton() {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 p-5">
      <SkeletonBlock className="mb-2 h-3 w-20" />
      <SkeletonBlock className="mb-1 h-5 w-full" />
      <SkeletonBlock className="mb-3 h-5 w-3/4" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-5 w-16" />
      </div>
    </div>
  );
}

const CONFETTI_EMOJI = ["🎉", "🌟", "🌱", "✨", "💚", "🎈"];

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
        x: `${Math.round((Math.random() - 0.5) * 240)}px`,
        y: `${Math.round(-40 - Math.random() * 160)}px`,
        r: `${Math.round((Math.random() - 0.5) * 360)}deg`,
        delay: `${Math.round(Math.random() * 200)}ms`,
        size: 16 + Math.round(Math.random() * 12),
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              fontSize: p.size,
              animationDelay: p.delay,
              ["--confetti-x" as string]: p.x,
              ["--confetti-y" as string]: p.y,
              ["--confetti-r" as string]: p.r,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardContent() {
  const navigate = useNavigate();

  // ── Deduplication helper ───────────────────────────────────────────────────
  // Words are normalized to lowercase at input, but case-insensitive duplicates
  // can still sneak in from DB rows or localStorage merges. This keeps the
  // first occurrence of each word (preserving insertion order).
  const dedupeWords = useCallback((wordList: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const w of wordList) {
      const key = w.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(key); // normalize to lowercase
      }
    }
    return result;
  }, []);

  // ── Core state ────────────────────────────────────────────────────────────
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [activeChildId, setActiveChildIdState] = useState<number | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [wordDates, setWordDates] = useState<Map<string, string>>(new Map());
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [premium, setPremiumState] = useState(
    () => typeof window !== "undefined" && isPremium(),
  );
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradedBanner, setUpgradedBanner] = useState(false);

  // ── Habit-loop state ──────────────────────────────────────────────────────
  const [edition, setEdition] = useState(0);
  const [contextChoice, setContextChoice] = useState<string | undefined>(
    undefined,
  );
  const [streak, setStreak] = useState(0);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [pushState, setPushState] = useState<PushState>("unsupported");

  // ── Promo code state ──────────────────────────────────────────────────────
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [promoRedeemed, setPromoRedeemed] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [newWord, setNewWord] = useState("");
  const [adding, setAdding] = useState(false);

  const activeChild = useMemo(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId],
  );

  const childSeedKey = activeChildId !== null ? String(activeChildId) : "local";

  const ageMonths = useMemo(
    () =>
      activeChild
        ? ageInMonths(activeChild.birthDate)
        : ageInMonths(getChild()?.birthDate ?? "2024-01-01"),
    [activeChild],
  );

  const buildPhrases = useCallback(
    (
      wordList: string[],
      age: number,
      isPrem: boolean,
      seedChildKey: string,
      editionNum: number,
      context: string | undefined,
    ): Phrase[] => {
      const soft = context === undefined;
      const hint = context ?? timeOfDayContext();
      const seed = `${seedChildKey}:${todayKey()}:${editionNum}:${hint ?? "any"}`;
      return generatePhrases(wordList, age, {
        count: isPrem ? 3 : 1,
        contextHint: hint,
        contextIsSoft: soft,
        seed,
      });
    },
    [],
  );

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Check for ?upgraded=true on mount
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgraded") === "true") {
        setUpgradedBanner(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("upgraded");
        window.history.replaceState({}, "", url.toString());
      }
    }
    // Register the service worker early (PWA install + push readiness)
    registerServiceWorker().then(() => {
      getPushState().then(setPushState);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const token = getSession();

      if (token) {
        const account = await getAccount();
        if (!cancelled) {
          if (!account) {
            navigate({ to: "/setup", replace: true });
            return;
          }
          setAccountEmail(account.email);
          setAccountId(account.id);

          // Fire-and-forget: log session, then compute streak (today's
          // session included)
          import("~/db/queries").then(({ logSession, getSessionDays }) => {
            logSession({ data: { accountId: account.id } })
              .catch(() => {})
              .finally(() => {
                getSessionDays({ data: { accountId: account.id } })
                  .then((days) => {
                    if (!cancelled) setStreak(computeStreak(days));
                  })
                  .catch(() => {});
              });
          });

          // Verify premium from DB
          const dbPremium = await verifyPremiumFromDb();
          if (!cancelled) setPremiumState(dbPremium);

          // Load all children
          const allChildren = await getChildren(account.id);
          if (!cancelled) {
            if (allChildren.length === 0 && token) {
              // Account exists but no children — redirect to setup
              navigate({ to: "/setup", replace: true });
              return;
            }

            setChildren(allChildren);

            // Determine active child
            const storedActiveId = getActiveChildId();
            const active =
              storedActiveId && allChildren.some((c) => c.id === storedActiveId)
                ? storedActiveId
                : (allChildren[0]?.id ?? null);

            if (active !== null) {
              setActiveChildIdState(active);
              setActiveChildId(active);

              // Load words (with dates for the weekly recap)
              let childWords: string[] = [];
              const dates = new Map<string, string>();
              try {
                const { getWordsWithDates } = await import("~/db/queries");
                const entries = await getWordsWithDates({
                  data: { childId: active },
                });
                childWords = entries.map((e) => e.word);
                for (const e of entries) dates.set(e.word, e.dateAdded);
              } catch {
                childWords = await getWordsForChild(active);
              }

              if (!cancelled) {
                const deduped = dedupeWords(childWords);
                setWords(deduped);
                setWordDates(dates);

                const childKey = String(active);
                const storedEdition = getStoredEdition(childKey);
                setEdition(storedEdition);

                const childAge = ageInMonths(
                  allChildren.find((c) => c.id === active)?.birthDate ??
                    "2024-01-01",
                );
                const freshPhrases = buildPhrases(
                  deduped,
                  childAge,
                  dbPremium,
                  childKey,
                  storedEdition,
                  undefined,
                );
                setPhrases(freshPhrases);

                // Fire-and-forget: log phrase views
                const aid = account.id;
                import("~/db/queries").then(({ logPhraseViews }) => {
                  logPhraseViews({
                    data: {
                      views: freshPhrases.map((p) => ({
                        accountId: aid,
                        childId: active,
                        phraseText: p.text,
                        context: p.context,
                        wasRefreshed: false,
                      })),
                    },
                  }).catch(() => {});
                });
              }
            }
          }
        }
      } else {
        // No session — use localStorage fallback
        const localWords = getWords();
        if (!cancelled) {
          const deduped = dedupeWords(localWords);
          setWords(deduped);
          const currentPremium = isPremium();
          const storedEdition = getStoredEdition("local");
          setEdition(storedEdition);
          const freshPhrases = buildPhrases(
            deduped,
            ageInMonths(getChild()?.birthDate ?? "2024-01-01"),
            currentPremium,
            "local",
            storedEdition,
            undefined,
          );
          setPhrases(freshPhrases);
        }
      }

      if (!cancelled) setIsLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Handle child switch ───────────────────────────────────────────────────
  const handleSwitchChild = useCallback(
    async (childId: number) => {
      setActiveChildIdState(childId);
      setActiveChildId(childId);
      setWords([]);
      setPhrases([]);
      setIsLoading(true);

      let childWords: string[] = [];
      const dates = new Map<string, string>();
      try {
        const { getWordsWithDates } = await import("~/db/queries");
        const entries = await getWordsWithDates({ data: { childId } });
        childWords = entries.map((e) => e.word);
        for (const e of entries) dates.set(e.word, e.dateAdded);
      } catch {
        childWords = await getWordsForChild(childId);
      }

      const child = children.find((c) => c.id === childId);
      const age = child ? ageInMonths(child.birthDate) : 18;
      const childKey = String(childId);
      const storedEdition = getStoredEdition(childKey);
      const deduped = dedupeWords(childWords);
      const freshPhrases = buildPhrases(
        deduped,
        age,
        premium,
        childKey,
        storedEdition,
        contextChoice,
      );

      setWords(deduped);
      setWordDates(dates);
      setEdition(storedEdition);
      setPhrases(freshPhrases);
      setIsLoading(false);

      // Fire-and-forget: log phrase views
      if (accountId) {
        import("~/db/queries").then(({ logPhraseViews }) => {
          logPhraseViews({
            data: {
              views: freshPhrases.map((p) => ({
                accountId,
                childId,
                phraseText: p.text,
                context: p.context,
                wasRefreshed: false,
              })),
            },
          }).catch(() => {});
        });
      }
    },
    [children, premium, accountId, contextChoice, buildPhrases],
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const greeting = useMemo(() => getGreeting(), []);

  const ageLabel = useMemo(() => {
    if (ageMonths < 12) return `${ageMonths} months`;
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    if (months === 0) return `${years} year${years > 1 ? "s" : ""}`;
    return `${years} yr ${months} mo`;
  }, [ageMonths]);

  // ── Word classifications ──────────────────────────────────────────────────
  const wordClassifications = useMemo(() => {
    const map = new Map<string, ReturnType<typeof classifyWord>>();
    for (const w of words) {
      map.set(w, classifyWord(w));
    }
    return map;
  }, [words]);

  const unknownWords = useMemo(
    () =>
      words.filter((w) => {
        const c = classifyWord(w);
        return c.type === "unknown";
      }),
    [words],
  );

  // Weekly recap: words added in the last 7 days
  const wordsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let count = 0;
    for (const [, dateStr] of wordDates) {
      const t = new Date(dateStr).getTime();
      if (!isNaN(t) && t >= weekAgo) count++;
    }
    return count;
  }, [wordDates]);

  const refreshesLeft = premium ? Infinity : FREE_MAX_EDITION - edition;

  // ── Regenerate helper (shared by refresh / context / said-it) ─────────────
  const regenerate = useCallback(
    (
      wordList: string[],
      editionNum: number,
      context: string | undefined,
      wasRefreshed: boolean,
    ) => {
      const freshPhrases = buildPhrases(
        wordList,
        ageMonths,
        premium,
        childSeedKey,
        editionNum,
        context,
      );
      setPhrases(freshPhrases);

      if (accountId && activeChildId) {
        import("~/db/queries").then(({ logPhraseViews }) => {
          logPhraseViews({
            data: {
              views: freshPhrases.map((p) => ({
                accountId,
                childId: activeChildId,
                phraseText: p.text,
                context: p.context,
                wasRefreshed,
              })),
            },
          }).catch(() => {});
        });
      }
    },
    [buildPhrases, ageMonths, premium, childSeedKey, accountId, activeChildId],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddWord = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newWord.trim().toLowerCase();
      if (!trimmed) return;
      if (words.includes(trimmed)) {
        setNewWord("");
        return;
      }
      addWord(trimmed);
      const updatedWords = [...words, trimmed];
      setWords(updatedWords);
      setWordDates((prev) =>
        new Map(prev).set(trimmed, new Date().toISOString()),
      );
      setNewWord("");

      regenerate(updatedWords, edition, contextChoice, false);
      setAdding(true);
      setTimeout(() => setAdding(false), 1200);
    },
    [newWord, words, edition, contextChoice, regenerate],
  );

  const handleDeleteWord = useCallback(
    (word: string) => {
      const updatedWords = words.filter((w) => w.toLowerCase() !== word.toLowerCase());
      setWords(updatedWords);
      deleteWord(word);
      regenerate(updatedWords, edition, contextChoice, false);
    },
    [words, edition, contextChoice, regenerate],
  );

  const handleRefreshPhrases = useCallback(() => {
    if (!premium && edition >= FREE_MAX_EDITION) return;
    const next = edition + 1;
    setEdition(next);
    storeEdition(childSeedKey, next);
    regenerate(words, next, contextChoice, true);
  }, [premium, edition, childSeedKey, words, contextChoice, regenerate]);

  const handlePickContext = useCallback(
    (context: string | undefined) => {
      setContextChoice(context);
      regenerate(words, edition, context, true);
    },
    [words, edition, regenerate],
  );

  // The core loop-closer: the child actually said the suggested word.
  const handleSaidIt = useCallback(
    (word: string) => {
      setCelebrating(word);
      setTimeout(() => setCelebrating(null), 1500);

      const trimmed = word.trim().toLowerCase();
      if (!trimmed || words.includes(trimmed)) return;

      addWord(trimmed, "suggestion");
      const updatedWords = [...words, trimmed];
      setWords(updatedWords);
      setWordDates((prev) =>
        new Map(prev).set(trimmed, new Date().toISOString()),
      );
      // Regenerate so the parent immediately sees phrases building on the
      // word their child just said — the ladder visibly extends.
      regenerate(updatedWords, edition, contextChoice, false);
    },
    [words, edition, contextChoice, regenerate],
  );

  // ── Push notification toggle ──────────────────────────────────────────────
  const [pushBusy, setPushBusy] = useState(false);
  const handleTogglePush = useCallback(async () => {
    if (pushBusy || !accountId) return;
    setPushBusy(true);
    try {
      if (pushState === "subscribed") {
        setPushState(await unsubscribeFromPush());
      } else {
        setPushState(await subscribeToPush(accountId));
      }
    } finally {
      setPushBusy(false);
    }
  }, [pushBusy, pushState, accountId]);

  // ── Promo code handler ────────────────────────────────────────────────────
  const handleRedeemPromo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const code = promoCodeInput.trim();
      if (!code || promoLoading || promoRedeemed) return;

      setPromoLoading(true);
      setPromoMessage(null);

      const email = accountEmail;
      if (!email) {
        setPromoMessage({
          type: "error",
          text: "Please sign in first to redeem a promo code.",
        });
        setPromoLoading(false);
        return;
      }

      try {
        const result = await redeemPromoCode(email, code);
        if (result.success) {
          setPremiumState(true);
          setPromoRedeemed(true);
          setPromoMessage({ type: "success", text: result.message });
          // Refresh phrases with premium count
          const freshPhrases = generatePhrases(words, ageMonths, {
            count: 3,
            seed: `${childSeedKey}:${todayKey()}:${edition}:any`,
          });
          setPhrases(freshPhrases);
        } else {
          setPromoMessage({ type: "error", text: result.message });
        }
      } catch {
        setPromoMessage({
          type: "error",
          text: "Something went wrong. Please try again.",
        });
      } finally {
        setPromoLoading(false);
      }
    },
    [
      promoCodeInput,
      promoLoading,
      promoRedeemed,
      accountEmail,
      words,
      ageMonths,
      childSeedKey,
      edition,
    ],
  );

  // ── Show multiple children? ───────────────────────────────────────────────
  const showSwitcher = children.length > 1;

  // ── Edit profile link ─────────────────────────────────────────────────────
  const editLink = activeChildId ? `/setup?edit=${activeChildId}` : "/setup";

  // ── Child name for display ────────────────────────────────────────────────
  const displayName = activeChild?.name ?? getChild()?.name ?? "Child";

  const showPushButton =
    accountId !== null && pushState !== "unsupported" && pushState !== "denied";

  return (
    <main className="flex flex-1 flex-col bg-cream-50">
      {celebrating && <ConfettiBurst />}

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-cream-200 bg-cream-50/90 px-5 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-sage-600">
              {greeting}
            </p>
            <h1 className="truncate text-2xl font-bold text-sage-800">
              {displayName}&rsquo;s Words
            </h1>
            <p className="text-xs text-sage-500">
              {ageLabel} &middot; {words.length} word
              {words.length === 1 ? "" : "s"}
              {streak > 1 && (
                <span className="ml-1 font-semibold text-cream-700">
                  &middot; 🔥 {streak}-day streak
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Child switcher */}
            {showSwitcher && (
              <ChildSwitcher
                children={children}
                activeChildId={activeChildId!}
                onSwitch={handleSwitchChild}
                isPremium={premium}
              />
            )}

            {/* Upgrade button */}
            {!premium && (
              <Link
                to="/pricing"
                className="rounded-full bg-lavender-100 px-3 py-1.5 text-xs font-semibold text-lavender-700 transition-colors hover:bg-lavender-200 min-h-[44px] flex items-center"
              >
                Upgrade
              </Link>
            )}

            {/* Add Child button (premium only, visible when no switcher) */}
            {!showSwitcher && premium && children.length < 5 && (
              <Link
                to="/setup"
                search={{ new: "true" }}
                className="rounded-full bg-cream-200 px-3 py-1.5 text-xs font-medium text-sage-700 transition-colors hover:bg-cream-300 min-h-[44px] flex items-center"
              >
                + Add Child
              </Link>
            )}

            {/* Progress */}
            <Link
              to="/progress"
              className="rounded-full bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-700 transition-colors hover:bg-sage-200 min-h-[44px] flex items-center"
            >
              📈 Progress
            </Link>

            {/* Edit Profile */}
            <Link
              to={editLink}
              className="rounded-full bg-cream-200 px-3 py-1.5 text-xs font-medium text-sage-700 transition-colors hover:bg-cream-300 min-h-[44px] flex items-center"
            >
              Edit
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-5 py-6">
        {/* Upgrade success banner */}
        {upgradedBanner && (
          <div className="mb-6 rounded-xl bg-green-100 border border-green-300 px-5 py-4 text-center animate-fade-in">
            <p className="font-semibold text-green-800">
              🎉 Thanks for upgrading! Your premium features are active.
            </p>
          </div>
        )}

        {/* Celebration banner */}
        {celebrating && (
          <div className="mb-6 rounded-xl bg-sage-100 border border-sage-300 px-5 py-4 text-center animate-fade-in">
            <p className="font-semibold text-sage-800">
              🎉 {displayName} said &ldquo;{celebrating}&rdquo;! Added to the
              word garden.
            </p>
          </div>
        )}

        {/* Weekly recap */}
        {!isLoading && wordsThisWeek > 0 && (
          <div className="mb-6 rounded-xl border border-sage-200 bg-sage-50 px-5 py-3 text-center animate-fade-in">
            <p className="text-sm font-medium text-sage-700">
              🌱 {wordsThisWeek} new word{wordsThisWeek === 1 ? "" : "s"} this
              week — {displayName} is blooming!
            </p>
          </div>
        )}

        {/* Premium Banner for free users */}
        {!premium && (
          <div className="mb-6 transition-all duration-300">
            <PremiumBanner />
          </div>
        )}

        {/* Promo Code — only for free users, hidden after successful redemption */}
        {!premium && !promoRedeemed && accountEmail && (
          <div className="mb-6 animate-fade-in">
            <form
              onSubmit={handleRedeemPromo}
              className="rounded-xl border border-dashed border-lavender-200 bg-white px-5 py-4"
            >
              <p className="text-sm font-medium text-sage-700 mb-2">
                🎟️ Have a promo code?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200 min-h-[44px]"
                  autoComplete="off"
                  disabled={promoLoading}
                />
                <button
                  type="submit"
                  disabled={!promoCodeInput.trim() || promoLoading}
                  className="rounded-lg bg-lavender-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-lavender-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {promoLoading ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Redeem"
                  )}
                </button>
              </div>
              {promoMessage && (
                <p
                  className={`mt-2 text-sm font-medium ${
                    promoMessage.type === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {promoMessage.text}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Promo success — shown after redemption, but premium state already flipped */}
        {promoRedeemed && promoMessage?.type === "success" && premium && (
          <div className="mb-6 rounded-xl bg-green-100 border border-green-300 px-5 py-4 text-center animate-fade-in">
            <p className="font-semibold text-green-800">
              🎉 {promoMessage.text}
            </p>
          </div>
        )}

        {/* Today's Phrases */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-sage-700">
              🌿 Today&rsquo;s Phrase{premium ? "s" : ""}
            </h2>
            {(premium || refreshesLeft > 0) && (
              <button
                onClick={handleRefreshPhrases}
                className="rounded-full px-3 py-1 text-xs font-medium text-lavender-600 transition-colors hover:bg-lavender-50 hover:text-lavender-800 min-h-[44px] flex items-center"
              >
                ↻ Refresh
                {!premium && ` (${refreshesLeft} left today)`}
              </button>
            )}
          </div>

          {/* Context picker — premium can ask for phrases for this moment */}
          {premium && !isLoading && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CONTEXT_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handlePickContext(chip.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                    contextChoice === chip.value
                      ? "bg-sage-500 text-white"
                      : "bg-cream-200 text-sage-700 hover:bg-cream-300"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {isLoading ? (
              <>
                <PhraseCardSkeleton />
                {premium && <PhraseCardSkeleton />}
                {premium && <PhraseCardSkeleton />}
              </>
            ) : (
              phrases.map((phrase) => {
                const target = phrase.targetWord ?? phrase.newWord;
                const canSayIt = target && !words.includes(target);
                return (
                  <PhraseCard
                    key={phrase.id}
                    phrase={phrase}
                    onSaidIt={canSayIt ? handleSaidIt : undefined}
                  />
                );
              })
            )}
          </div>

          {!isLoading && (
            <p className="mt-3 text-center text-xs text-gray-400">
              🌅 Fresh phrases tomorrow — same time, same place.
            </p>
          )}

          {/* Free tier upgrade nudge */}
          {!premium && !isLoading && (
            <div className="mt-4 rounded-xl border border-dashed border-lavender-200 bg-lavender-50/50 p-4 text-center animate-fade-in">
              <p className="text-sm font-medium text-lavender-700">
                ✨ Want 3 phrases a day, bath-time &amp; bedtime phrase packs,
                and progress insights?
              </p>
              <Link
                to="/pricing"
                className="mt-1 inline-block text-sm font-semibold text-lavender-600 underline hover:text-lavender-800"
              >
                Upgrade to Premium →
              </Link>
            </div>
          )}
        </section>

        {/* Daily reminder */}
        {showPushButton && (
          <section className="mb-8">
            <button
              onClick={handleTogglePush}
              disabled={pushBusy}
              className={`w-full rounded-xl border px-5 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                pushState === "subscribed"
                  ? "border-sage-300 bg-sage-50 text-sage-700 hover:bg-sage-100"
                  : "border-lavender-200 bg-white text-lavender-700 hover:bg-lavender-50"
              } disabled:opacity-50`}
            >
              {pushState === "subscribed"
                ? "🔔 Daily reminder on — tap to turn off"
                : "🔕 Get a daily reminder when fresh phrases are ready"}
            </button>
          </section>
        )}

        {/* My Child's Words */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-sage-700">
            📝 {displayName}&rsquo;s Words
          </h2>
          {isLoading ? (
            <WordListSkeleton />
          ) : words.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 p-8 text-center animate-fade-in">
              <p className="text-lg mb-1">🌱</p>
              <p className="text-gray-600 font-medium">
                Your first phrase is ready above
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Try it with {displayName} today — then tap &ldquo;Said it!&rdquo;
                or add a first word below to watch the garden grow.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {words.map((word) => (
                <WordBadge
                  key={word}
                  word={word}
                  onDelete={handleDeleteWord}
                  classification={wordClassifications.get(word)}
                />
              ))}
            </div>
          )}
          {!isLoading && words.length > 0 && (
            <p className="mt-3 text-sm text-gray-400">
              {words.length} word{words.length === 1 ? "" : "s"} and counting 🌱
            </p>
          )}
          {/* Unknown words notice */}
          {!isLoading && unknownWords.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 animate-fade-in">
              💡 Some words ({unknownWords.slice(0, 3).join(", ")}
              {unknownWords.length > 3
                ? `, and ${unknownWords.length - 3} more`
                : ""}
              ) are logged but don&rsquo;t yet power suggestions &mdash;
              we&rsquo;ll use them as your child grows.
            </div>
          )}
        </section>

        {/* Quick Add */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-sage-700">
            ✨ Add a Word
          </h2>
          <form onSubmit={handleAddWord} className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder='e.g. "ba" for ball, "mama"'
              className="flex-1 rounded-xl border border-cream-300 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200 min-h-[44px]"
              autoComplete="off"
              inputMode="text"
            />
            <button
              type="submit"
              disabled={!newWord.trim()}
              className="rounded-xl bg-lavender-500 px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-lavender-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {adding ? "Added!" : "Add"}
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-400">
            Log sounds (&ldquo;ba&rdquo;), approximations (&ldquo;wa-wa&rdquo;
            for water), or full words.
          </p>
        </section>

        {/* Footer with account email and nav */}
        <div className="mt-10 border-t border-cream-200 pt-6 space-y-3 text-center">
          {accountEmail && (
            <p className="text-xs text-gray-400">
              Signed in as{" "}
              <span className="font-medium text-sage-600">{accountEmail}</span>
            </p>
          )}
          <Link
            to="/"
            className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
