import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  getChild,
  getWords,
  addWord,
  hasChildProfile,
  deleteWord,
  isPremium,
  getChildId,
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

/** Compute age in months from a birth date string (YYYY-MM-DD) */
function computeAgeMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  return Math.max(6, Math.min(48, months));
}

function Dashboard() {
  const navigate = useNavigate();

  // Redirect to setup if no profile
  if (typeof window !== "undefined" && !hasChildProfile()) {
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

function DashboardContent() {
  const navigate = useNavigate();

  // ── Core state ────────────────────────────────────────────────────────────
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [activeChildId, setActiveChildIdState] = useState<number | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [premium, setPremiumState] = useState(
    () => typeof window !== "undefined" && isPremium(),
  );
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradedBanner, setUpgradedBanner] = useState(false);

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
  const [refreshCount, setRefreshCount] = useState(0);

  const activeChild = useMemo(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId],
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

          // Fire-and-forget: log session
          import("~/db/queries")
            .then(({ logSession }) => {
              logSession({ data: { accountId: account.id } }).catch(() => {});
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
                : allChildren[0]?.id ?? null;

            if (active !== null) {
              setActiveChildIdState(active);
              setActiveChildId(active);

              // Load words for active child
              const childWords = await getWordsForChild(active);
              if (!cancelled) {
                setWords(childWords);
                const currentPremium = dbPremium;
                const freshPhrases = generatePhrases(
                  childWords,
                  computeAgeMonths(allChildren.find((c) => c.id === active)?.birthDate ?? "2024-01-01"),
                  currentPremium ? 3 : 1,
                );
                setPhrases(freshPhrases);

                // Fire-and-forget: log phrase views
                const aid = account.id;
                import("~/db/queries")
                  .then(({ logPhraseViews }) => {
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
          setWords(localWords);
          const currentPremium = isPremium();
          const freshPhrases = generatePhrases(
            localWords,
            computeAgeMonths(getChild()?.birthDate ?? "2024-01-01"),
            currentPremium ? 3 : 1,
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

      const childWords = await getWordsForChild(childId);
      const child = children.find((c) => c.id === childId);
      const ageMonths = child ? computeAgeMonths(child.birthDate) : 18;
      const freshPhrases = generatePhrases(childWords, ageMonths, premium ? 3 : 1);

      setWords(childWords);
      setPhrases(freshPhrases);
      setIsLoading(false);

      // Fire-and-forget: log phrase views
      if (accountId) {
        import("~/db/queries")
          .then(({ logPhraseViews }) => {
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
    [children, premium, accountId],
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const phraseCount = premium ? 3 : 1;

  const ageMonths = useMemo(
    () => (activeChild ? computeAgeMonths(activeChild.birthDate) : 18),
    [activeChild],
  );

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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddWord = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newWord.trim();
      if (!trimmed) return;
      if (words.includes(trimmed)) {
        setNewWord("");
        return;
      }
      addWord(trimmed);
      const updatedWords = [...words, trimmed];
      setWords(updatedWords);
      setNewWord("");

      const freshPhrases = generatePhrases(updatedWords, ageMonths, phraseCount);
      setPhrases(freshPhrases);
      setAdding(true);
      setTimeout(() => setAdding(false), 1200);
    },
    [newWord, words, ageMonths, phraseCount],
  );

  const handleDeleteWord = useCallback(
    (word: string) => {
      const updatedWords = words.filter((w) => w !== word);
      setWords(updatedWords);
      deleteWord(word);

      const freshPhrases = generatePhrases(updatedWords, ageMonths, phraseCount);
      setPhrases(freshPhrases);
    },
    [words, ageMonths, phraseCount],
  );

  const handleRefreshPhrases = useCallback(() => {
    setRefreshCount((c) => c + 1);
    const hints = [
      undefined,
      "playtime",
      "mealtime",
      "bathtime",
      "bedtime",
      "outside",
    ];
    const hint = hints[refreshCount % hints.length];
    const freshPhrases = generatePhrases(words, ageMonths, phraseCount, hint);
    setPhrases(freshPhrases);

    // Fire-and-forget: log refreshed phrase views
    if (accountId && activeChildId) {
      import("~/db/queries")
        .then(({ logPhraseViews }) => {
          logPhraseViews({
            data: {
              views: freshPhrases.map((p) => ({
                accountId,
                childId: activeChildId,
                phraseText: p.text,
                context: p.context,
                wasRefreshed: true,
              })),
            },
          }).catch(() => {});
        });
    }
  }, [words, ageMonths, phraseCount, refreshCount, accountId, activeChildId]);

  // ── Promo code handler ────────────────────────────────────────────────────
  const handleRedeemPromo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const code = promoCodeInput.trim();
      if (!code || promoLoading || promoRedeemed) return;

      setPromoLoading(true);
      setPromoMessage(null);

      // Use the account email if available, otherwise fall back to localStorage
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
          const freshPhrases = generatePhrases(words, ageMonths, 3);
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
    [promoCodeInput, promoLoading, promoRedeemed, accountEmail, words, ageMonths],
  );

  // ── Show multiple children? ───────────────────────────────────────────────
  const showSwitcher = children.length > 1;

  // ── Edit profile link ─────────────────────────────────────────────────────
  const editLink = activeChildId
    ? `/setup?edit=${activeChildId}`
    : "/setup";

  // ── Child name for display ────────────────────────────────────────────────
  const displayName = activeChild?.name ?? getChild()?.name ?? "Child";

  return (
    <main className="flex flex-1 flex-col bg-cream-50">
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

            {/* Edit Profile */}
            <Link
              to={editLink}
              className="rounded-full bg-cream-200 px-3 py-1.5 text-xs font-medium text-sage-700 transition-colors hover:bg-cream-300 min-h-[44px] flex items-center"
            >
              Edit Profile
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

        {/* Premium Banner for free users */}
        {!premium && (
          <div className="mb-6 transition-all duration-300">
            <PremiumBanner />
          </div>
        )}

        {/* Promo Code — only for free users, hidden after successful redemption */}
        {!premium && !promoRedeemed && accountEmail && (
          <div className="mb-6 animate-fade-in">
            <form onSubmit={handleRedeemPromo} className="rounded-xl border border-dashed border-lavender-200 bg-white px-5 py-4">
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
              🌿 Today&rsquo;s Phrase{phrases.length > 1 ? "s" : ""}
            </h2>
            <button
              onClick={handleRefreshPhrases}
              className="rounded-full px-3 py-1 text-xs font-medium text-lavender-600 transition-colors hover:bg-lavender-50 hover:text-lavender-800 min-h-[44px] flex items-center"
            >
              ↻ Refresh
            </button>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <PhraseCardSkeleton />
                {premium && <PhraseCardSkeleton />}
                {premium && <PhraseCardSkeleton />}
              </>
            ) : (
              phrases.map((phrase) => (
                <PhraseCard key={phrase.id} phrase={phrase} />
              ))
            )}
          </div>

          {/* Free tier upgrade nudge */}
          {!premium && !isLoading && (
            <div className="mt-4 rounded-xl border border-dashed border-lavender-200 bg-lavender-50/50 p-4 text-center animate-fade-in">
              <p className="text-sm font-medium text-lavender-700">
                ✨ Want more personalized phrases?
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

        {/* My Child's Words */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-sage-700">
            📝 {displayName}&rsquo;s Words
          </h2>
          {isLoading ? (
            <WordListSkeleton />
          ) : words.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 p-8 text-center animate-fade-in">
              <p className="text-lg mb-1">✨</p>
              <p className="text-gray-600 font-medium">No words logged yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Add your child&rsquo;s first word below!
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
              ) are logged but don&rsquo;t yet power suggestions &mdash; we&rsquo;ll
              use them as your child grows.
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
