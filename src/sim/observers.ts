import * as B from './balance';
import { cloneStock, emptyStock } from './stock';
import type { GameState, ObserverLive } from './types';

/** Place the planned observers. Called when the quarter begins. */
export function startObservers(state: GameState): void {
  state.observersLive = state.plan.observers.map((target): ObserverLive => ({
    target,
    output: 0,
    shippedIn: emptyStock(),
    shippedOut: emptyStock(),
    unmetGrain: 0,
  }));
}

/** Record this tick's true figures at each observed location. Runs after shipping and shopping. */
export function recordObservers(state: GameState): void {
  for (const o of state.observersLive) {
    if (o.target.type === 'enterprise') {
      o.output += state.enterprises[o.target.id].lastProduced;
    } else {
      o.unmetGrain += state.towns[o.target.id].lastUnmet;
    }
  }
}

/** Turn live observers into permanent findings at quarter end. */
export function finalizeObservers(state: GameState): void {
  for (const o of state.observersLive) {
    const stock =
      o.target.type === 'enterprise'
        ? state.enterprises[o.target.id].stock
        : state.towns[o.target.id].stock;
    state.observations.push({
      quarter: state.quarter,
      target: o.target,
      output: o.output,
      stock: cloneStock(stock),
      shippedIn: o.shippedIn,
      shippedOut: o.shippedOut,
      unmetGrain: o.unmetGrain,
    });
  }
  state.observersLive = [];
  if (state.observations.length > B.OBSERVER_KEEP) {
    state.observations = state.observations.slice(-B.OBSERVER_KEEP);
  }
}
