export interface Child {
  name: string;
  birthDate: string; // ISO date string (YYYY-MM-DD)
  words: string[];
}

export interface ChildProfile {
  id: number;
  name: string;
  birthDate: string; // ISO date string (YYYY-MM-DD)
}

export interface Account {
  id: number;
  email: string;
  isPremium: boolean;
  childId: number | null;
  childName: string | null;
  childBirthDate: string | null;
}

export interface Phrase {
  id: string;
  text: string;
  context: string;
  basedOnWord?: string;
  newWord?: string;
  /** The single loggable word for the "Said it!" button (defaults to newWord) */
  targetWord?: string;
  tip?: string;
}

export interface WordLog {
  word: string;
  dateAdded: string;
  type: "sound" | "approximation" | "word";
}

export type WordClassification =
  | { type: "lexicon_match"; entry: import("./lexicon").LexiconEntry }
  | { type: "proper_noun"; reason: "capitalized" | "not_in_lexicon" }
  | { type: "unknown"; word: string };
