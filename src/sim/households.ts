import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import type { EnterpriseId, TownId } from '@/content/ids';
import { TOWNS } from '@/content/towns';
import * as B from './balance';
import {
  BLACK,
  TREASURY,
  balance,
  enterpriseAccount,
  householdAccount,
  shopAccount,
  transfer,
} from './ledger';
import { blackReach } from './crackdown';
import { peopleFactor, wageFactor } from './production';
import { range } from './rng';
import type { GameState, Household } from './types';

export function workersOf(state: GameState, e: EnterpriseId): Household[] {
  return state.households.filter((h) => h.employer === e);
}

/** Effective labour at an enterprise: skills, scaled by People and wage satisfaction. */
export function labourOf(state: GameState, e: EnterpriseId): number {
  let skill = 0;
  for (const h of state.households) if (h.employer === e) skill += h.skill;
  return skill * peopleFactor(state.bars.people) * wageFactor(state.plan.wage[e]);
}

/** What the Centre pays into the treasury each week, given the Centre bar. */
export function centreGrant(state: Pick<GameState, 'bars'>): number {
  return (
    B.CENTRE_FUNDING_BASE *
    (1 + (B.CENTRE_FUNDING_GAIN * (state.bars.centre - B.BAR_START)) / B.BAR_START)
  );
}

/** The week's wage bill at the planned wages. */
export function wageBill(state: GameState): number {
  let sum = 0;
  for (const e of ENTERPRISE_IDS) {
    sum += Math.round(state.plan.wage[e]) * workersOf(state, e).length;
  }
  return sum;
}

/** Centre grant, treasury top-ups and wage payments. Only ledger transfers move money. */
export function payWages(state: GameState): void {
  state.stats.centreGrant += transfer(state, 'centre', TREASURY, centreGrant(state));
  for (const e of ENTERPRISE_IDS) {
    const workers = workersOf(state, e);
    const wage = state.plan.wage[e];
    const due = Math.round(wage) * workers.length;
    const acct = enterpriseAccount(e);
    const short = due - balance(state, acct);
    if (short > 0) state.stats.treasuryTopUp += transfer(state, TREASURY, acct, short);
    state.stats.wageDue += due;
    for (const h of workers) {
      state.stats.wagePaid += transfer(state, acct, householdAccount(h.id), Math.round(wage));
    }
  }
}

function blackPrice(state: GameState, stateShopPrice: number, glut = 0): number {
  const scarcity = 1 + B.BLACK_PRICE_SHADOW_GAIN * (1 - state.bars.shadow / 100);
  return stateShopPrice * B.BLACK_PRICE_MULT * scarcity * (1 + glut);
}

/** Buy up to `want` units at `price`, limited by stock and cash. Returns units bought. */
function buy(
  state: GameState,
  payer: string,
  payee: string,
  price: number,
  want: number,
  available: number,
  cashLimit: number,
): number {
  const q = Math.min(want, available, cashLimit / price);
  if (!(q > 1e-9)) return 0;
  const paid = transfer(state, payer, payee, q * price);
  return Math.min(q, paid / price);
}

/** Every household buys grain, then consumer goods; shortfalls go to the black market. */
export function shop(state: GameState): void {
  const { plan, stats } = state;
  const gPrice = plan.prices.grain;
  const cPrice = plan.prices.consumer;
  // Money piling up in households (above what the shops can absorb) pushes black prices up.
  const cashPerHh =
    state.households.reduce((sum, h) => sum + balance(state, householdAccount(h.id)), 0) /
    Math.max(1, state.households.length);
  const glut = Math.min(
    B.BLACK_CASH_MAX,
    B.BLACK_CASH_GAIN * Math.max(0, cashPerHh / B.CASH_NORMAL - 1),
  );
  const bgPrice = blackPrice(state, gPrice);
  const bcPrice = blackPrice(state, cPrice, glut);
  const shopUnmet: Record<TownId, number> = { dalniy: 0, kovrino: 0, oblastgrad: 0 };
  const demand: Record<TownId, number> = { dalniy: 0, kovrino: 0, oblastgrad: 0 };

  for (const h of state.households) {
    const town = state.towns[h.town];
    const acct = householdAccount(h.id);

    // Grain: state shop first, black market for whatever the shop could not supply.
    const need = B.GRAIN_NEED;
    demand[h.town] += need;
    const gShop = buy(
      state,
      acct,
      shopAccount(h.town),
      gPrice,
      need,
      town.stock.grain,
      balance(state, acct),
    );
    town.stock.grain -= gShop;
    let hungry = need - gShop;
    if (hungry > 1e-9) {
      shopUnmet[h.town] += hungry;
      const gBlack = buy(
        state,
        acct,
        BLACK,
        bgPrice,
        hungry * blackReach(state, h.town),
        state.black.stock.grain,
        balance(state, acct),
      );
      state.black.stock.grain -= gBlack;
      stats.blackTrade += gBlack;
      hungry -= gBlack;
    }
    stats.grainDemand += need;
    stats.grainUnmet += Math.max(0, hungry);

    // Consumer goods: an optional want scaled by the household's hidden preference.
    const want = B.CONSUMER_WANT * h.prefConsumer;
    const cash = Math.max(0, balance(state, acct) - B.HOUSEHOLD_KEEP);
    const cShop = buy(state, acct, shopAccount(h.town), cPrice, want, town.stock.consumer, cash);
    town.stock.consumer -= cShop;
    // Only shortfalls the shop caused count: what the household could afford but the shelves lacked.
    const affordable = Math.min(want, cash / cPrice);
    stats.consumerWanted += affordable;
    stats.consumerShopUnmet += Math.max(0, affordable - cShop);
    let bought = cShop;
    if (want - cShop > 1e-9) {
      const cash2 = Math.max(0, balance(state, acct) - B.HOUSEHOLD_KEEP);
      const cBlack = buy(
        state,
        acct,
        BLACK,
        bcPrice,
        (want - cShop) * blackReach(state, h.town),
        state.black.stock.consumer,
        cash2,
      );
      state.black.stock.consumer -= cBlack;
      stats.consumerBlack += cBlack;
      stats.blackTrade += cBlack;
      bought += cBlack;
    }
    stats.consumerBought += bought;
  }

  for (const id of TOWN_IDS) {
    const town = state.towns[id];
    town.lastDemand = demand[id];
    town.lastUnmet = shopUnmet[id];
    stats.grainShopUnmet += shopUnmet[id];
    if (demand[id] > 0 && shopUnmet[id] / demand[id] > B.QUEUE_THRESHOLD) stats.queueTicks += 1;
    if (town.stock.grain >= B.FULL_SHOP_GRAIN_PER_HH * TOWNS[id].households)
      stats.fullShopTicks += 1;
    // Shops remit their takings to the treasury every tick.
    transfer(state, shopAccount(id), TREASURY, balance(state, shopAccount(id)));
  }
}

export function driftPreferences(state: GameState): void {
  for (const h of state.households) {
    const next = h.prefConsumer + range(state, -B.PREF_DRIFT, B.PREF_DRIFT);
    h.prefConsumer = Math.min(B.PREF_CEIL, Math.max(B.PREF_FLOOR, next));
  }
}
