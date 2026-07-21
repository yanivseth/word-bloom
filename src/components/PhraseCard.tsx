import type { Phrase } from "~/types";

interface PhraseCardProps {
  phrase: Phrase;
  /**
   * Called with the target word when the parent taps "Said it!" — the moment
   * the child actually produced the suggested word. Omit to hide the button
   * (e.g. the word is already logged, or there's no single target word).
   */
  onSaidIt?: (word: string) => void;
}

export function PhraseCard({ phrase, onSaidIt }: PhraseCardProps) {
  const targetWord = phrase.targetWord ?? phrase.newWord;

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
      {onSaidIt && targetWord && (
        <button
          onClick={() => onSaidIt(targetWord)}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-sage-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-600 active:scale-95"
        >
          🎉 <span>Said &ldquo;{targetWord}&rdquo;!</span>
        </button>
      )}
    </div>
  );
}
