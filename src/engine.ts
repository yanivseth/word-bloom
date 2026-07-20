import { LEXICON, LEXICON_MAP, type LexiconEntry } from "./lexicon";
import type { Phrase, WordClassification } from "./types";

// ── Helpers ──────────────────────────────────────────────────

/** Extract the initial CV or approximation from a child's production */
function extractInitialCV(word: string): string {
  const w = word.toLowerCase().trim();
  if (!w) return "";
  // Vowel-initial words: just the first vowel
  if (/^[aeiou]/.test(w)) return w[0];
  // Consonant cluster: take first consonant + following vowel if present
  const m = w.match(/^([bcdfghjklmnpqrstvwxyz]+)([aeiou])?/);
  if (!m) return w.slice(0, 2);
  const cons = m[1] ?? "";
  const vowel = m[2] ?? "";
  if (cons.length >= 2 && vowel) return cons[0] + vowel;
  if (cons && vowel) return cons + vowel;
  return cons.slice(0, 2) || w.slice(0, 2);
}

/** Phonological process mapping: child's production → possible adult initialCV patterns */
const PHONO_MAP: Record<string, string[]> = {
  // Fronting: velar → alveolar (child says "tat" for "cat")
  ta: ["ka", "ga", "ta"],
  te: ["ke", "ge", "te"],
  ti: ["ki", "gi", "ti"],
  to: ["ko", "go", "to"],
  tu: ["ku", "gu", "tu"],
  da: ["ka", "ga", "da"],
  de: ["ke", "ge", "de"],
  di: ["ki", "gi", "di"],
  do: ["ko", "go", "do"],
  du: ["ku", "gu", "du"],
  // Stopping: fricative → stop (child says "tun" for "sun")
  sa: ["sa", "ta", "da"],
  se: ["se", "te", "de"],
  si: ["si", "ti", "di"],
  so: ["so", "to", "do"],
  su: ["su", "tu", "du"],
  fa: ["fa", "pa", "ba"],
  fe: ["fe", "pe", "be"],
  fi: ["fi", "pi", "bi"],
  fo: ["fo", "po", "bo"],
  fu: ["fu", "pu", "bu"],
  va: ["va", "ba", "pa"],
  ve: ["ve", "be", "pe"],
  vi: ["vi", "bi", "pi"],
  vo: ["vo", "bo", "po"],
  vu: ["vu", "bu", "pu"],
};

function getInitialCVAlternatives(childCV: string): string[] {
  if (!childCV) return [];
  const key = childCV.slice(0, 2).toLowerCase();
  const mapped = PHONO_MAP[key];
  if (mapped) return [key, ...mapped];
  return [key];
}

// ── Word classification ──────────────────────────────────────

/** Classify a child's word: lexicon match, proper noun, or unknown */
export function classifyWord(word: string): WordClassification {
  const trimmed = word.trim();
  if (!trimmed) return { type: "unknown", word: trimmed };

  // Check for exact lexicon match (case-insensitive)
  const lower = trimmed.toLowerCase();
  const entry = LEXICON_MAP.get(lower);
  if (entry) return { type: "lexicon_match", entry };

  // Check if it looks like a proper noun (starts with capital letter)
  if (/^[A-Z]/.test(trimmed)) {
    return { type: "proper_noun", reason: "capitalized" };
  }

  // Unknown — not in lexicon, not a proper noun
  return { type: "unknown", word: trimmed };
}

// ── Proper noun phrase generation ────────────────────────────

const PROPER_NOUN_TEMPLATES: string[] = [
  "Where's [name]? There's [name]!",
  "[name] is here! Hi, [name]!",
  "Can you wave to [name]? Bye-bye, [name]!",
];

