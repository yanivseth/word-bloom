import { useState } from "react";
import { deleteWord } from "~/store";
import type { WordClassification } from "~/types";

interface WordBadgeProps {
  word: string;
  onDelete?: (word: string) => void;
  classification?: WordClassification;
}

export function WordBadge({ word, onDelete, classification }: WordBadgeProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(word);
    } else {
      deleteWord(word);
      setDeleting(true);
      setTimeout(() => setDeleting(false), 50);
    }
  };

  if (deleting) return null;

  const isProperNoun = classification?.type === "proper_noun";

  return (
    <span
      className={`group relative inline-flex items-center gap-1 max-w-[200px] rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        isProperNoun
          ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
          : "bg-lavender-100 text-lavender-800 hover:bg-lavender-200"
      }`}
    >
      <span className="truncate">{word}</span>
      {isProperNoun && (
        <span className="shrink-0 rounded-full bg-amber-200 px-1.5 py-0 text-[10px] font-semibold text-amber-700">
          name
        </span>
      )}
      <button
        onClick={handleDelete}
        className={`ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity hover:bg-lavender-300 hover:text-lavender-900 group-hover:opacity-100 ${
          isProperNoun
            ? "text-amber-500 hover:bg-amber-300 hover:text-amber-900"
            : "text-lavender-500"
        }`}
        aria-label={`Remove ${word}`}
      >
        ×
      </button>
    </span>
  );
}
