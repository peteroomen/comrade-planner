import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import type { EnterpriseId, TownId } from '@/content/ids';
import { ENTERPRISES } from '@/content/enterprises';
import { TOWNS } from '@/content/towns';
import { CHARACTERS, CHARACTER_BY_ID } from '@/content/characters';
import * as B from './balance';
import { defaultPlan } from './plan';
import { nextFloat, range, seedToState } from './rng';
import { addStock, emptyStock } from './stock';
import {
  BLACK,
  CENTRE,
  TREASURY,
  createLedger,
  enterpriseAccount,
  householdAccount,
  shopAccount,
} from './ledger';
import { emptyStats } from './stats';
import type { GameState, Household, Informant, Manager } from './types';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export function newGame(seed: number): GameState {
  const rngHolder = { rng: seedToState(seed) };

  const households: Household[] = [];
  let id = 0;
  const seats = {} as Record<EnterpriseId, number>;
  for (const e of ENTERPRISE_IDS) seats[e] = 0;
  for (const town of TOWN_IDS) {
    // Fill this town's households from the enterprise workforce tables.
    for (const eid of ENTERPRISE_IDS) {
      const n = ENTERPRISES[eid].workforce[town] ?? 0;
      for (let i = 0; i < n; i++) {
        households.push({
          id: id++,
          town,
          employer: eid,
          skill: range(rngHolder, B.SKILL_MIN, B.SKILL_MAX),
          prefConsumer: range(rngHolder, B.PREF_START_MIN, B.PREF_START_MAX),
        });
        seats[eid]++;
      }
    }
  }

  const opening: Record<string, number> = {
    [TREASURY]: B.TREASURY_START,
    [CENTRE]: B.CENTRE_START,
    [BLACK]: B.BLACK_START,
  };
  for (const h of households) opening[householdAccount(h.id)] = B.HOUSEHOLD_START_MONEY;
  for (const e of ENTERPRISE_IDS) opening[enterpriseAccount(e)] = B.ENTERPRISE_START;
  for (const t of TOWN_IDS) opening[shopAccount(t)] = 0;

  const towns = {} as GameState['towns'];
  for (const t of TOWN_IDS) {
    const stock = emptyStock();
    addStock(stock, 'grain', TOWNS[t].households * 2);
    addStock(stock, 'consumer', TOWNS[t].households * 0.3);
    towns[t as TownId] = { id: t, stock, lastUnmet: 0, lastDemand: 0 };
  }

  const enterprises = {} as GameState['enterprises'];
  for (const e of ENTERPRISE_IDS) {
    const stock = emptyStock();
    if (e === 'krasny') addStock(stock, 'steel', 30);
    if (e === 'zarya') addStock(stock, 'steel', 24);
    enterprises[e] = {
      id: e,
      stock,
      tractors: ENTERPRISES[e].good === 'grain' ? B.TRACTORS_START : 0,
      warehouse: emptyStock(),
      lastProduced: 0,
      jam: 0,
    };
  }

  const managers = {} as Record<EnterpriseId, Manager>;
  const informants: Record<string, Informant> = {};
  for (const c of CHARACTERS) {
    if (c.role === 'manager' && c.enterprise) {
      managers[c.enterprise] = {
        characterId: c.id,
        enterprise: c.enterprise,
        honesty: clamp01((c.honesty ?? 0.5) + (nextFloat(rngHolder) - 0.5) * 0.1),
        greed: clamp01((c.greed ?? 0.5) + (nextFloat(rngHolder) - 0.5) * 0.1),
        skim: 0,
        chastened: 0,
      };
    }
    if (c.role === 'informant') {
      informants[c.id] = {
        characterId: c.id,
        reliability: clamp01((c.reliability ?? 0.5) + (nextFloat(rngHolder) - 0.5) * 0.1),
        right: 0,
        wrong: 0,
      };
    }
  }
  // Every manager must exist in content.
  for (const e of ENTERPRISE_IDS) {
    if (!managers[e] || !CHARACTER_BY_ID[ENTERPRISES[e].managerId]) {
      throw new Error(`Missing manager for ${e}`);
    }
  }

  const targets = {} as Record<EnterpriseId, number>;
  const reportedThisYear = {} as Record<EnterpriseId, number[]>;
  for (const e of ENTERPRISE_IDS) {
    targets[e] = ENTERPRISES[e].baseQuota;
    reportedThisYear[e] = [];
  }

  return {
    version: 1,
    seed,
    rng: rngHolder.rng,
    tick: 0,
    quarter: 1,
    week: 0,
    phase: 'plan',
    ended: null,
    bars: { people: B.BAR_START, apparatus: B.BAR_START, centre: B.BAR_START, shadow: B.BAR_START },
    quarterStartBars: {
      people: B.BAR_START,
      apparatus: B.BAR_START,
      centre: B.BAR_START,
      shadow: B.BAR_START,
    },
    ledger: createLedger(opening),
    towns,
    enterprises,
    households,
    managers,
    black: { stock: emptyStock() },
    reserveGrain: B.RESERVE_GRAIN_START,
    shipments: [],
    arrived: [],
    nextId: 1,
    plan: defaultPlan(),
    centre: { targets, reportedThisYear, extraInspectors: 0 },
    modifiers: [],
    reports: [],
    audits: [],
    inspectorsLeft: 0,
    observersLive: [],
    observations: [],
    cardSchedule: [],
    activeCard: null,
    cardHistory: [],
    cardLog: [],
    informants,
    pins: [],
    ownInflate: null,
    requestGrants: {},
    lastCrackdown: null,
    notes: [],
    stats: emptyStats(),
    reckoning: null,
  };
}