function generateProperNounPhrases(
  name: string,
  count: number,
): Phrase[] {
  const phrases: Phrase[] = [];
  for (let i = 0; i < Math.min(count, PROPER_NOUN_TEMPLATES.length); i++) {
    const text = PROPER_NOUN_TEMPLATES[i].replace(/\[name\]/g, name);
    phrases.push({
      id: `pn-${++phraseCounter}`,
      text,
      context: "Anytime — using names",
      basedOnWord: name,
      newWord: undefined,
      tip: `Use "${name}" often — familiar names help your child connect words to people.`,
    });
  }
  return phrases;
}

/** Score a lexicon entry against the child's known word list */
function scoreEntry(
  entry: LexiconEntry,
  knownWords: string[],
  ageMonths: number,
): number {
  let score = 0;

  // Direct match: child already says this word
  if (knownWords.some((w) => w.toLowerCase().trim() === entry.word)) {
    score = 10; // highest priority for building on known words
  }

  // Age bonus: words near the child's age get priority
  const ageDelta = Math.abs(entry.ageMonths - ageMonths);
  if (ageDelta <= 3) score += 2;
  else if (ageDelta <= 6) score += 1;

  // Tier bonus: words in child's likely phonetic tier
  const childTier = ageToTier(ageMonths);
  if (entry.phoneticTier <= childTier) score += 1;

  return score;
}

function ageToTier(ageMonths: number): number {
  if (ageMonths < 12) return 1;
  if (ageMonths < 18) return 2;
  if (ageMonths < 24) return 3;
  if (ageMonths < 36) return 4;
  return 5;
}

/** Find lexicon entries that match a child's word/phonetic approximation */
function findMatches(childWord: string): LexiconEntry[] {
  const cleaned = childWord.toLowerCase().trim();
  if (!cleaned) return [];
  const cv = extractInitialCV(cleaned);
  const alternatives = getInitialCVAlternatives(cv);

  // Collect all matching entries from lexicon
  const matches: LexiconEntry[] = [];
  for (const alt of new Set(alternatives)) {
    for (const entry of LEXICON) {
      if (entry.initialCV === alt && !matches.includes(entry)) {
        matches.push(entry);
      }
    }
  }
  return matches;
}

/** Expand to "next-step" words: share a consonant tier or one tier up */
function findExpansions(
  matchedEntries: LexiconEntry[],
  knownWords: string[],
  ageMonths: number,
): LexiconEntry[] {
  const knownSet = new Set(knownWords.map((w) => w.toLowerCase().trim()));
  const tiers = new Set(matchedEntries.map((e) => e.phoneticTier));
  const childTier = ageToTier(ageMonths);

  const candidates: LexiconEntry[] = [];
  for (const entry of LEXICON) {
    // Skip words child already has
    if (knownSet.has(entry.word)) continue;
    // Within reach: same tier or one up, and not above child's developmental range
    if (
      entry.phoneticTier <= childTier + 1 &&
      (tiers.has(entry.phoneticTier) || tiers.has(entry.phoneticTier - 1))
    ) {
      candidates.push(entry);
    }
  }
  return candidates;
}

// ── Context mapping ──────────────────────────────────────────

const CONTEXT_KEYWORDS: Record<string, string> = {
  morning: "morning",
  breakfast: "mealtime",
  lunch: "mealtime",
  dinner: "mealtime",
  mealtime: "mealtime",
  eat: "mealtime",
  food: "mealtime",
  bath: "bathtime",
  bathtime: "bathtime",
  wash: "bathtime",
  play: "playtime",
  playtime: "playtime",
  toy: "playtime",
  book: "playtime",
  sleep: "bedtime",
  bed: "bedtime",
  bedtime: "bedtime",
  nap: "bedtime",
  night: "bedtime",
  dress: "dressing",
  clothes: "dressing",
  outside: "outside",
  walk: "outside",
  park: "outside",
};

const CATEGORY_CONTEXTS: Record<string, string> = {
  food: "At mealtime",
  action: "During play",
  animal: "While reading or playing",
  body: "At bath time or changing",
  people: "Anytime",
  social: "Anytime",
  toy: "During playtime",
  descriptor: "Anytime",
};

