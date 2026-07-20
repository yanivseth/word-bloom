import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import {
  saveChild,
  getChild,
  setupAccount,
  getOrCreateChild,
  syncInitialWordsToDb,
  getSession,
  getAccount,
  getWordsForChild,
  isPremium,
  getChildCount,
  setActiveChildId,
} from "~/store";
import type { Child } from "~/types";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [{ title: "WordBloom — Set Up Your Child's Profile" }],
  }),
  component: Setup,
});

/** Helpers for date clamping & formatting */
const clampDate = (d: Date, min: Date, max: Date): Date => {
  const t = d.getTime();
  return new Date(Math.max(min.getTime(), Math.min(max.getTime(), t)));
};

const toDateString = (d: Date): string => d.toISOString().split("T")[0];

const calcAgeMonths = (birth: Date, now: Date): number => {
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
};

const formatAgeMonths = (months: number): string => {
  if (months === 0) return "Newborn";
  if (months === 1) return "1 month old";
  return `${months} months old`;
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function Setup() {
  const navigate = useNavigate();
  const existingChild = typeof window !== "undefined" ? getChild() : null;

  // Check for query params
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const isRestoreMode = searchParams?.get("restore") === "true";
  const isAddChildMode = searchParams?.get("new") === "true";
  const editChildIdStr = searchParams?.get("edit");
  const editChildId = editChildIdStr ? parseInt(editChildIdStr, 10) : null;
  const isEditMode = editChildId !== null && !isNaN(editChildId);

  const today = useMemo(() => new Date(), []);
  const fourYearsAgo = useMemo(() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 4);
    return d;
  }, [today]);
  const twelveMonthsAgo = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 12);
    return d;
  }, [today]);

  const maxDate = toDateString(today);
  const minDate = toDateString(fourYearsAgo);
  const defaultDate = toDateString(twelveMonthsAgo);

  // ── Form state ──────────────────────────────────────────────────────────

  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState(() => {
    if (existingChild?.birthDate) {
      const stored = new Date(existingChild.birthDate);
      return toDateString(clampDate(stored, fourYearsAgo, today));
    }
    return defaultDate;
  });
  const [name, setName] = useState(existingChild?.name ?? "");
  const [initialWords, setInitialWords] = useState(
    existingChild?.words?.join(", ") ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  // Returning parent detection
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [returningAccount, setReturningAccount] = useState<{
    childName: string | null;
  } | null>(null);
  const [emailChecked, setEmailChecked] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Add-child / Edit mode gating ─────────────────────────────────────────

  const [modeCheckDone, setModeCheckDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // For add-child mode, verify session and premium gating
    if (isAddChildMode) {
      const token = getSession();
      if (!token) {
        navigate({ to: "/setup", replace: true });
        return;
      }

      getAccount().then((account) => {
        if (!account) {
          navigate({ to: "/setup", replace: true });
          return;
        }
        // Pre-fill email
        setEmail(account.email);

        // Premium gating: free tier can only have 1 child
        getChildCount().then((count) => {
          if (!account.isPremium && count >= 1) {
            navigate({ to: "/pricing", replace: true });
            return;
          }
          if (count >= 5) {
            // Max children reached
            navigate({ to: "/dashboard", replace: true });
            return;
          }
          setModeCheckDone(true);
        });
      });
    } else if (isEditMode) {
      // Load child data from DB
      const token = getSession();
      if (!token || !editChildId) {
        navigate({ to: "/setup", replace: true });
        return;
      }

      getAccount().then((account) => {
        if (!account) {
          navigate({ to: "/setup", replace: true });
          return;
        }
        setEmail(account.email);

        // Fetch child data
        import("~/db/queries")
          .then(({ getChild: dbGetChild }) =>
            dbGetChild({ data: { childId: editChildId } }),
          )
          .then((childData) => {
            if (childData) {
              setName(childData.name);
              setBirthDate(childData.birth_date);
              // Load words
              return getWordsForChild(editChildId).then((words) => {
                setInitialWords(words.join(", "));
              });
            }
          })
          .catch(() => {})
          .finally(() => setModeCheckDone(true));
      });
    } else {
      setModeCheckDone(true);
    }
  }, [isAddChildMode, isEditMode]);

  // Focus email on restore mode
  useEffect(() => {
    if (isRestoreMode && emailRef.current) {
      emailRef.current.focus();
    }
  }, [isRestoreMode]);

  // Check if email belongs to an existing account (debounced onBlur)
  const handleEmailBlur = () => {
    // Skip email checking in add-child or edit mode
    if (isAddChildMode || isEditMode) return;

    const trimmed = email.trim();
    if (!trimmed || trimmed === emailChecked) return;

    setCheckingEmail(true);
    setEmailChecked(trimmed);

    import("~/db/queries")
      .then(({ getAccountByEmail }) =>
        getAccountByEmail({ data: { email: trimmed.toLowerCase() } }),
      )
      .then((account) => {
        if (account) {
          setReturningAccount({
            childName: null,
          });
        } else {
          setReturningAccount(null);
        }
      })
      .catch(() => {
        setReturningAccount(null);
      })
      .finally(() => {
        setCheckingEmail(false);
      });
  };

  const handleReturningContinue = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSubmitting(true);

    const result = await setupAccount(trimmed);
    if (result && !result.isNew) {
      if (result.childId) {
        const { syncWordsFromDb } = await import("~/store");
        await syncWordsFromDb();
      }
      navigate({ to: "/dashboard" });
    } else {
      setSubmitting(false);
      setReturningAccount(null);
    }
  };

  // ── Main submit ─────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;

    setSubmitting(true);

    const words = initialWords
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    const finalBirthDate = birthDate;

    // ── Add-child mode: create child linked to account ─────────────────
    if (isAddChildMode) {
      const account = await getAccount();
      if (!account) {
        setSubmitting(false);
        return;
      }

      try {
        const { createChild: dbCreateChild } = await import("~/db/queries");
        const result = await dbCreateChild({
          data: {
            name: trimmedName,
            birthDate: finalBirthDate,
            accountId: account.id,
          },
        });

        if (result && "id" in result) {
          // Sync initial words
          if (words.length > 0) {
            const { addWord: dbAddWord } = await import("~/db/queries");
            for (const word of words) {
              await dbAddWord({
                data: { childId: result.id, word },
              }).catch(() => {});
            }
          }

          // Set as active child and redirect
          setActiveChildId(result.id);

          // Also update localStorage for backward compat
          saveChild({
            name: trimmedName,
            birthDate: finalBirthDate,
            words,
          });
        }
      } catch {
        // Fallback: save to localStorage
        saveChild({
          name: trimmedName,
          birthDate: finalBirthDate,
          words,
        });
      }

      setTimeout(() => navigate({ to: "/dashboard" }), 400);
      return;
    }

    // ── Edit mode: update existing child ────────────────────────────────
    if (isEditMode && editChildId) {
      try {
        const { updateChild: dbUpdateChild } = await import("~/db/queries");
        await dbUpdateChild({
          data: { childId: editChildId, name: trimmedName, birthDate: finalBirthDate },
        });

        // Update localStorage
        saveChild({
          name: trimmedName,
          birthDate: finalBirthDate,
          words,
        });

        // Sync words
        if (words.length > 0) {
          await syncInitialWordsToDb(words);
        }

        setActiveChildId(editChildId);
      } catch {
        saveChild({
          name: trimmedName,
          birthDate: finalBirthDate,
          words,
        });
      }

      setTimeout(() => navigate({ to: "/dashboard" }), 400);
      return;
    }

    // ── Normal setup mode ───────────────────────────────────────────────
    const child: Child = {
      name: trimmedName,
      birthDate: finalBirthDate,
      words,
    };

    const result = await setupAccount(
      trimmedEmail,
      trimmedName,
      finalBirthDate,
      words,
    );

    if (!result) {
      saveChild(child);
      getOrCreateChild(trimmedName, finalBirthDate).then((childId) => {
        if (childId && words.length > 0) {
          syncInitialWordsToDb(words);
        }
      });
    }

    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 800);
  };

  // Live age display
  const displayedAgeMonths = useMemo(() => {
    const birth = new Date(birthDate);
    return calcAgeMonths(birth, today);
  }, [birthDate, today]);

  // Has existing session?
  const hasSession = typeof window !== "undefined" && getSession();

  // ── Heading logic ───────────────────────────────────────────────────────
  const headingIcon = isRestoreMode
    ? "🔑"
    : isAddChildMode
      ? "👶"
      : isEditMode
        ? "👶"
        : existingChild
          ? "👶"
          : "👶";

  const headingText = isRestoreMode
    ? "Welcome Back!"
    : isAddChildMode
      ? "Add Another Child"
      : isEditMode
        ? `Update ${name || "Child"}'s Profile`
        : existingChild
          ? `Update ${existingChild.name}'s Profile`
          : "Welcome to WordBloom!";

  const headingSubtext = isRestoreMode
    ? "Enter your email to restore your child's profile."
    : isAddChildMode
      ? "Tell us about your new little one so we can tailor phrases just for them."
      : isEditMode
        ? "Keep things up to date as your little one grows."
        : existingChild
          ? "Keep things up to date as your little one grows."
          : "Let's get to know your little one so we can find the perfect phrases.";

  const submitLabel = isAddChildMode
    ? "Add Child"
    : isEditMode
      ? "Save Changes"
      : existingChild
        ? "Save Changes"
        : "Start Growing";

  // Show loading while mode check runs
  if ((isAddChildMode || isEditMode) && !modeCheckDone) {
    return (
      <main className="flex flex-1 flex-col bg-cream-50">
        <div className="mx-auto w-full max-w-md flex-1 px-5 py-10 flex items-center justify-center">
          <Spinner />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-cream-50">
      <div className="mx-auto w-full max-w-md flex-1 px-5 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-4xl">{headingIcon}</span>
          <h1 className="mt-3 text-3xl font-bold text-sage-800">
            {headingText}
          </h1>
          <p className="mt-2 text-gray-600">{headingSubtext}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field — hidden in add-child/edit mode (pre-filled from session) */}
          {!isAddChildMode && !isEditMode && (
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-sage-700"
              >
                Your email
              </label>
              <p className="mb-1.5 text-xs text-gray-400">
                Returning? Enter your email to pick up where you left off.
              </p>
              <input
                ref={emailRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setReturningAccount(null);
                  setEmailChecked("");
                }}
                onBlur={handleEmailBlur}
                placeholder="you@example.com"
                required
                maxLength={254}
                className="mt-1.5 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200"
                autoComplete="email"
                inputMode="email"
              />

              {/* Returning parent detection feedback */}
              {checkingEmail && (
                <p className="mt-1.5 flex items-center gap-2 text-sm text-sage-600">
                  <Spinner />
                  Checking...
                </p>
              )}
              {returningAccount && !checkingEmail && (
                <div className="mt-2 animate-fade-in rounded-xl border border-lavender-200 bg-lavender-50 p-4">
                  <p className="font-medium text-lavender-800">
                    ✨ Welcome back! We found your profile.
                  </p>
                  <button
                    type="button"
                    onClick={handleReturningContinue}
                    disabled={submitting}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-lavender-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-lavender-600 active:scale-95 disabled:opacity-50 min-h-[44px]"
                  >
                    {submitting ? (
                      <>
                        <Spinner />
                        Restoring...
                      </>
                    ) : (
                      "Continue →"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Child's name — hidden if returning parent was detected */}
          {!returningAccount && (
            <>
              <div>
                <label
                  htmlFor="childName"
                  className="block text-sm font-semibold text-sage-700"
                >
                  Child&rsquo;s first name
                </label>
                <input
                  id="childName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emma, Leo"
                  required
                  maxLength={60}
                  className="mt-1.5 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200"
                  autoComplete="off"
                />
              </div>

              {/* Birthday */}
              <div>
                <label
                  htmlFor="birthDate"
                  className="block text-sm font-semibold text-sage-700"
                >
                  Birthday
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={maxDate}
                  min={minDate}
                  className="mt-1.5 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-gray-800 shadow-sm transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200 min-h-[44px]"
                />
                <p className="mt-1.5 text-sm font-medium text-sage-700">
                  {formatAgeMonths(displayedAgeMonths)}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  We use this to suggest age-appropriate phrases.
                </p>
              </div>

              {/* Initial words */}
              <div>
                <label
                  htmlFor="initialWords"
                  className="block text-sm font-semibold text-sage-700"
                >
                  Words they can say{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="initialWords"
                  value={initialWords}
                  onChange={(e) => setInitialWords(e.target.value)}
                  placeholder="e.g. mama, dada, ba (for ball), woof"
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Include sounds, approximations, and words — separate with
                  commas.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!name.trim() || !email.trim() || submitting}
                className="w-full rounded-full bg-lavender-500 py-3.5 text-lg font-semibold text-white shadow-md transition-all hover:bg-lavender-600 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  submitLabel
                )}
              </button>
            </>
          )}
        </form>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            to={existingChild || isAddChildMode || isEditMode ? "/dashboard" : "/"}
            className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
          >
            {existingChild || isAddChildMode || isEditMode
              ? "← Back to dashboard"
              : "← Back to home"}
          </Link>
        </div>
      </div>
    </main>
  );
}
