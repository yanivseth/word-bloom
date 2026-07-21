import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { verifyMagicLink } from "~/store";

export const Route = createFileRoute("/auth/verify")({
  head: () => ({
    meta: [{ title: "WordBloom — Signing you in" }],
  }),
  component: VerifyPage,
});

type Status = "verifying" | "success" | "expired" | "invalid" | "error";

function VerifyPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("invalid");
      return;
    }

    let cancelled = false;
    verifyMagicLink(token).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setStatus("success");
        // Brief beat so the parent sees the confirmation, then in.
        setTimeout(() => {
          navigate({
            to: result.hasChild ? "/dashboard" : "/setup",
            replace: true,
          });
        }, 900);
      } else if (result.reason === "expired") {
        setStatus("expired");
      } else if (result.reason === "invalid") {
        setStatus("invalid");
      } else {
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-cream-50 px-6 py-16 text-center">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 text-5xl">🌱</div>

        {status === "verifying" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-lavender-200 border-t-lavender-500" />
            <h1 className="text-2xl font-bold text-sage-800">Signing you in…</h1>
            <p className="mt-2 text-gray-600">
              Just a moment while we confirm your link.
            </p>
          </>
        )}

        {status === "success" && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-sage-800">
              You&rsquo;re in! 🎉
            </h1>
            <p className="mt-2 text-gray-600">Taking you to your dashboard…</p>
          </div>
        )}

        {(status === "expired" || status === "invalid" || status === "error") && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-sage-800">
              {status === "expired"
                ? "This link has expired"
                : status === "invalid"
                  ? "This link isn't valid"
                  : "Something went wrong"}
            </h1>
            <p className="mt-2 text-gray-600">
              {status === "expired"
                ? "Sign-in links last 30 minutes and can be used once. Request a fresh one to continue."
                : status === "invalid"
                  ? "This sign-in link is incomplete or has already been used. Request a new one below."
                  : "We couldn't sign you in just now. Please request a new link and try again."}
            </p>
            <Link
              to="/setup"
              search={{ restore: "true" }}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-lavender-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-lavender-600 active:scale-95"
            >
              Get a new sign-in link →
            </Link>
            <div className="mt-6">
              <Link
                to="/"
                className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