const CONTEXT_SPECIFIC_PHRASES: Record<string, string[]> = {
  mealtime: [
    "At mealtime",
    "During mealtime",
    "At the table",
  ],
  bathtime: [
    "At bath time",
    "During bath time",
    "In the tub",
  ],
  playtime: [
    "During playtime",
    "While playing",
    "At playtime",
  ],
  bedtime: [
    "At bedtime",
    "During the bedtime routine",
    "Before sleep",
  ],
  dressing: [
    "While getting dressed",
    "When changing clothes",
    "Getting ready",
  ],
  outside: [
    "While outside",
    "On a walk",
    "Exploring outside",
  ],
};

// ── Age-bracket starter phrases (cold start) ─────────────────

const STARTER_PHRASES: Record<string, Phrase[]> = {
  "6-12": [
    {
      id: "start-1",
      text: "Ma-ma-ma! Mama is here!",
      context: "Anytime — face-to-face",
      basedOnWord: "mama",
      tip: "Face your baby so they can see your mouth move.",
    },
    {
      id: "start-2",
      text: "Ba-ba-ba! Bye-bye, see you soon!",
      context: "When someone is leaving",
      basedOnWord: "bye",
      tip: "Wave your hand while you say bye-bye.",
    },
    {
      id: "start-3",
      text: "Uh-oh! The toy fell down.",
      context: "When something drops or spills",
      basedOnWord: "uh-oh",
      tip: "Pause and wait — your baby may try to imitate the sound.",
    },
    {
      id: "start-4",
      text: "Da-da-da! Dada is home!",
      context: "Anytime — greeting",
      basedOnWord: "dada",
      tip: "Repeat the sounds slowly and clearly.",
    },
    {
      id: "start-5",
      text: "Pa-pa-pa! Pat your tummy. Pat-pat-pat!",
      context: "During play or diaper change",
      basedOnWord: "tummy",
      tip: "Pair sounds with gentle touch on your baby.",
    },
    {
      id: "start-6",
      text: "Woof woof! The dog says woof!",
      context: "While looking at pictures or pets",
      basedOnWord: "woof",
      tip: "Use a fun, animated voice — babies love animal sounds.",
    },
  ],
  "12-18": [
    {
      id: "start-12-1",
      text: "I see the ball! The ball is round. Let's roll the ball.",
      context: "During playtime",
      basedOnWord: "ball",
      tip: "Say the word 'ball' several times in different sentences.",
    },
    {
      id: "start-12-2",
      text: "Where's your nose? There it is! Boop! I found your nose!",
      context: "During bath time or changing",
      basedOnWord: "nose",
      tip: "Touch your child's nose gently as you name it.",
    },
    {
      id: "start-12-3",
      text: "Milk time! Here's your milk. Can you hold the cup?",
      context: "At mealtime",
      basedOnWord: "milk",
      tip: "Name the drink every time — repetition builds words.",
    },
    {
      id: "start-12-4",
      text: "Up, up, up! You're going up! Up so high!",
      context: "When lifting your child",
      basedOnWord: "up",
      tip: "Emphasize the word by saying it at the same moment as the action.",
    },
    {
      id: "start-12-5",
      text: "Look at the dog! The dog is running. Fast dog!",
      context: "While outside or reading",
      basedOnWord: "dog",
      newWord: "run",
      tip: "Add one action word to what you're describing.",
    },
    {
      id: "start-12-6",
      text: "Do you want more banana? More? Here's more!",
      context: "At mealtime",
      basedOnWord: "more",
      tip: "Pause after asking — give your child time to respond.",
    },
  ],
  "18-24": [
    {
      id: "start-18-1",
      text: "Let's open the book. Turn the page! What do you see?",
      context: "During book time",
      basedOnWord: "book",
      newWord: "open",
      tip: "Wait after asking a question — your child may point or name.",
    },
    {
      id: "start-18-2",
      text: "Your shoe fell off! Let's put on your shoe. One shoe, two shoes!",
      context: "While getting dressed",
      basedOnWord: "shoe",
      tip: "Count items together to add number words naturally.",
    },
    {
      id: "start-18-3",
      text: "The water is splashing! Wet hands! Splash, splash!",
      context: "At bath time",
      basedOnWord: "water",
      newWord: "wet",
      tip: "Describe what your child is experiencing in the moment.",
    },
    {
      id: "start-18-4",
      text: "Are you all done eating? All done! Let's wash hands.",
      context: "After mealtime",
      basedOnWord: "all-done",
      tip: "Use the same routine phrases each time to build predictability.",
    },
    {
      id: "start-18-5",
      text: "Push the car! Vroom vroom! The car goes fast!",
      context: "During playtime",
      basedOnWord: "car",
      newWord: "push",
      tip: "Narrate what your child is doing — 'parallel talk' boosts language.",
    },
    {
      id: "start-18-6",
      text: "Big hug! I love your hugs. Can I have a hug?",
      context: "Anytime",
      basedOnWord: "hug",
      newWord: "big",
      tip: "Model two-word combinations your child can build toward.",
    },
  ],
  "24-36": [
    {
      id: "start-24-1",
      text: "Do you want the big cup or the small cup?",
      context: "At mealtime",
      basedOnWord: "cup",
      newWord: "small",
      tip: "Offer choices to encourage your child to use words.",
    },
    {
      id: "start-24-2",
      text: "First we put on shoes, then we go outside.",
      context: "Getting ready to go out",
      basedOnWord: "shoe",
      newWord: "first",
      tip: "Use sequence words to help your child understand order.",
    },
    {
      id: "start-24-3",
      text: "I'm cutting the apple. Cut, cut, cut! Now we eat the apple.",
      context: "At mealtime",
      basedOnWord: "apple",
      newWord: "cut",
      tip: "Narrate your own actions — 'self-talk' shows language in action.",
    },
    {
      id: "start-24-4",
      text: "Jump like a frog! Jump, jump, jump! You jumped so high!",
      context: "During playtime",
      basedOnWord: "jump",
      tip: "Add -ed and -ing endings in everyday talk — no need to correct your child.",
    },
    {
      id: "start-24-5",
      text: "Where's your bear? Is the bear under the blanket?",
      context: "During playtime",
      basedOnWord: "bear",
      newWord: "under",
      tip: "Add location words like 'under,' 'in,' and 'on' during play.",
    },
    {
      id: "start-24-6",
      text: "I see a bird outside! The bird is flying. Fly, bird, fly!",
      context: "While looking outside",
      basedOnWord: "bird",
      newWord: "fly",
      tip: "Expand what your child says by adding one word.",
    },
  ],
};

