/**
 * Small shared utilities: deterministic seeded RNG (for the "daily edition"
 * phrase generation), date keys, and age math.
 */

/** FNV-1a string hash → 32-bit unsigned int */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — tiny, fast, good enough for shuffling phrases */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build an RNG from a string seed; falls back to Math.random when no seed */
export function rngFromSeed(seed?: string): () => number {
  if (!seed) return Math.random;
  return mulberry32(hashString(seed));
}

/** Fisher–Yates shuffle (returns a new array) using the provided RNG */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Local-timezone YYYY-MM-DD key for "today" — the daily edition boundary */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Age in whole months from an ISO birth date, accounting for day-of-month
 * (a child born on the 25th isn't a month older on the 1st).
 * Clamped to the 6–48 month range the engine supports.
 */
export function ageInMonths(birthDate: string, now: Date = new Date()): number {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 18;
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(6, Math.min(48, months));
}
