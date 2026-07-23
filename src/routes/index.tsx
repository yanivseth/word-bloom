import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { hasChildProfile, saveSetupDraft } from "~/store";
import { generatePhrases } from "~/engine";
import { ageInMonths } from "~/utils";
import { PhraseCard } from "~/components/PhraseCard";
import type { Phrase } from "~/types";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "WordBloom";
  } catch {
    return "WordBloom";
  }
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "WordBloom — Grow your child's vocabulary" }],
  }),
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    setHasProfile(hasChildProfile());
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 pt-16 pb-10 text-center">
        {/* Logo / icon */}
        <div className="mb-6 text-5xl">🌱</div>

        <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-sage-800 sm:text-5xl">
          Never wonder what to say to your baby again
        </h1>

        <p className="mt-5 max-w-sm text-lg leading-relaxed text-gray-600">
          Other apps track what your child says. {businessName} tells you the
          exact phrase to say next — built on the words they already know. No
          scripts to memorize, no guessing.
        </p>

        {hasProfile ? (
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-lavender-500 px-8 py-3.5 text-lg font-semibold text-white shadow-md transition-all hover:bg-lavender-600 hover:shadow-lg active:scale-95 min-h-[44px]"
          >
            Go to Dashboard
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <TryItPreview />
        )}
      </section>

      {/* Features — lead with the one thing that's better than everything else */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-md space-y-10">
          <FeatureCard
            emoji="💬"
            title="Know exactly what to say"
            description="Open the app and get the exact phrase to say right now — built on the words your child already says. The hardest part of helping them talk, done for you."
          />
          <FeatureCard
            emoji="🎉"
            title="Tap “Said it!” when it happens"
            description="The moment your child says a suggested word, one tap logs it — you feel the win, and tomorrow's phrases build on it."
          />
          <FeatureCard
            emoji="🌸"
            title="Watch them bloom"
            description="Progress charts, weekly recaps, and shareable milestone cards turn everyday moments into visible growth."
          />
        </div>
      </section>

      {/* Backed by research */}
      <section className="border-t border-cream-200 bg-cream-50 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-3 text-center text-2xl font-bold tracking-tight text-sage-700 sm:text-3xl">
            How the phrases know what to say
          </h2>
          <p className="mx-auto mb-10 max-w-md text-center text-gray-600">
            Under the hood, every suggestion is grounded in speech-language
            research — so &ldquo;what to say next&rdquo; is never a guess.
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <ResearchCard
              emoji="🗣️"
              title="Phonetic Scaffolding"
              description="Phrases build on sounds your child can already say — starting simple and adding one new challenge at a time."
              citation="Aligned with developmental sound acquisition norms (McLeod &amp; Crowe, 2018)"
            />
            <ResearchCard
              emoji="🌿"
              title="Expansion &amp; Recasting"
              description="Take what your child says and gently expand it. &ldquo;Ba&rdquo; becomes &ldquo;Ball! Big red ball!&rdquo; — modeling the next step naturally."
              citation="Core SLP techniques documented in language intervention research"
            />
            <ResearchCard
              emoji="📚"
              title="CDI-Aligned Vocabulary"
              description="Every word in WordBloom is drawn from the MacArthur-Bates Communicative Development Inventories — the gold standard in early language assessment."
              citation="Age‑tiered to match typical developmental windows (Fenson et al., 2007; Wordbank, Frank et al., 2017)"
            />
          </div>
        </div>
      </section>

      {/* Bottom nav links */}
      <section className="bg-white px-6 pb-8 text-center space-y-3">
        <div>
          <a
            href="/setup?restore=true"
            className="text-sm font-medium text-lavender-600 underline hover:text-lavender-800"
          >
            Returning parent? Restore your profile →
          </a>
        </div>
        <div>
          <Link
            to="/pricing"
            className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
          >
            View Pricing →
          </Link>
        </div>
      </section>
    </main>
  );
}

/**
 * Instant-aha onboarding: let a parent see a real, personalized phrase for
 * their own child *before* signing up. Runs entirely on the client using the
 * same engine the dashboard uses — no account, no backend. "Save" hands the
 * entered age + words to /setup via a draft so nothing is retyped.
 */
function TryItPreview() {
  const navigate = useNavigate();

  // Default to ~12 months old — the meat of the target range.
  const defaultBirth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().split("T")[0];
  }, []);
  const maxBirth = useMemo(() => new Date().toISOString().split("T")[0], []);
  const minBirth = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 4);
    return d.toISOString().split("T")[0];
  }, []);

  const [birthDate, setBirthDate] = useState(defaultBirth);
  const [words, setWords] = useState("");
  const [phrase, setPhrase] = useState<Phrase | null>(null);

  const parseWords = (raw: string): string[] =>
    raw
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

  const handleTry = (e: FormEvent) => {
    e.preventDefault();
    const wordList = parseWords(words);
    const ageMonths = ageInMonths(birthDate);
    const result = generatePhrases(wordList, ageMonths, {
      count: 1,
      seed: `try:${birthDate}:${wordList.join(",")}`,
    });
    setPhrase(result[0] ?? null);
  };

  const handleSave = () => {
    saveSetupDraft({ birthDate, words: parseWords(words) });
    navigate({ to: "/setup" });
  };

  return (
    <div className="mt-8 w-full max-w-sm text-left">
      <form
        onSubmit={handleTry}
        className="rounded-2xl border border-cream-300 bg-white p-5 shadow-sm"
      >
        <p className="text-center text-sm font-semibold text-sage-700">
          See a phrase for your child — free, no signup
        </p>

        <label className="mt-4 block text-xs font-semibold text-sage-700">
          Your child&rsquo;s birthday
        </label>
        <input
          type="date"
          value={birthDate}
          max={maxBirth}
          min={minBirth}
          onChange={(e) => setBirthDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-gray-800 shadow-sm transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200 min-h-[44px]"
        />

        <label className="mt-3 block text-xs font-semibold text-sage-700">
          A word or sound they say{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder='e.g. "ba", "mama", "woof"'
          className="mt-1 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-gray-800 placeholder-gray-400 shadow-sm transition-colors focus:border-lavender-400 focus:outline-none focus:ring-2 focus:ring-lavender-200 min-h-[44px]"
          autoComplete="off"
        />

        <button
          type="submit"
          className="mt-4 w-full rounded-full bg-lavender-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-lavender-600 hover:shadow-lg active:scale-95 min-h-[44px]"
        >
          {phrase ? "Show me another →" : "Show me a phrase →"}
        </button>
      </form>

      {phrase && (
        <div className="mt-4 animate-fade-in">
          <PhraseCard phrase={phrase} />
          <button
            onClick={handleSave}
            className="mt-3 w-full rounded-full bg-sage-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-sage-600 hover:shadow-lg active:scale-95 min-h-[44px]"
          >
            Save this &amp; get a new one every day →
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            Takes 20 seconds. No credit card.
          </p>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-2xl">
        {emoji}
      </span>
      <div>
        <h3 className="text-lg font-semibold text-sage-700">{title}</h3>
        <p className="mt-1 text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function ResearchCard({
  emoji,
  title,
  description,
  citation,
}: {
  emoji: string;
  title: string;
  description: string;
  citation: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cream-100 text-2xl">
        {emoji}
      </span>
      <h3 className="text-base font-semibold text-sage-700">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
      <hr className="mt-4 w-10 border-t border-cream-200" />
      <p className="mt-3 text-xs italic leading-relaxed text-gray-400">
        {citation}
      </p>
    </div>
  );
}