// ── Main engine ──────────────────────────────────────────────

let phraseCounter = 0;

export function generatePhrases(
  childWords: string[],
  ageMonths: number,
  count: number = 3,
  contextHint?: string,
): Phrase[] {
  // ── Cold start: no words yet ────────────────────────────
  if (!childWords || childWords.length === 0) {
    return getColdStartPhrases(ageMonths, count);
  }

  interface ScoredPhrase {
    phrase: Phrase;
    score: number;
  }

  const results: ScoredPhrase[] = [];
  const usedEntries = new Set<string>();

  // ── Step 1: Classify each child word ─────────────────────
  const properNouns: string[] = [];
  for (const cw of childWords) {
    const classification = classifyWord(cw);
    if (classification.type === "proper_noun") {
      properNouns.push(cw);
    }
  }

  // ── Step 2: Match child words to lexicon ───────────────
  const allMatches: { childWord: string; entry: LexiconEntry }[] = [];
  for (const cw of childWords) {
    const matches = findMatches(cw);
    for (const m of matches) {
      allMatches.push({ childWord: cw, entry: m });
    }
  }

  const matchedEntries = allMatches.map((m) => m.entry);

  // ── Step 3: Expand to next-step words ──────────────────
  const expansions = findExpansions(matchedEntries, childWords, ageMonths);

  // ── Step 4: Generate proper noun phrases (score 3) ─────
  for (const name of properNouns) {
    const pnPhrases = generateProperNounPhrases(name, 1);
    for (const p of pnPhrases) {
      results.push({ phrase: p, score: 3 });
    }
  }

  // ── Step 5: Generate phrase candidates ─────────────────
  // From direct matches (score 3)
  for (const { childWord, entry } of allMatches) {
    const phrases = pickPhrasesForEntry(entry, childWord, contextHint, 3);
    for (const p of phrases) {
      if (!usedEntries.has(entry.word)) {
        results.push({ phrase: p, score: 3 });
        usedEntries.add(entry.word);
      }
    }
  }

  // From phonetic expansions (score 2)
  for (const entry of expansions) {
    if (usedEntries.has(entry.word)) continue;
    // Find which known word is closest phonetically
    const closestCV = findClosestKnownCV(entry.initialCV, allMatches);
    const basedOn = closestCV || entry.word;
    const phrases = pickPhrasesForEntry(entry, basedOn, contextHint, entry.phrases.length <= 1 ? 1 : 2);
    for (const p of phrases) {
      results.push({ phrase: p, score: 2 });
    }
    usedEntries.add(entry.word);
  }

  // From age-appropriate new words (score 1)
  const tier = ageToTier(ageMonths);
  for (const entry of LEXICON) {
    if (results.length >= count * 4) break; // enough candidates
    if (usedEntries.has(entry.word)) continue;
    if (entry.phoneticTier <= tier + 1 && entry.ageMonths <= ageMonths + 3) {
      const phrases = pickPhrasesForEntry(entry, entry.word, contextHint, 1);
      for (const p of phrases) {
        results.push({ phrase: p, score: 1 });
      }
      usedEntries.add(entry.word);
    }
  }

  // ── Step 6: Sort & select ──────────────────────────────
  // Sort by score descending, then shuffle within same score for variety
  results.sort((a, b) => b.score - a.score);

  // Within each score band, shuffle
  const bands: Map<number, ScoredPhrase[]> = new Map();
  for (const r of results) {
    const band = bands.get(r.score) || [];
    band.push(r);
    bands.set(r.score, band);
  }

  const final: Phrase[] = [];
  for (const [, band] of [...bands.entries()].sort((a, b) => b[0] - a[0])) {
    // Shuffle the band
    const shuffled = [...band].sort(() => Math.random() - 0.5);
    for (const s of shuffled) {
      if (final.length >= count) break;
      // Avoid duplicates
      if (!final.some((f) => f.text === s.phrase.text)) {
        final.push(s.phrase);
      }
    }
    if (final.length >= count) break;
  }

  // If we still don't have enough, fill from cold start
  if (final.length < count) {
    const cold = getColdStartPhrases(ageMonths, count - final.length, childWords);
    for (const c of cold) {
      if (!final.some((f) => f.text === c.text)) {
        final.push(c);
      }
    }
    // Limit to count
    return final.slice(0, count);
  }

  return final.slice(0, count);
}

