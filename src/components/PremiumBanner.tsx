import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { isPremium } from "~/store";

const DISMISS_KEY = "wordbloom_premium_banner_dismissed";

function getDismissExpiry(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const expiry = parseInt(raw, 10);
    return isNaN(expiry) ? null : expiry;
  } catch {
    return null;
  }
}

function setDismissExpiry(days: number): void {
  if (typeof window === "undefined") return;
  try {
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(expiry));
  } catch {
    // localStorage unavailable
  }
}

export function PremiumBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only show for free users, and only if not dismissed (or dismissal expired)
    if (isPremium()) return;

    const expiry = getDismissExpiry();
    if (expiry && expiry > Date.now()) return;

    // Slight delay for smooth entrance
    const timer = setTimeout(() => {
      setVisible(true);
      setMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissExpiry(7); // re-show after 7 days
    setVisible(false);
  };

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        visible
          ? "max-h-40 opacity-100"
          : "max-h-0 opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative rounded-xl bg-gradient-to-r from-lavender-100 via-lavender-50 to-cream-100 px-5 py-4 shadow-sm">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-lavender-500 transition-colors hover:bg-lavender-200 hover:text-lavender-700"
          aria-label="Dismiss"
        >
          &times;
        </button>

        <div className="pr-6">
          <p className="text-sm font-medium text-lavender-800">
            🌱 You&rsquo;re on the free plan. Upgrade to Premium for unlimited
            phrases and up to 5 children &mdash; $4.99/mo.
          </p>
          <Link
            to="/pricing"
            className="mt-2 inline-block rounded-full bg-lavender-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-lavender-600 min-h-[44px] flex items-center"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
