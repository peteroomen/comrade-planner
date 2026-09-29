import { describe, expect, it } from 'vitest';
import { newGame } from '@/sim/facade';
import { carefulDriver, naiveDriver, playQuarter, randomDriver, trustingDriver } from './drivers';
import { playQuarterInPlace } from './fast';
import { runArchetype, summarise } from './run';

const SEEDS = 50;

describe('balance harness', () => {
  it('the in-place stepping path matches the facade exactly', () => {
    for (const make of [() => naiveDriver, () => randomDriver(3), () => carefulDriver()]) {
      let a = newGame(11);
      const b = newGame(11);
      const da = make();
      const db = make();
      for (let q = 0; q < 6; q++) {
        a = playQuarter(a, da);
        playQuarterInPlace(b, db);
        expect(b).toEqual(a);
      }
    }
  });

  it('is deterministic per seed', () => {
    const a = runArchetype((seed) => randomDriver(seed), 5, 10);
    const b = runArchetype((seed) => randomDriver(seed), 5, 10);
    expect(a).toEqual(b);
  });

  it('summarises censored runs', () => {
    const s = summarise([
      { seed: 1, quarters: 2, cause: 'people-low' },
      { seed: 2, quarters: 5, cause: 'centre-low' },
      { seed: 3, quarters: 40, cause: 'survived' },
      { seed: 4, quarters: 8, cause: 'people-low' },
    ]);
    expect(s.median).toBe(6.5);
    expect(s.deadByQ3).toBe(0.25);
    expect(s.deadBeforeQ6).toBe(0.5);
    expect(s.survived).toBe(0.25);
    expect(s.histogram).toEqual({ 2: 1, 5: 1, 8: 1 });
    expect(s.causes['people-low']).toBeCloseTo(2 / 3);
  });

  // Medians over the first 50 seeds sit at about 4, 6, 7.5 and 11.5 (300 seeds: 4, 6, 8, 13), so
  // these margins hold with room to spare. The runs are deterministic per seed.
  it('careful outlasts trusting outlasts naive outlasts random (median quarters)', () => {
    const median = (d: Parameters<typeof runArchetype>[0]) =>
      summarise(runArchetype(d, SEEDS)).median;
    const careful = median(() => carefulDriver());
    const trusting = median(trustingDriver);
    const naive = median(naiveDriver);
    const random = median((seed) => randomDriver(seed));
    expect(careful).toBeGreaterThanOrEqual(trusting + 2);
    expect(trusting).toBeGreaterThanOrEqual(naive + 1);
    expect(naive).toBeGreaterThanOrEqual(random + 1);
  }, 120_000);
});