// ── Internal helpers ────────────────────────────────────────

function pickPhrasesForEntry(
  entry: LexiconEntry,
  basedOnWord: string,
  contextHint: string | undefined,
  maxCount: number,
): Phrase[] {
  const phrases: Phrase[] = [];
  const usedTexts = new Set<string>();

  for (const template of entry.phrases) {
    if (phrases.length >= maxCount) break;
    if (usedTexts.has(template)) continue;
    usedTexts.add(template);

    const context = resolveContext(entry, contextHint);

    // Determine context text
    const ctxText =
      contextHint && CONTEXT_SPECIFIC_PHRASES[context]
        ? pickRandom(CONTEXT_SPECIFIC_PHRASES[context])
        : CATEGORY_CONTEXTS[entry.category] || "Anytime";

    const isDirectlyKnown = basedOnWord !== entry.word;
    const tip = isDirectlyKnown
      ? `Building on "${basedOnWord}" — model this phrase naturally during ${context}.`
      : `New word "${entry.word}" — say it slowly and clearly during ${context}.`;

    phrases.push({
      id: `p-${++phraseCounter}`,
      text: template,
      context: ctxText,
      basedOnWord,
      newWord: isDirectlyKnown ? entry.word : undefined,
      tip,
    });
  }
  return phrases;
}

