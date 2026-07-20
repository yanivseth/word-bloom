import type { Phrase } from "~/types";

interface PhraseCardProps {
  phrase: Phrase;
}

export function PhraseCard({ phrase }: PhraseCardProps) {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 p-5 shadow-sm transition-shadow hover:shadow-md animate-slide-up">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sage-600">
        {phrase.context}
      </p>
      <p className="text-lg font-medium leading-relaxed text-gray-800 break-words hyphens-auto [overflow-wrap:anywhere]">
        &ldquo;{phrase.text}&rdquo;
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {phrase.basedOnWord && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700 max-w-[200px]">
            <span className="shrink-0">Building on:</span>{" "}
            <span className="truncate">&ldquo;{phrase.basedOnWord}&rdquo;</span>
          </span>
        )}
        {phrase.newWord && (
          <span className="inline-flex items-center gap-1 rounded-full bg-lavender-100 px-2 py-0.5 text-xs font-medium text-lavender-700 max-w-[200px]">
            <span className="shrink-0">+</span>{" "}
            <span className="truncate">&ldquo;{phrase.newWord}&rdquo;</span>
          </span>
        )}
      </div>
      {phrase.tip && (
        <p className="mt-2 text-xs leading-relaxed text-gray-400 italic break-words">
          💡 {phrase.tip}
        </p>
      )}
    </div>
  );
}
