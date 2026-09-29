import { GOODS } from '@/content/ids';
import type { TownId } from '@/content/ids';
import { TOWNS } from '@/content/towns';
import * as B from './balance';
import { applyBar } from './bars';
import { refreshManagers } from './managers';
import type { GameState } from './types';

// Crackdowns come two ways: the plan's town order (this file) and the province-wide card.
// Both destroy black stock through `raidBlackStock` and both cut skimming through `skimMult`.

/** Destroy a share of the black market's stock, all goods. */
export function raidBlackStock(state: GameState, cut: number): void {
  for (const g of GOODS) state.black.stock[g] *= 1 - cut;
}

/** The province-wide crackdown card: raid the stock and make every manager cautious for a quarter. */
export function crackdownCard(state: GameState): void {
  raidBlackStock(state, B.CRACKDOWN_BLACK_CUT);
  state.modifiers.push({ name: 'skimMult', value: B.CRACKDOWN_SKIM_MULT, quartersLeft: 1 });
  refreshManagers(state);
}

/** Share of their usual black market purchases households of `town` can still make this quarter. */
export function blackReach(state: GameState, town: TownId): number {
  return state.plan.crackdown === town ? 1 - B.CRACKDOWN_TOWN_CUT : 1;
}

/**
 * The order is given as the quarter begins: it costs People and Apparatus, and more People if
 * the previous quarter also had one. `previous` is the town ordered last quarter, if any.
 */
export function orderCrackdown(state: GameState, previous: TownId | null): void {
  const town = state.plan.crackdown;
  state.lastCrackdown = town;
  if (!town) return;
  applyBar(state, 'people', -B.CRACKDOWN_PEOPLE);
  applyBar(state, 'apparatus', -B.CRACKDOWN_APPARATUS);
  if (previous) applyBar(state, 'people', -B.CRACKDOWN_REPEAT_PEOPLE);
  state.notes.push(
    previous
      ? `Militia sent into ${TOWNS[town].name} again; the people are weary of raids.`
      : `Militia sent into ${TOWNS[town].name}.`,
  );
}

/** Quarter end: the shadow economy retreats after an order. */
export function settleCrackdown(state: GameState, lines: string[]): void {
  const town = state.plan.crackdown;
  if (!town) return;
  applyBar(state, 'shadow', -B.CRACKDOWN_SHADOW_DROP);
  lines.push(`The crackdown in ${TOWNS[town].name} hurt the black market there.`);
}
