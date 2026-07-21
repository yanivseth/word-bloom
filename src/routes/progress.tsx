import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  getAccount,
  getSession,
  getChild,
  getWords,
  getChildren,
  getActiveChildId,
  classifyWord,
} from "~/store";
import { LEXICON_MAP } from "~/lexicon";
import { ageInMonths } from "~/utils";
import type { ChildProfile } from "~/types";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [{ title: "WordBloom — Progress" }],
  }),
  component: ProgressPage,
});

interface WordEntry {
  word: string;
  dateAdded: string; // ISO
  source: string;
}

// ── CDI framing data ────────────────────────────────────────────────────────
// Expressive vocabulary ranges (10th–90th percentile, approximate) from
// MacArthur-Bates CDI norms via Wordbank (Frank et al., 2017). Deliberately
// coarse: the point is "the typical range is wide," not a score.
const CDI_RANGES: { maxAge: number; label: string; range: string }[] = [
  { maxAge: 12, label: "6–12 months", range: "0–10 spoken words (plus lots of babbling!)" },
  { maxAge: 15, label: "12–15 months", range: "0–30 spoken words" },
  { maxAge: 18, label: "15–18 months", range: "5–110 spoken words" },
  { maxAge: 24, label: "18–24 months", range: "40–430 spoken words" },
  { maxAge: 30, label: "24–30 months", range: "150–600 spoken words" },
  { maxAge: 48, label: "30–36 months", range: "300–680+ spoken words" },
];

const CATEGORY_LABELS: Record<string, string> = {
  people: "👨‍👩‍👧 People",
  animal: "🐶 Animals",
  food: "🍌 Food & drink",
  body: "👃 Body parts",
  action: "🏃 Actions",
  social: "👋 Social words",
  toy: "🧸 Toys & things",
  descriptor: "✨ Describing words",
};

const CATEGORY_ORDER = [
  "people",
  "animal",
  "food",
  "body",
  "action",
  "social",
  "toy",
  "descriptor",
];

// ── Cumulative words-over-time chart (single series, hover tooltip) ─────────

