import * as B from './balance';
import type { GameState, LocationRef, TipClaim } from './types';

/** Is this claim actually true of the world right now? Hidden truth; never exposed by selectors. */
export function claimTrue(state: GameState, target: LocationRef, claim: TipClaim): boolean {
  switch (claim) {
    case 'skimming':
      return target.type === 'enterprise' && state.managers[target.id].skim > B.SKIM_TIP_THRESHOLD;
    case 'shortage': {
      if (target.type !== 'town') return false;
      const t = state.towns[target.id];
      return t.lastDemand > 0 && t.lastUnmet / t.lastDemand > B.TIP_SHORTAGE_THRESHOLD;
    }
    case 'idle': {
      if (target.type !== 'enterprise') return false;
      const weeklyQuota = state.plan.quota[target.id] / B.TICKS_PER_QUARTER;
      return state.enterprises[target.id].lastProduced < weeklyQuota * B.TIP_IDLE_SHARE;
    }
    default:
      return false;
  }
}

const sameTarget = (a: LocationRef, b: LocationRef): boolean => a.type === b.type && a.id === b.id;

/**
 * Quarter end: a pin is confirmed or refuted only when an observer stood at its location this
 * quarter, or a resolved audit covered the enterprise. That is the only way a track record moves.
 */
export function resolveTips(state: GameState): void {
  for (const pin of state.pins) {
    if (pin.status !== 'open') continue;
    const observed = state.observations.some(
      (o) => o.quarter === state.quarter && sameTarget(o.target, pin.target),
    );
    const audited = state.audits.some(
      (a) =>
        a.status === 'resolved' &&
        a.quarterFiled === state.quarter - 1 &&
        pin.target.type === 'enterprise' &&
        pin.target.id === a.enterprise,
    );
    if (!observed && !audited) continue;
    const truth = claimTrue(state, pin.target, pin.claim);
    pin.status = truth ? 'confirmed' : 'refuted';
    const inf = state.informants[pin.informant];
    if (inf) {
      if (truth) inf.right += 1;
      else inf.wrong += 1;
    }
  }
  state.pins = state.pins.filter((p) => state.quarter - p.quarterPlaced < B.PIN_TTL_QUARTERS);
}
