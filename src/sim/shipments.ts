import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import type { EnterpriseId, GoodId, NodeId, TownId } from '@/content/ids';
import { TOWNS } from '@/content/towns';
import * as B from './balance';
import { route, stationOf } from './graph';
import { hoardShare, effectiveSteelShare } from './requests';
import { addStock } from './stock';
import type { GameState, Shipment } from './types';

function stockAt(state: GameState, node: NodeId) {
  if (node === 'centre') return null;
  if (node.startsWith('ent:')) return state.enterprises[node.slice(4) as EnterpriseId].stock;
  return state.towns[node.slice(5) as TownId].stock;
}

function observerAt(state: GameState, node: NodeId) {
  return state.observersLive.find((o) =>
    node.startsWith('ent:')
      ? o.target.type === 'enterprise' && o.target.id === node.slice(4)
      : node !== 'centre' && o.target.type === 'town' && o.target.id === node.slice(5),
  );
}

/** Create a real shipment. The caller has already taken the goods from the origin. */
export function send(state: GameState, from: NodeId, to: NodeId, good: GoodId, qty: number): void {
  if (!(qty > 0)) return;
  const r = route(stationOf(from), stationOf(to));
  const shipment: Shipment = {
    id: state.nextId++,
    from,
    to,
    good,
    qty,
    departTick: state.tick,
    arriveTick: state.tick + r.ticks,
    path: r.path,
  };
  state.shipments.push(shipment);
  const obs = observerAt(state, from);
  if (obs) obs.shippedOut[good] += qty;
}

/** Deliver everything that has arrived and prune old history. */
export function advanceShipments(state: GameState): void {
  const still: Shipment[] = [];
  for (const s of state.shipments) {
    if (s.arriveTick > state.tick) {
      still.push(s);
      continue;
    }
    const stock = stockAt(state, s.to);
    if (stock) addStock(stock, s.good, s.qty);
    const obs = observerAt(state, s.to);
    if (obs) obs.shippedIn[s.good] += s.qty;
    state.arrived.push(s);
  }
  state.shipments = still;
  state.arrived = state.arrived.filter((s) => s.arriveTick > state.tick - B.ARRIVED_KEEP_TICKS);
}

/** Tractors inbound to a farm, counted so deliveries go where they are needed. */
function inboundTractors(state: GameState, e: EnterpriseId): number {
  return state.shipments
    .filter((s) => s.good === 'tractors' && s.to === `ent:${e}`)
    .reduce((sum, s) => sum + s.qty, 0);
}

function shipShares(
  state: GameState,
  from: NodeId,
  good: GoodId,
  total: number,
  shares: [NodeId, number][],
): void {
  const sum = shares.reduce((a, [, w]) => a + w, 0);
  if (sum <= 0) return;
  for (const [to, w] of shares) {
    const qty = (total * w) / sum;
    if (qty >= B.SHIP_MIN_QTY) send(state, from, to, good, qty);
  }
}

/**
 * Steel for the two factories, split by the effective share. A padded, granted request means part
 * of the factory's portion never leaves the yard: it lands in the manager's warehouse instead.
 */
function shipSteel(state: GameState, from: NodeId, total: number): void {
  const k = effectiveSteelShare(state);
  const parts: [NodeId, 'krasny' | 'zarya', number][] = [
    ['ent:krasny', 'krasny', total * k],
    ['ent:zarya', 'zarya', total * (1 - k)],
  ];
  for (const [to, user, qty] of parts) {
    const hoard = qty * hoardShare(state, user);
    if (hoard > 0) {
      addStock(state.enterprises[user].warehouse, 'steel', hoard);
      state.stats.requestHoard += hoard;
    }
    if (qty - hoard >= B.SHIP_MIN_QTY) send(state, from, to, 'steel', qty - hoard);
  }
}

/** Send finished goods on their way. Everything moves by rail, as real shipments. */
export function dispatchGoods(state: GameState): void {
  const { plan } = state;
  const townShares = (weights: Record<TownId, number>): [NodeId, number][] =>
    TOWN_IDS.map((t) => [`town:${t}` as NodeId, weights[t]]);

  // Farms: grain to towns by the planned allocation.
  for (const e of ENTERPRISE_IDS) {
    const ent = state.enterprises[e];
    if (e === 'lesnoy' || e === 'kolos') {
      const qty = ent.stock.grain;
      if (qty >= B.SHIP_MIN_QTY) {
        ent.stock.grain = 0;
        shipShares(state, `ent:${e}`, 'grain', qty, townShares(plan.grainAllocation));
      }
    }
  }

  // Stal: steel to Krasny and Zarya by the planned share.
  const stal = state.enterprises.stal;
  if (stal.stock.steel >= B.SHIP_MIN_QTY) {
    const qty = stal.stock.steel;
    stal.stock.steel = 0;
    shipSteel(state, 'ent:stal', qty);
  }

  // The Centre ships steel in; how much depends on the Centre bar.
  const centreSteel =
    B.CENTRE_STEEL_BASE *
    (1 + (B.CENTRE_STEEL_GAIN * (state.bars.centre - B.BAR_START)) / B.BAR_START);
  if (centreSteel > 0) shipSteel(state, 'centre', centreSteel);

  // Krasny: whole tractors to the farm with the fewest.
  const krasny = state.enterprises.krasny;
  const whole = Math.floor(krasny.stock.tractors);
  if (whole >= 1) {
    krasny.stock.tractors -= whole;
    const need = (e: EnterpriseId) => state.enterprises[e].tractors + inboundTractors(state, e);
    const target = need('lesnoy') <= need('kolos') ? 'lesnoy' : 'kolos';
    send(state, 'ent:krasny', `ent:${target}`, 'tractors', whole);
  }

  // Zarya: consumer goods to towns by population.
  const zarya = state.enterprises.zarya;
  if (zarya.stock.consumer >= B.SHIP_MIN_QTY) {
    const qty = zarya.stock.consumer;
    zarya.stock.consumer = 0;
    shipShares(
      state,
      'ent:zarya',
      'consumer',
      qty,
      TOWN_IDS.map((t) => [`town:${t}` as NodeId, TOWNS[t].households]),
    );
  }
}

/** Tractors delivered to a farm join its installed fleet. */
export function installTractors(state: GameState): void {
  for (const e of ['lesnoy', 'kolos'] as const) {
    const ent = state.enterprises[e];
    ent.tractors += ent.stock.tractors;
    ent.stock.tractors = 0;
  }
}

/** Delay in-transit shipments (rail delay event). */
export function delayShipments(state: GameState, ticks: number): void {
  for (const s of state.shipments) s.arriveTick += ticks;
}
