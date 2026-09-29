import { ENTERPRISE_IDS } from '@/content/ids';
import type { EnterpriseId } from '@/content/ids';
import { ENTERPRISES } from '@/content/enterprises';
import * as B from './balance';
import { BLACK, TREASURY, balance, enterpriseAccount, transfer } from './ledger';
import { modifierValue } from './modifiers';
import type { GameState, Manager } from './types';

/** Skim multiplier for one enterprise from the plan's crackdown order (1 when its town is not targeted). */
export function crackdownSkimFactor(state: GameState, e: EnterpriseId): number {
  const town = state.plan.crackdown;
  return town && ENTERPRISES[e].town === town ? B.CRACKDOWN_SKIM_MULT : 1;
}

/** Share of output a manager diverts per tick. Zero for a fully honest or wholly ungreedy manager. */
export function skimRate(state: GameState, m: Manager): number {
  const base = m.greed * (1 - m.honesty) * B.SKIM_SCALE;
  const shadow = B.SKIM_SHADOW_GAIN * (state.bars.shadow / 100) + (1 - B.SKIM_SHADOW_GAIN / 2);
  const lowApparatus = Math.max(0, B.BAR_START - state.bars.apparatus) / B.BAR_START;
  const rate =
    base *
    shadow *
    (1 + B.SKIM_APPARATUS_GAIN * lowApparatus) *
    modifierValue(state, 'skimMult') *
    crackdownSkimFactor(state, m.enterprise);
  return rate < B.SKIM_HIDE_MIN ? 0 : Math.min(rate, 0.5);
}

/** Recompute each manager's hidden skim from traits and the current bars. Runs at quarter start. */
export function refreshManagers(state: GameState): void {
  for (const e of ENTERPRISE_IDS) {
    const m = state.managers[e];
    m.skim = skimRate(state, m);
  }
}

/**
 * Black market cash above its float is paid out: most to the enterprises whose managers
 * skim (weighted by how much they divert), a little to the treasury as bribes.
 */
export function settleBlackMarket(state: GameState): void {
  const extra = Math.max(0, balance(state, BLACK) - B.BLACK_START);
  if (extra < 1) return;
  const weights = ENTERPRISE_IDS.map(
    (e) => state.managers[e].skim * state.enterprises[e].lastProduced,
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pool = extra * B.BLACK_ENTERPRISE_SHARE;
  if (totalWeight > 0) {
    ENTERPRISE_IDS.forEach((e, i) => {
      transfer(state, BLACK, enterpriseAccount(e), (pool * (weights[i] as number)) / totalWeight);
    });
  }
  transfer(state, BLACK, TREASURY, extra * B.BLACK_LAUNDER);
}
