// Seeded mulberry32. The generator state is a single uint32 stored in GameState.rng,
// so the whole run stays plain data. Helpers mutate that field on the state they are given.

export interface HasRng {
  rng: number;
}

export function seedToState(seed: number): number {
  return (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
}

/** Uniform float in [0, 1). */
export function nextFloat(s: HasRng): number {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(s: HasRng, min: number, max: number): number {
  return min + (max - min) * nextFloat(s);
}

export function chance(s: HasRng, p: number): boolean {
  return nextFloat(s) < p;
}

export function int(s: HasRng, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(nextFloat(s) * (maxInclusive - minInclusive + 1));
}

export function pick<T>(s: HasRng, items: readonly T[]): T {
  const item = items[Math.floor(nextFloat(s) * items.length)];
  if (item === undefined) throw new Error('pick from empty list');
  return item;
}

export function shuffle<T>(s: HasRng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(nextFloat(s) * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}
