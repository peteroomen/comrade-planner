import { applyBar } from './bars';
import { crackdownCard, raidBlackStock } from './crackdown';
import { TREASURY, enterpriseAccount, householdAccount, transfer } from './ledger';
import { refreshManagers } from './managers';
import { delayShipments } from './shipments';
import type { Effect, GameState } from './types';

/** Interpret one card effect. Effects are data (see content/cards.ts); this is the only place they run. */
export function applyEffect(state: GameState, fx: Effect): void {
  switch (fx.kind) {
    case 'bars':
      for (const [bar, delta] of Object.entries(fx.delta) as [keyof GameState['bars'], number][]) {
        state.stats.cardDeltas[bar] = (state.stats.cardDeltas[bar] ?? 0) + delta;
        applyBar(state, bar, delta);
      }
      break;
    case 'tractors':
      state.enterprises[fx.enterprise].tractors += fx.n;
      break;
    case 'bonus': {
      const workers = state.households.filter((h) => h.employer === fx.enterprise);
      if (workers.length === 0) break;
      const each = Math.floor(fx.amount / workers.length);
      for (const h of workers) transfer(state, TREASURY, householdAccount(h.id), each);
      break;
    }
    case 'reserveGrain': {
      const qty = Math.min(fx.qty, state.reserveGrain);
      state.reserveGrain -= qty;
      state.towns[fx.town].stock.grain += qty;
      break;
    }
    case 'steelShare':
      state.plan.steelKrasnyShare = Math.min(
        1,
        Math.max(0, state.plan.steelKrasnyShare + fx.delta),
      );
      break;
    case 'modifier':
      state.modifiers.push({ name: fx.name, value: fx.value, quartersLeft: fx.quarters });
      refreshManagers(state);
      break;
    case 'delayShipments':
      delayShipments(state, fx.ticks);
      break;
    case 'extraInspectors':
      state.centre.extraInspectors += fx.n;
      break;
    case 'crackdown':
      crackdownCard(state);
      break;
    case 'blackRaid':
      raidBlackStock(state, fx.cut);
      break;
    case 'repair':
      transfer(state, TREASURY, enterpriseAccount(fx.enterprise), fx.cost);
      state.enterprises[fx.enterprise].jam = 0;
      break;
    case 'jam':
      state.enterprises[fx.enterprise].jam += fx.ticks;
      break;
  }
}
