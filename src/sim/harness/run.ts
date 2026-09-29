import { newGame } from '@/sim/facade';
import type { GameState } from '@/sim/types';
import type { Driver, DriverFactory } from './drivers';
import { playQuarterInPlace } from './fast';

export interface SeedResult {
  seed: number;
  /** Quarters played: the quarter of death, or `maxQuarters` if the run survived (censored). */
  quarters: number;
  /** Cause such as "people-low", or 'survived'. */
  cause: string;
}

export interface Summary {
  n: number;
  median: number;
  p10: number;
  p90: number;
  /** Shares of all runs. */
  deadByQ3: number;
  deadBeforeQ6: number;
  survived: number;
  /** Death quarter -> number of runs, for deaths only. */
  histogram: Record<number, number>;
  /** Cause -> share of deaths. */
  causes: Record<string, number>;
}

/** Play one seed to its end or to `maxQuarters`. */
export function runSeed(driver: Driver, seed: number, maxQuarters: number): SeedResult {
  const s: GameState = newGame(seed);
  for (let q = 0; q < maxQuarters && !s.ended; q++) playQuarterInPlace(s, driver);
  return s.ended
    ? { seed, quarters: s.ended.quarter, cause: s.ended.cause }
    : { seed, quarters: maxQuarters, cause: 'survived' };
}

/**
 * Run one archetype over many seeds. A factory builds a fresh driver per seed (drivers can keep
 * memory); a plain Driver is reused. Seeds are 1..n unless given as a list.
 */
export function runArchetype(
  driver: Driver | DriverFactory,
  seeds: number | number[],
  maxQuarters = 40,
): SeedResult[] {
  const list = typeof seeds === 'number' ? Array.from({ length: seeds }, (_, i) => i + 1) : seeds;
  return list.map((seed) =>
    runSeed(typeof driver === 'function' ? driver(seed) : driver, seed, maxQuarters),
  );
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (i - lo);
}

export function summarise(results: SeedResult[]): Summary {
  const n = results.length;
  const sorted = results.map((r) => r.quarters).sort((a, b) => a - b);
  const dead = results.filter((r) => r.cause !== 'survived');
  const histogram: Record<number, number> = {};
  const causes: Record<string, number> = {};
  for (const r of dead) {
    histogram[r.quarters] = (histogram[r.quarters] ?? 0) + 1;
    causes[r.cause] = (causes[r.cause] ?? 0) + 1;
  }
  for (const c of Object.keys(causes)) causes[c] = (causes[c] as number) / Math.max(1, dead.length);
  return {
    n,
    median: quantile(sorted, 0.5),
    p10: quantile(sorted, 0.1),
    p90: quantile(sorted, 0.9),
    deadByQ3: dead.filter((r) => r.quarters <= 3).length / Math.max(1, n),
    deadBeforeQ6: dead.filter((r) => r.quarters < 6).length / Math.max(1, n),
    survived: (n - dead.length) / Math.max(1, n),
    histogram,
    causes,
  };
}