function resolveContext(entry: LexiconEntry, contextHint?: string): string {
  if (contextHint) {
    const mapped = CONTEXT_KEYWORDS[contextHint.toLowerCase().trim()] || contextHint.toLowerCase().trim();
    return mapped;
  }
  // Map category to context
  const catMap: Record<string, string> = {
    food: "mealtime",
    action: "playtime",
    animal: "playtime",
    body: "bathtime",
    people: "playtime",
    social: "playtime",
    toy: "playtime",
    descriptor: "playtime",
  };
  return catMap[entry.category] || "playtime";
}

function findClosestKnownCV(
  targetCV: string,
  matches: { childWord: string; entry: LexiconEntry }[],
): string | null {
  for (const m of matches) {
    if (m.entry.initialCV === targetCV) return m.childWord;
  }
  // Fall back: same tier
  const targetTier = LEXICON.find((e) => e.initialCV === targetCV)?.phoneticTier;
  for (const m of matches) {
    if (m.entry.phoneticTier === targetTier) return m.childWord;
  }
  return matches.length > 0 ? matches[0].childWord : null;
}

function getColdStartPhrases(
  ageMonths: number,
  count: number,
  childWords?: string[],
): Phrase[] {
  // If parent entered words, try to personalize the cold start
  if (childWords && childWords.length > 0) {
    for (const cw of childWords) {
      const matches = findMatches(cw);
      if (matches.length > 0) {
        return generatePersonalizedColdStart(matches[0], cw, count);
      }
    }
  }

  // Fall through to generic cold start
  let bracket: string;
  if (ageMonths < 12) bracket = "6-12";
  else if (ageMonths < 18) bracket = "12-18";
  else if (ageMonths < 24) bracket = "18-24";
  else bracket = "24-36";

  const pool = STARTER_PHRASES[bracket] || STARTER_PHRASES["12-18"];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p) => ({
    ...p,
    id: `start-${++phraseCounter}`,
  }));
}

/** Generate personalized cold start phrases from a matched lexicon entry */
function generatePersonalizedColdStart(
  entry: LexiconEntry,
  childWord: string,
  count: number,
): Phrase[] {
  const babble = childWord.toLowerCase().trim();
  const babbleRepeated = `${babble}-${babble}-${babble}`;
  const capitalized = babbleRepeated.charAt(0).toUpperCase() + babbleRepeated.slice(1);

  const context = CATEGORY_CONTEXTS[entry.category] || "Anytime";

  const phrases: Phrase[] = [];
  const pool = [...entry.phrases].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, pool.length); i++) {
    phrases.push({
      id: `start-pers-${++phraseCounter}`,
      text: `${capitalized}! ${pool[i]}`,
      context,
      basedOnWord: entry.word,
      tip: `Building on "${childWord}" — your child is exploring sounds that connect to "${entry.word}".`,
    });
  }

  // If we need more phrases than the entry has, pad with generic ones
  if (phrases.length < count) {
    const bracket = ageMonthsToBracket(
      Math.max(entry.ageMonths - 3, 6),
    );
    const genericPool =
      STARTER_PHRASES[bracket] || STARTER_PHRASES["12-18"];
    const shuffled = [...genericPool].sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
      if (phrases.length >= count) break;
      if (!phrases.some((f) => f.text === p.text)) {
        phrases.push({ ...p, id: `start-pers-${++phraseCounter}` });
      }
    }
  }

  return phrases;
}

function ageMonthsToBracket(ageMonths: number): string {
  if (ageMonths < 12) return "6-12";
  if (ageMonths < 18) return "12-18";
  if (ageMonths < 24) return "18-24";
  return "24-36";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
