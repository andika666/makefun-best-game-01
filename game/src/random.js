// Seeded random numbers (mulberry32) so shot scenes are deterministic
// and a run can be replayed from its seed.

/** Make a random-number generator from an integer seed. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max] inclusive. */
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of an array. */
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

/** A weighted pick from [{ kind, weight }]. */
export function weightedPick(rng, entries) {
  let total = 0;
  for (const e of entries) total += e.weight;
  let roll = rng() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.kind;
  }
  return entries[entries.length - 1].kind;
}

/** Shuffle a copy of an array in place order (Fisher-Yates). */
export function shuffle(rng, array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}
