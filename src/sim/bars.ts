import { BAR_IDS } from '@/content/ids';
import * as B from './balance';
import type { BarId, GameState } from './types';

export const clampBar = (v: number): number => Math.min(B.BAR_MAX, Math.max(B.BAR_MIN, v));

/** Ends the run if any bar sits on an edge. Cause looks like "people-low" or "centre-high". */
export function checkEnd(state: GameState): void {
  if (state.ended) return;
  for (const bar of BAR_IDS) {
    const v = state.bars[bar];
    if (v <= B.BAR_MIN || v >= B.BAR_MAX) {
      state.ended = { cause: `${bar}-${v <= B.BAR_MIN ? 'low' : 'high'}`, quarter: state.quarter };
      state.phase = 'ended';
      state.activeCard = null;
      return;
    }
  }
}

/** Change one bar, clamp it, and end the run if it reaches an edge. */
export function applyBar(state: GameState, bar: BarId, delta: number): void {
  if (state.ended || !Number.isFinite(delta) || delta === 0) return;
  state.bars[bar] = clampBar(state.bars[bar] + delta);
  checkEnd(state);
}

/** Feedback of the bars into the sim: how many inspectors the Centre lends us. */
export function inspectorsAvailable(state: GameState): number {
  const base = B.INSPECTORS_BASE + Math.floor(state.bars.centre / B.INSPECTORS_PER_CENTRE);
  return Math.min(B.INSPECTORS_MAX, base) + state.centre.extraInspectors;
}

/** Chance that a newly assigned inspector has been captured by the Apparatus. */
export function inspectorCorruptChance(state: GameState): number {
  return B.INSPECTOR_CORRUPT_BASE + (B.INSPECTOR_CORRUPT_GAIN * state.bars.apparatus) / 100;
}

/** Slow pull of every bar back toward the middle, so nothing is permanently safe or doomed. */
export function driftBars(state: GameState): void {
  for (const bar of BAR_IDS) {
    state.bars[bar] += (B.BAR_START - state.bars[bar]) * B.BAR_DRIFT;
  }
}
