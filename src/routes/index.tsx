import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useState, useEffect } from "react";
import { hasChildProfile } from "~/store";

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

  const ctaLink = hasProfile ? "/dashboard" : "/setup";

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 pt-16 pb-10 text-center">
        {/* Logo / icon */}
        <div className="mb-6 text-5xl">🌱</div>

        <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-sage-800 sm:text-5xl">
          Grow your child&rsquo;s vocabulary, one word at a time
        </h1>

        <p className="mt-5 max-w-sm text-lg leading-relaxed text-gray-600">
          {businessName} gives you daily, personalized phrases to say to your
          baby or toddler — each one building on the words they already know.
        </p>

        <Link
          to={ctaLink}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-lavender-500 px-8 py-3.5 text-lg font-semibold text-white shadow-md transition-all hover:bg-lavender-600 hover:shadow-lg active:scale-95 min-h-[44px]"
        >
          {hasProfile ? "Go to Dashboard" : "Get Started"}
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      {/* Features */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-md space-y-10">
          <FeatureCard
            emoji="📝"
            title="Log what they say"
            description="Track every sound, babble, and word. Watch their vocabulary grow day by day."
          />
          <FeatureCard
            emoji="💬"
            title="Get daily phrases"
            description="Receive playful, research-backed phrases that build on what your child can already say."
          />
          <FeatureCard
            emoji="🎉"
            title="Tap “Said it!” when it happens"
            description="The moment your child says a suggested word, one tap logs it — and tomorrow's phrases build on it."
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
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-sage-700 sm:text-3xl">
            Backed by speech‑language research
          </h2>

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