function WordsOverTimeChart({ entries }: { entries: WordEntry[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const points = useMemo(() => {
    const dated = entries
      .map((e) => ({ ...e, t: new Date(e.dateAdded).getTime() }))
      .filter((e) => !isNaN(e.t))
      .sort((a, b) => a.t - b.t);
    return dated.map((e, i) => ({
      t: e.t,
      count: i + 1,
      word: e.word,
      date: new Date(e.t),
    }));
  }, [entries]);

  if (points.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-cream-300 bg-cream-50 p-6 text-center text-sm text-gray-400">
        The growth chart appears once a few words have been logged over time.
      </p>
    );
  }

  const W = 340;
  const H = 160;
  const PAD_L = 30;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;

  const t0 = points[0].t;
  const t1 = Math.max(points[points.length - 1].t, t0 + 1);
  const maxCount = points[points.length - 1].count;

  const x = (t: number) =>
    PAD_L + ((t - t0) / (t1 - t0)) * (W - PAD_L - PAD_R);
  const y = (c: number) =>
    H - PAD_B - (c / maxCount) * (H - PAD_T - PAD_B);

  // Step-after path: vocabulary is cumulative, jumps on each new word
  let path = `M ${x(points[0].t)} ${y(points[0].count)}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${x(points[i].t)} ${y(points[i - 1].count)} L ${x(points[i].t)} ${y(points[i].count)}`;
  }
  const areaPath = `${path} L ${x(t1)} ${y(points[points.length - 1].count)} L ${x(t1)} ${H - PAD_B} L ${x(t0)} ${H - PAD_B} Z`;

  // Y grid: at most 4 recessive lines on round values
  const yStep = Math.max(1, Math.ceil(maxCount / 4));
  const gridVals: number[] = [];
  for (let v = yStep; v <= maxCount; v += yStep) gridVals.push(v);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX =
      "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(points[i].t) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHoverIdx(best);
  };

  const hover = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Cumulative words over time, now ${maxCount} words`}
        onMouseMove={handleMove}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Recessive grid + y labels */}
        {gridVals.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-cream-200)"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--color-sage-400)"
            >
              {v}
            </text>
          </g>
        ))}
        {/* Baseline */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={H - PAD_B}
          y2={H - PAD_B}
          stroke="var(--color-cream-300)"
          strokeWidth={1}
        />
        {/* X labels: first + last date */}
        <text
          x={PAD_L}
          y={H - 8}
          fontSize={9}
          fill="var(--color-sage-400)"
        >
          {fmtDate(points[0].date)}
        </text>
        <text
          x={W - PAD_R}
          y={H - 8}
          textAnchor="end"
          fontSize={9}
          fill="var(--color-sage-400)"
        >
          {fmtDate(points[points.length - 1].date)}
        </text>
        {/* Area + line */}
        <path d={areaPath} fill="var(--color-sage-100)" opacity={0.7} />
        <path
          d={path}
          fill="none"
          stroke="var(--color-sage-500)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* End label: the headline value */}
        <circle
          cx={x(points[points.length - 1].t)}
          cy={y(maxCount)}
          r={4}
          fill="var(--color-sage-500)"
          stroke="var(--color-cream-50)"
          strokeWidth={2}
        />
        {/* Hover crosshair */}
        {hover && (
          <g>
            <line
              x1={x(hover.t)}
              x2={x(hover.t)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="var(--color-sage-300)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover.t)}
              cy={y(hover.count)}
              r={5}
              fill="var(--color-lavender-500)"
              stroke="var(--color-cream-50)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-xs shadow-sm">
          <span className="font-semibold text-sage-700">
            {hover.count} word{hover.count === 1 ? "" : "s"}
          </span>{" "}
          <span className="text-gray-500">
            · &ldquo;{hover.word}&rdquo; · {fmtDate(hover.date)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Category coverage bars (one measure, single hue, direct labels) ─────────

function CategoryBars({ words }: { words: string[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of words) {
      const entry = LEXICON_MAP.get(w.toLowerCase().trim());
      if (entry) map.set(entry.category, (map.get(entry.category) ?? 0) + 1);
    }
    return map;
  }, [words]);

  const max = Math.max(1, ...counts.values());
  const covered = CATEGORY_ORDER.filter((c) => (counts.get(c) ?? 0) > 0);

  return (
    <div>
      <div className="space-y-2">
        {CATEGORY_ORDER.map((cat) => {
          const n = counts.get(cat) ?? 0;
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-36 shrink-0 truncate text-xs text-sage-700">
                {CATEGORY_LABELS[cat]}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-r-[4px] bg-cream-100">
                <div
                  className="h-full rounded-r-[4px] bg-sage-500 transition-all"
                  style={{ width: `${(n / max) * 100}%` }}
                  title={`${n} word${n === 1 ? "" : "s"}`}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-semibold text-sage-700">
                {n}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        {covered.length} of {CATEGORY_ORDER.length} word categories explored.
        {covered.length < CATEGORY_ORDER.length &&
          " New categories open naturally as you talk through daily routines."}
      </p>
    </div>
  );
}

// ── Share card (canvas → PNG) ───────────────────────────────────────────────

function drawShareCard(
  canvas: HTMLCanvasElement,
  name: string,
  wordCount: number,
  latestWords: string[],
): void {
  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#fefdfb";
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = "#f6f7f4";
  ctx.beginPath();
  ctx.arc(S, 0, 420, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, S, 340, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";

  ctx.font = "120px serif";
  ctx.fillText("🌱", S / 2, 260);

  ctx.fillStyle = "#43503b";
  ctx.font = "bold 64px system-ui, sans-serif";
  ctx.fillText(`${name} has said`, S / 2, 420);

  ctx.fillStyle = "#6d7f5f";
  ctx.font = "bold 200px system-ui, sans-serif";
  ctx.fillText(String(wordCount), S / 2, 640);

  ctx.fillStyle = "#43503b";
  ctx.font = "bold 64px system-ui, sans-serif";
  ctx.fillText(wordCount === 1 ? "word!" : "words!", S / 2, 740);

  if (latestWords.length > 0) {
    ctx.fillStyle = "#7e5cad";
    ctx.font = "44px system-ui, sans-serif";
    const latest = latestWords.map((w) => `“${w}”`).join("  ");
    ctx.fillText(`Latest: ${latest}`, S / 2, 850);
  }

  ctx.fillStyle = "#8a9a79";
  ctx.font = "36px system-ui, sans-serif";
  ctx.fillText("Growing with WordBloom 🌱", S / 2, 980);
}

function ShareCard({
  name,
  wordCount,
  latestWords,
}: {
  name: string;
  wordCount: number;
  latestWords: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      drawShareCard(canvasRef.current, name, wordCount, latestWords);
    }
  }, [name, wordCount, latestWords]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return;

    const file = new File([blob], "wordbloom-milestone.png", {
      type: "image/png",
    });
    // Native share sheet where available (mobile), download otherwise
    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: "WordBloom milestone",
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // fall through to download (user may have cancelled — harmless)
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wordbloom-milestone.png";
    a.click();
    URL.revokeObjectURL(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, []);

  if (wordCount === 0) return null;

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border border-cream-300 shadow-sm"
      />
      <button
        onClick={handleShare}
        className="mt-3 w-full rounded-xl bg-lavender-500 px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-lavender-600 active:scale-95 min-h-[44px]"
      >
        {shared ? "Shared! 🎉" : "📤 Share this milestone"}
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">
        Perfect for the family group chat.
      </p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

function ProgressPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WordEntry[]>([]);
  const [childName, setChildName] = useState<string>("Your child");
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const token = getSession();
      if (token) {
        const account = await getAccount();
        if (cancelled) return;
        if (!account) {
          navigate({ to: "/setup", replace: true });
          return;
        }
        const allChildren: ChildProfile[] = await getChildren(account.id);
        if (cancelled) return;
        const storedActiveId = getActiveChildId();
        const active =
          allChildren.find((c) => c.id === storedActiveId) ?? allChildren[0];
        if (active) {
          setChildName(active.name);
          setBirthDate(active.birthDate);
          try {
            const { getWordsWithDates } = await import("~/db/queries");
            const dbEntries = await getWordsWithDates({
              data: { childId: active.id },
            });
            if (!cancelled) setEntries(dbEntries);
          } catch {
            // fall through with empty entries
          }
        }
      } else {
        // Local fallback: words without server dates
        const child = getChild();
        if (child) {
          setChildName(child.name);
          setBirthDate(child.birthDate);
        }
        const now = new Date().toISOString();
        setEntries(
          getWords().map((w) => ({ word: w, dateAdded: now, source: "manual" })),
        );
      }
      if (!cancelled) setIsLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const words = useMemo(() => entries.map((e) => e.word), [entries]);
  const ageMonths = birthDate ? ageInMonths(birthDate) : 18;
  const cdiRange =
    CDI_RANGES.find((r) => ageMonths <= r.maxAge) ??
    CDI_RANGES[CDI_RANGES.length - 1];

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const wordsThisWeek = entries.filter(
    (e) => new Date(e.dateAdded).getTime() >= weekAgo,
  ).length;
  const fromSuggestions = entries.filter(
    (e) => e.source === "suggestion",
  ).length;

  const latestWords = [...entries]
    .sort(
      (a, b) =>
        new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
    )
    .slice(0, 3)
    .map((e) => e.word);

  const soundCount = words.filter(
    (w) => classifyWord(w).type === "unknown",
  ).length;

  return (
    <main className="flex flex-1 flex-col bg-cream-50">
      <header className="sticky top-0 z-10 border-b border-cream-200 bg-cream-50/90 px-5 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <h1 className="text-2xl font-bold text-sage-800">
            📈 {childName}&rsquo;s Progress
          </h1>
          <Link
            to="/dashboard"
            className="rounded-full bg-cream-200 px-3 py-1.5 text-xs font-medium text-sage-700 transition-colors hover:bg-cream-300 min-h-[44px] flex items-center"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-5 py-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-40 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <section className="mb-8 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-cream-300 bg-white p-4 text-center">
                <p className="text-3xl font-bold text-sage-700">
                  {words.length}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  word{words.length === 1 ? "" : "s"} logged
                </p>
              </div>
              <div className="rounded-xl border border-cream-300 bg-white p-4 text-center">
                <p className="text-3xl font-bold text-sage-700">
                  {wordsThisWeek}
                </p>
                <p className="mt-1 text-xs text-gray-500">this week</p>
              </div>
              <div className="rounded-xl border border-cream-300 bg-white p-4 text-center">
                <p className="text-3xl font-bold text-sage-700">
                  {fromSuggestions}
                </p>
                <p className="mt-1 text-xs text-gray-500">from phrases</p>
              </div>
            </section>

            {/* Growth chart */}
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-sage-700">
                🌿 Word garden growth
              </h2>
              <div className="rounded-xl border border-cream-300 bg-white p-4">
                <WordsOverTimeChart entries={entries} />
              </div>
            </section>

            {/* Category coverage */}
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-sage-700">
                🗂️ Word categories
              </h2>
              <div className="rounded-xl border border-cream-300 bg-white p-4">
                <CategoryBars words={words} />
              </div>
            </section>

            {/* CDI framing — ranges, never verdicts */}
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-sage-700">
                📚 What&rsquo;s typical at this age
              </h2>
              <div className="rounded-xl border border-cream-300 bg-white p-5 text-sm leading-relaxed text-gray-600">
                <p>
                  At {cdiRange.label}, children typically say{" "}
                  <span className="font-semibold text-sage-700">
                    {cdiRange.range}
                  </span>{" "}
                  (10th–90th percentile, MacArthur-Bates CDI norms).
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  The typical range is <em>very</em> wide, and the words logged
                  here are usually just a slice of everything your child says.
                  Every child blooms at their own pace. If you ever have
                  concerns, your pediatrician or a speech-language pathologist
                  is the right person to ask.
                </p>
              </div>
            </section>

            {/* Share card */}
            {words.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-lg font-semibold text-sage-700">
                  🎉 Milestone card
                </h2>
                <ShareCard
                  name={childName}
                  wordCount={words.length}
                  latestWords={latestWords}
                />
              </section>
            )}

            {/* Word log (table view of the chart data) */}
            {entries.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-lg font-semibold text-sage-700">
                  📖 Word log
                </h2>
                <div className="overflow-x-auto rounded-xl border border-cream-300 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-200 text-left text-xs uppercase tracking-wider text-sage-500">
                        <th className="px-4 py-2 font-semibold">Word</th>
                        <th className="px-4 py-2 font-semibold">Added</th>
                        <th className="px-4 py-2 font-semibold">How</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...entries]
                        .sort(
                          (a, b) =>
                            new Date(b.dateAdded).getTime() -
                            new Date(a.dateAdded).getTime(),
                        )
                        .map((e) => (
                          <tr
                            key={`${e.word}-${e.dateAdded}`}
                            className="border-b border-cream-100 last:border-0"
                          >
                            <td className="px-4 py-2 font-medium text-gray-800">
                              {e.word}
                            </td>
                            <td className="px-4 py-2 text-gray-500">
                              {new Date(e.dateAdded).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-500">
                              {e.source === "suggestion" ? "🎉 phrase" : "✍️ logged"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {soundCount > 0 && (
                  <p className="mt-2 text-xs text-gray-400">
                    Includes {soundCount} sound
                    {soundCount === 1 ? "" : "s"}/approximation
                    {soundCount === 1 ? "" : "s"} — those count! They&rsquo;re
                    the roots words grow from.
                  </p>
                )}
              </section>
            )}
          </>
        )}

        <div className="mt-4 border-t border-cream-200 pt-6 text-center">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
