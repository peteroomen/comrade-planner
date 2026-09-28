import { ENTERPRISE_IDS, GOODS } from '@/content/ids';
import { ENTERPRISES } from '@/content/enterprises';
import * as B from './balance';
import { TREASURY, balance, transfer } from './ledger';
import { driftPreferences, labourOf, payWages, shop } from './households';
import { settleBlackMarket } from './managers';
import { modifierValue } from './modifiers';
import { recordObservers } from './observers';
import { produce } from './production';
import { advanceShipments, dispatchGoods, installTractors } from './shipments';
import { addStock } from './stock';
import type { GameState } from './types';

/** Every enterprise produces for the week. Managers skim a share of output. */
function produceAll(state: GameState): void {
  for (const e of ENTERPRISE_IDS) {
    const ent = state.enterprises[e];
    const def = ENTERPRISES[e];
    const isFarm = def.good === 'grain';
    if (ent.jam > 0) {
      ent.jam -= 1;
      ent.lastProduced = 0;
      continue;
    }
    const labour = labourOf(state, e);
    const input = isFarm ? ent.tractors : ent.stock.steel;
    const res = produce(e, { labour, input });
    let gross = res.output;
    if (isFarm) gross *= modifierValue(state, 'grainMult');
    ent.stock.steel -= res.steelUsed;
    if (ent.stock.steel < 0) ent.stock.steel = 0;

    const skimmed = gross * state.managers[e].skim;
    const official = gross - skimmed;
    ent.lastProduced = gross;
    addStock(ent.stock, def.good, official);
    if (skimmed > 0) {
      if (def.good === 'grain' || def.good === 'consumer') {
        addStock(state.black.stock, def.good, skimmed);
      } else {
        addStock(ent.warehouse, def.good, skimmed);
      }
      state.stats.skimmed += skimmed;
    }
    state.stats.produced[e] += official;
    state.stats.inputs[e] += isFarm
      ? ent.tractors
      : e === 'stal'
        ? gross * B.ORE_PER_STEEL
        : res.steelUsed;
  }
}

/** Spoilage, wear and the unregistered distillery. */
function decayAndSmuggle(state: GameState): void {
  for (const town of Object.values(state.towns)) {
    town.stock.grain *= 1 - B.GRAIN_SPOIL_RATE;
  }
  for (const ent of Object.values(state.enterprises)) {
    ent.stock.grain *= 1 - B.GRAIN_SPOIL_RATE;
    ent.tractors *= 1 - B.TRACTOR_WEAR;
  }
  for (const g of GOODS) state.black.stock[g] *= 1 - B.BLACK_DECAY;
  const shadow = state.bars.shadow / B.BAR_START;
  addStock(state.black.stock, 'consumer', B.DISTILLERY_OUTPUT * shadow);
  addStock(state.black.stock, 'grain', B.BLACK_IMPORT_GRAIN * shadow);
}

/** Treasury surplus above the floor goes back to the Centre. */
function remitTax(state: GameState): void {
  const surplus = balance(state, TREASURY) - B.TREASURY_TAX_FLOOR;
  if (surplus > 0) transfer(state, TREASURY, 'centre', surplus);
}

/** One week of the world. Order matters: pay, produce, ship, deliver, shop, decay. */
export function runWeek(state: GameState): void {
  state.tick += 1;
  state.week += 1;
  payWages(state);
  produceAll(state);
  dispatchGoods(state);
  advanceShipments(state);
  installTractors(state);
  shop(state);
  settleBlackMarket(state);
  decayAndSmuggle(state);
  driftPreferences(state);
  recordObservers(state);
  remitTax(state);
  state.stats.ticks += 1;
}
