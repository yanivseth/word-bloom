import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useState, useEffect } from "react";
import { isPremium } from "~/store";

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

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [{ title: "WordBloom — Pricing" }],
  }),
  loader: () => getBusinessName(),
  component: Pricing,
});

const MONTHLY_PRICE = "$4.99";
const YEARLY_PRICE = "$39.99";
const YEARLY_MONTHLY = "$3.33";

const MONTHLY_STRIPE_LINK = "https://buy.stripe.com/4gM8wP3eogLecyt3ey9fW02";
const YEARLY_STRIPE_LINK = "https://buy.stripe.com/6oU3cv8yI52wcytpeXg9fW03";

const FREE_FEATURES = [
  "1 daily phrase",
  "1 child profile",
  "Basic word tracking",
];

const PREMIUM_FEATURES = [
  "Unlimited daily phrases",
  "Up to 5 child profiles",
  "Word tracking for all children",
];

function Pricing() {
  const businessName = Route.useLoaderData();
  const [annual, setAnnual] = useState(false);
  const [premium, setPremium] = useState<boolean | null>(null);

  useEffect(() => {
    setPremium(typeof window !== "undefined" && isPremium());
  }, []);

  const isPremiumResolved = premium !== null;

  return (
    <main className="flex flex-1 flex-col bg-cream-50">
      {/* Header */}
      <header className="border-b border-cream-200 bg-cream-50 px-5 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            to="/"
            className="text-lg font-bold text-sage-700 hover:text-sage-800"
          >
            🌱 {businessName}
          </Link>
          <Link
            to={premium ? "/dashboard" : "/"}
            className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
          >
            {isPremiumResolved ? (premium ? "Dashboard" : "Home") : "Home"}
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-5 py-10">
        {/* Headline */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-sage-800">
            Upgrade to Premium
          </h1>
          <p className="mt-2 text-gray-600">
            Unlock everything {businessName} has to offer for your little
            one&rsquo;s language journey.
          </p>
        </div>

        {isPremiumResolved && premium && (
          <div className="mb-8 rounded-xl bg-lavender-100 px-5 py-4 text-center animate-fade-in">
            <p className="font-medium text-lavender-800">
              ✨ You&rsquo;re already a Premium member — thank you!
            </p>
            <Link
              to="/dashboard"
              className="mt-2 inline-block text-sm font-medium text-lavender-700 underline hover:text-lavender-900"
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

        {/* Toggle */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium ${
              !annual ? "text-sage-800" : "text-gray-400"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors min-w-[44px] min-h-[44px] justify-center ${
              annual ? "bg-lavender-500" : "bg-cream-300"
            }`}
            aria-label={`Switch to ${annual ? "monthly" : "yearly"} pricing`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                annual ? "translate-x-2.5" : "-translate-x-2.5"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              annual ? "text-sage-800" : "text-gray-400"
            }`}
          >
            Annual{" "}
            <span className="text-xs text-lavender-600">(save 33%)</span>
          </span>
        </div>

        {/* Plan cards — stack on mobile, side-by-side on desktop */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-xl border border-cream-300 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-sage-700">Free</h2>
            <p className="mt-1 text-3xl font-bold text-gray-800">$0</p>
            <p className="text-sm text-gray-400">Forever free</p>

            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="mt-0.5 shrink-0 text-sage-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <span className="inline-block w-full rounded-full border border-cream-300 bg-cream-50 px-4 py-2.5 text-center text-sm font-semibold text-sage-600">
                Current plan
              </span>
            </div>
          </div>

          {/* Premium */}
          <div className="rounded-xl border-2 border-lavender-400 bg-white p-6 shadow-md">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-lavender-700">Premium</h2>
              <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-xs font-semibold text-lavender-700">
                Recommended
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold text-gray-800">
              {annual ? YEARLY_PRICE : MONTHLY_PRICE}
            </p>
            <p className="text-sm text-gray-400">
              {annual ? "per year" : "per month"}
              {annual && (
                <span className="ml-1 text-lavender-600">
                  ({YEARLY_MONTHLY}/mo)
                </span>
              )}
            </p>

            <ul className="mt-6 space-y-3">
              {PREMIUM_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="mt-0.5 shrink-0 text-lavender-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <a
                href={annual ? YEARLY_STRIPE_LINK : MONTHLY_STRIPE_LINK}
                data-premium={annual ? "yearly" : "monthly"}
                className="inline-block w-full rounded-full bg-lavender-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-lavender-600 hover:shadow-md active:scale-95 min-h-[44px] flex items-center justify-center"
              >
                Get Premium
              </a>
            </div>
          </div>
        </div>

        {/* All features included in both plans (gentle nudge) */}
        <p className="mt-8 text-center text-xs text-gray-400">
          Both plans include beautiful, research-backed phrases tailored to your
          child&rsquo;s age and vocabulary. No surprise fees. Cancel anytime.
        </p>

        {/* Post-purchase note */}
        <p className="mt-3 text-center text-xs text-gray-400">
          After purchasing, your premium access will be active immediately &mdash;
          just return to your dashboard.
        </p>

        {/* Back link */}
        <div className="mt-10 border-t border-cream-200 pt-6 text-center">
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
