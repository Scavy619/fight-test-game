// Small seeded random generator (mulberry32) so an AI run is reproducible for a seed.

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Integer in [lo, hi] inclusive. */
  range(lo: number, hi: number): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (p) => next() < p,
    int: (n) => Math.floor(next() * n),
    range: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
  };
}
