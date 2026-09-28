import type { AccountId, GameState, Ledger } from './types';

// Money moves only through transfer(). Balances are integers, so conservation is exact.

/** In Vite dev and Vitest builds every tick asserts conservation; production builds skip it. */
export const DEV_CHECKS: boolean =
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

export const TREASURY = 'treasury';
export const CENTRE = 'centre';
export const BLACK = 'black';
export const householdAccount = (id: number): AccountId => `hh:${id}`;
export const enterpriseAccount = (id: string): AccountId => `ent:${id}`;
export const shopAccount = (id: string): AccountId => `shop:${id}`;

export function createLedger(opening: Record<AccountId, number>): Ledger {
  const balances: Record<AccountId, number> = {};
  let total = 0;
  for (const [id, amount] of Object.entries(opening)) {
    const v = Math.max(0, Math.round(amount));
    balances[id] = v;
    total += v;
  }
  return { balances, total };
}

export function balance(state: Pick<GameState, 'ledger'>, account: AccountId): number {
  return state.ledger.balances[account] ?? 0;
}

/**
 * Move up to `amount` from one account to another. Returns what actually moved:
 * the amount is rounded to whole roubles and capped at the payer's balance, so no
 * account can go negative and no money is created or destroyed.
 */
export function transfer(
  state: Pick<GameState, 'ledger'>,
  from: AccountId,
  to: AccountId,
  amount: number,
): number {
  if (from === to) return 0;
  const want = Math.round(amount);
  if (!(want > 0)) return 0;
  const paid = Math.min(want, balance(state, from));
  if (paid <= 0) return 0;
  const b = state.ledger.balances;
  b[from] = balance(state, from) - paid;
  b[to] = balance(state, to) + paid;
  return paid;
}

export function totalMoney(state: Pick<GameState, 'ledger'>): number {
  let sum = 0;
  for (const v of Object.values(state.ledger.balances)) sum += v;
  return sum;
}

/** Throws if money was created or destroyed, or if any balance is negative or fractional. */
export function assertConserved(state: Pick<GameState, 'ledger' | 'tick'>): void {
  const sum = totalMoney(state);
  if (sum !== state.ledger.total) {
    throw new Error(`Money not conserved at tick ${state.tick}: ${sum} != ${state.ledger.total}`);
  }
  for (const [id, v] of Object.entries(state.ledger.balances)) {
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`Bad balance for ${id} at tick ${state.tick}: ${v}`);
    }
  }
}
