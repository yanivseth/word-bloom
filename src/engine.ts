import { LEXICON, LEXICON_MAP, type LexiconEntry } from "./lexicon";
import type { Phrase, WordClassification } from "./types";
import { rngFromSeed, shuffle } from "./utils";

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

/** Each lexicon category's single most natural routine/context. */
const CATEGORY_TO_CONTEXT: Record<string, string> = {
  food: "mealtime",
  action: "playtime",
  animal: "playtime",
  body: "bathtime",
  people: "playtime",
  social: "playtime",
  toy: "playtime",
  descriptor: "playtime",
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

// ── Two-word combinations ────────────────────────────────────
// Once a child has a base of single words (~18mo+), the developmentally
// correct next step is two-word combinations (pivot grammar): agent+action,
// modifier+object, recurrence ("more X"). These build on words the child
// ALREADY says, so they anchor to real vocabulary.

interface ComboTemplate {
  build: (w: string, cap: string) => string;
  combo: string; // the two-word target, for the "+ word" badge
  categories: LexiconEntry["category"][];
}

const COMBO_TEMPLATES: ComboTemplate[] = [
  {
    build: (w) => `More ${w}? You want more ${w}! Here's more ${w}.`,
    combo: "more",
    categories: ["food", "toy", "social"],
  },
  {
    build: (w, cap) => `${cap} please! Can you say "${w} please"?`,
    combo: "please",
    categories: ["food", "toy"],
  },
  {
    build: (w) => `Big ${w}! Look at the big ${w}. So big!`,
    combo: "big",
    categories: ["animal", "toy", "body", "food"],
  },
  {
    build: (w, cap) => `${cap} gone! Where did the ${w} go? All gone!`,
    combo: "gone",
    categories: ["food", "toy", "animal"],
  },
  {
    build: (w) => `My ${w}! That's your ${w}. Your very own ${w}!`,
    combo: "my",
    categories: ["toy", "body", "people"],
  },
  {
    build: (w, cap) => `${cap} up! Pick the ${w} up. Up, up, up!`,
    combo: "up",
    categories: ["toy", "animal"],
  },
  {
    build: (w) => `Night-night, ${w}. The ${w} is sleeping. Shh!`,
    combo: "night-night",
    categories: ["toy", "animal", "people"],
  },
];

/**
 * Generate two-word-combination phrases from words the child already says.
 * Only fires for children ~18mo+ with a few real words logged.
 */
function generateComboPhrases(
  childWords: string[],
  ageMonths: number,
  rng: () => number,
  maxCount: number,
): Phrase[] {
  if (ageMonths < 18) return [];

  // Known words that are real lexicon nouns/objects (not sounds or verbs)
  const comboable = childWords
    .map((w) => LEXICON_MAP.get(w.toLowerCase().trim()))
    .filter((e): e is LexiconEntry =>
      Boolean(
        e &&
          ["food", "toy", "animal", "body", "people"].includes(e.category),
      ),
    );
  if (comboable.length < 2) return []; // needs a small word base first

  const phrases: Phrase[] = [];
  const entries = shuffle(comboable, rng);
  const templates = shuffle(COMBO_TEMPLATES, rng);

  for (const entry of entries) {
    if (phrases.length >= maxCount) break;
    const template = templates.find((t) => t.categories.includes(entry.category));
    if (!template) continue;
    const w = entry.word;
    const cap = w.charAt(0).toUpperCase() + w.slice(1);
    phrases.push({
      id: `combo-${++phraseCounter}`,
      text: template.build(w, cap),
      context: CATEGORY_CONTEXTS[entry.category] || "Anytime",
      basedOnWord: w,
      newWord: `${template.combo} + ${w}`,
      targetWord: template.combo,
      tip: `Two-word combos are the next step after single words. Model "${template.combo} ${w}" — no need to make your child repeat it.`,
    });
    // Don't reuse the same template twice in one batch
    templates.splice(templates.indexOf(template), 1);
    if (templates.length === 0) break;
  }
  return phrases;
}

// ── Main engine ──────────────────────────────────────────────

let phraseCounter = 0;

export interface GenerateOptions {
  count?: number;
  contextHint?: string;
  /**
   * Deterministic seed (e.g. `${childId}:${YYYY-MM-DD}:${edition}`). The same
   * seed always yields the same phrases — this is what makes "today's
   * phrases" a stable daily edition instead of a slot machine.
   */
  seed?: string;
  /**
   * True when contextHint came from an automatic signal (time of day) rather
   * than an explicit parent choice — a soft hint nudges ordering but doesn't
   * demote two-word combos below context matches.
   */
  contextIsSoft?: boolean;
}

export function generatePhrases(
  childWords: string[],
  ageMonths: number,
  countOrOptions: number | GenerateOptions = 3,
  legacyContextHint?: string,
): Phrase[] {
  const opts: GenerateOptions =
    typeof countOrOptions === "number"
      ? { count: countOrOptions, contextHint: legacyContextHint }
      : countOrOptions;
  const count = opts.count ?? 3;
  const contextHint = opts.contextHint;
  const rng = rngFromSeed(opts.seed);

  // ── Cold start: no words yet ────────────────────────────
  if (!childWords || childWords.length === 0) {
    return getColdStartPhrases(ageMonths, count, undefined, rng);
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

  // A "hard" context is one the parent explicitly picked (chip), vs. a "soft"
  // time-of-day nudge. Hard context should genuinely reshape what's shown;
  // soft should only gently reorder.
  const hardContext = Boolean(contextHint) && !opts.contextIsSoft;
  const requestedCtx = contextHint ? normalizeContextHint(contextHint) : null;

  // Context bonus: entries whose natural context matches the hint float up —
  // strongly for a hard pick, gently for a soft time-of-day nudge.
  const contextBonus = (entry: LexiconEntry): number => {
    if (!requestedCtx) return 0;
    if (naturalContext(entry) !== requestedCtx) return 0;
    return hardContext ? 2 : 0.5;
  };

  const knownSet = new Set(childWords.map((w) => w.toLowerCase().trim()));

  // ── Step 4: Two-word combinations ──────────────────────
  // The developmentally-right next step, so they lead (score 5) — except when
  // the parent asked for a specific context, where context-matching phrases
  // should win (combos drop below them, score 2.5).
  const comboScore = contextHint && !opts.contextIsSoft ? 2.5 : 5;
  for (const p of generateComboPhrases(childWords, ageMonths, rng, 2)) {
    results.push({ phrase: p, score: comboScore });
  }

  // ── Step 5: Proper noun phrases (score 3) ──────────────
  for (const name of properNouns) {
    const pnPhrases = generateProperNounPhrases(name, 1);
    for (const p of pnPhrases) {
      results.push({ phrase: p, score: 3 });
    }
  }

  // ── Step 6: Phrase candidates from lexicon matches ─────
  // Exact known words (child already says the word — reinforce + expand it)
  // score 4; phonetic neighbors of a known sound (scaffolding) score 3.
  for (const { childWord, entry } of allMatches) {
    if (usedEntries.has(entry.word)) continue;
    const isExact = knownSet.has(entry.word);
    const phrases = pickPhrasesForEntry(entry, childWord, contextHint, 3, rng, isExact);
    for (const p of phrases) {
      results.push({ phrase: p, score: (isExact ? 4 : 3) + contextBonus(entry) });
    }
    usedEntries.add(entry.word);
  }

  // From phonetic expansions (score 2)
  for (const entry of expansions) {
    if (usedEntries.has(entry.word)) continue;
    // Find which known word is closest phonetically
    const closestCV = findClosestKnownCV(entry.initialCV, allMatches);
    const basedOn = closestCV || entry.word;
    const phrases = pickPhrasesForEntry(entry, basedOn, contextHint, entry.phrases.length <= 1 ? 1 : 2, rng);
    for (const p of phrases) {
      results.push({ phrase: p, score: 2 + contextBonus(entry) });
    }
    usedEntries.add(entry.word);
  }

  // ── Step 6.5: dedicated context-fit words (hard context only) ──
  // When the parent explicitly picks a moment (e.g. "Meals"), make sure the set
  // is actually about that moment — introduce in-context words even if the
  // child's known words don't happen to include that category. Scored 5 so
  // genuine context phrases lead, but below reinforced known in-context words
  // (score 4 + 2 = 6).
  if (hardContext && requestedCtx) {
    let added = 0;
    for (const entry of LEXICON) {
      if (added >= count + 2) break;
      if (usedEntries.has(entry.word)) continue;
      if (naturalContext(entry) !== requestedCtx) continue;
      if (entry.ageMonths > ageMonths + 6) continue; // within developmental reach
      const known = knownSet.has(entry.word);
      const phrases = pickPhrasesForEntry(entry, entry.word, contextHint, 1, rng, known);
      for (const p of phrases) {
        results.push({ phrase: p, score: 5 });
      }
      usedEntries.add(entry.word);
      added++;
    }
  }

  // From age-appropriate new words (score 1)
  const tier = ageToTier(ageMonths);
  for (const entry of LEXICON) {
    if (results.length >= count * 4) break; // enough candidates
    if (usedEntries.has(entry.word)) continue;
    if (entry.phoneticTier <= tier + 1 && entry.ageMonths <= ageMonths + 3) {
      const phrases = pickPhrasesForEntry(entry, entry.word, contextHint, 1, rng);
      for (const p of phrases) {
        results.push({ phrase: p, score: 1 + contextBonus(entry) });
      }
      usedEntries.add(entry.word);
    }
  }

  // ── Step 7: Sort & select ──────────────────────────────
  // Group into score bands; shuffle within each band (seeded) for variety
  const bands: Map<number, ScoredPhrase[]> = new Map();
  for (const r of results) {
    const band = bands.get(r.score) || [];
    band.push(r);
    bands.set(r.score, band);
  }

  const final: Phrase[] = [];
  const usedBase = new Set<string>();
  const orderedBands = [...bands.entries()].sort((a, b) => b[0] - a[0]);

  const tryAdd = (p: Phrase, enforceVariety: boolean): void => {
    if (final.length >= count) return;
    if (final.some((f) => f.text === p.text)) return; // never duplicate text
    const base = (p.basedOnWord ?? "").toLowerCase().trim();
    // Variety: don't fill the set with several phrases about the same word
    // (e.g. three "milk" cards) unless we have to.
    if (enforceVariety && base && usedBase.has(base)) return;
    final.push(p);
    if (base) usedBase.add(base);
  };

  // Pass 1 (high → low score): at most one phrase per base word.
  for (const [, band] of orderedBands) {
    for (const s of shuffle(band, rng)) tryAdd(s.phrase, true);
    if (final.length >= count) break;
  }
  // Pass 2: if still short, allow repeated base words to fill the count.
  if (final.length < count) {
    for (const [, band] of orderedBands) {
      for (const s of shuffle(band, rng)) tryAdd(s.phrase, false);
      if (final.length >= count) break;
    }
  }

  // If we still don't have enough, fill from cold start
  if (final.length < count) {
    const cold = getColdStartPhrases(ageMonths, count - final.length, childWords, rng);
    for (const c of cold) {
      if (!final.some((f) => f.text === c.text)) {
        final.push(c);
      }
    }
  }

  return final.slice(0, count);
}

// ── Internal helpers ────────────────────────────────────────

/** Words in a phrase template that signal it fits a given context */
const CONTEXT_TEXT_KEYWORDS: Record<string, string[]> = {
  mealtime: ["eat", "yummy", "snack", "milk", "cup", "bite", "breakfast", "hungry", "food", "table"],
  bathtime: ["bath", "splash", "wash", "water", "wet", "tub", "bubble"],
  bedtime: ["sleep", "night", "nap", "bed", "shh", "blanket", "story"],
  playtime: ["play", "toy", "roll", "build", "block", "stack", "throw"],
  outside: ["outside", "walk", "park", "tree", "bird", "sky", "run"],
};

function templateMatchesContext(template: string, context: string): boolean {
  const keywords = CONTEXT_TEXT_KEYWORDS[context];
  if (!keywords) return false;
  const lower = template.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/**
 * Does this specific phrase genuinely belong to `ctx`? True when the entry's
 * category is naturally that context (food→mealtime) OR the template's words
 * mention it (e.g. "splash" → bathtime). This is what keeps us from stamping
 * "At mealtime" on "Dada's home!".
 */
function phraseFitsContext(
  entry: LexiconEntry,
  template: string,
  ctx: string,
): boolean {
  return (
    CATEGORY_TO_CONTEXT[entry.category] === ctx ||
    templateMatchesContext(template, ctx)
  );
}

function pickPhrasesForEntry(
  entry: LexiconEntry,
  basedOnWord: string,
  contextHint: string | undefined,
  maxCount: number,
  rng: () => number,
  /** True when the child already says entry.word (reinforce, don't call it new) */
  entryIsKnown = false,
): Phrase[] {
  const phrases: Phrase[] = [];
  const usedTexts = new Set<string>();

  // When a context is requested, put templates whose TEXT actually fits that
  // context first — so "bath time phrases" are about baths, not just labeled so.
  const requestedCtx = contextHint ? normalizeContextHint(contextHint) : null;
  const orderedTemplates = requestedCtx
    ? [...entry.phrases].sort(
        (a, b) =>
          Number(templateMatchesContext(b, requestedCtx)) -
          Number(templateMatchesContext(a, requestedCtx)),
      )
    : entry.phrases;

  for (const template of orderedTemplates) {
    if (phrases.length >= maxCount) break;
    if (usedTexts.has(template)) continue;
    usedTexts.add(template);

    // Only claim the requested context when the phrase GENUINELY fits it —
    // otherwise fall back to the entry's honest natural context. This is what
    // stops "Dada's home!" from being labeled "At mealtime".
    const fitsRequested = requestedCtx
      ? phraseFitsContext(entry, template, requestedCtx)
      : false;
    const effectiveCtx = fitsRequested ? requestedCtx! : naturalContext(entry);

    // Determine context label text
    const ctxText =
      fitsRequested && CONTEXT_SPECIFIC_PHRASES[requestedCtx!]
        ? pickRandom(CONTEXT_SPECIFIC_PHRASES[requestedCtx!], rng)
        : CATEGORY_CONTEXTS[entry.category] || "Anytime";

    // Three distinct cases — the old code conflated the last two:
    //  • scaffold: basedOnWord is a sound/approximation → introduce entry.word
    //  • reinforce: the child already says entry.word → use it in richer sentences
    //  • introduce: entry.word is a brand-new age-appropriate target
    const isScaffold = basedOnWord !== entry.word;
    let tip: string;
    let newWord: string | undefined;
    if (isScaffold) {
      tip = `Building on "${basedOnWord}" — model this phrase naturally during ${effectiveCtx}.`;
      newWord = entry.word;
    } else if (entryIsKnown) {
      tip = `Reinforcing "${entry.word}" — a word your child already says. Keep using it in new sentences during ${effectiveCtx}.`;
      newWord = undefined;
    } else {
      tip = `New word "${entry.word}" — say it slowly and clearly during ${effectiveCtx}.`;
      newWord = undefined;
    }

    phrases.push({
      id: `p-${++phraseCounter}`,
      text: template,
      context: ctxText,
      basedOnWord,
      newWord,
      targetWord: isScaffold ? entry.word : undefined,
      tip,
    });
  }
  return phrases;
}

/** The requested context from a hint, normalized to a canonical context key. */
function normalizeContextHint(contextHint: string): string {
  const raw = contextHint.toLowerCase().trim();
  return CONTEXT_KEYWORDS[raw] ?? raw;
}

/** An entry's natural context when no hint is given. */
function naturalContext(entry: LexiconEntry): string {
  return CATEGORY_TO_CONTEXT[entry.category] ?? "playtime";
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
  childWords: string[] | undefined,
  rng: () => number,
): Phrase[] {
  // If parent entered words, try to personalize the cold start
  if (childWords && childWords.length > 0) {
    for (const cw of childWords) {
      const matches = findMatches(cw);
      if (matches.length > 0) {
        return generatePersonalizedColdStart(matches[0], cw, count, rng);
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
  return shuffle(pool, rng).slice(0, count).map((p) => ({
    ...p,
    id: `start-${++phraseCounter}`,
  }));
}

/** Generate personalized cold start phrases from a matched lexicon entry */
function generatePersonalizedColdStart(
  entry: LexiconEntry,
  childWord: string,
  count: number,
  rng: () => number,
): Phrase[] {
  const babble = childWord.toLowerCase().trim();
  const babbleRepeated = `${babble}-${babble}-${babble}`;
  const capitalized = babbleRepeated.charAt(0).toUpperCase() + babbleRepeated.slice(1);

  const context = CATEGORY_CONTEXTS[entry.category] || "Anytime";

  const phrases: Phrase[] = [];
  const pool = shuffle(entry.phrases, rng);

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
    for (const p of shuffle(genericPool, rng)) {
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

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
