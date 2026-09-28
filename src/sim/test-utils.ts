import { CARD_BY_ID } from '@/content/cards';
import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import type { LocationRef } from '@/content/ids';
import { nextFloat, pick, range } from './rng';
import {
  chooseCard,
  decideReport,
  defaultPlan,
  endQuarter,
  fileOwnReport,
  newGame,
  setPlan,
  tick,
} from './facade';
import { deskReports } from './selectors';
import type { Decision, GameState, Plan, Side } from './types';

/** Drives the facade the way a UI would. Not part of the shipped game. */
export interface Driver {
  plan: (state: GameState, quarter: number) => Plan;
  side: (state: GameState, cardId: string) => Side;
  decide: (state: GameState, reportId: number) => Decision;
  inflate: (state: GameState) => number;
}

/** A fixed, unremarkable plan: defaults, always approve, never inflate, alternate card sides. */
export const naiveDriver: Driver = {
  plan: () => defaultPlan(),
  side: (state) => (state.cardLog.length % 2 === 0 ? 'right' : 'left'),
  decide: () => 'approve',
  inflate: () => 1,
};

export function playQuarter(start: GameState, d: Driver): GameState {
  let s = setPlan(start, d.plan(start, start.quarter));
  let guard = 0;
  while (s.phase === 'quarter' && guard++ < 200) {
    const card = s.activeCard;
    s = card ? chooseCard(s, card.cardId, d.side(s, card.cardId)) : tick(s);
  }
  if (s.phase !== 'desk') return s;
  for (const r of deskReports(s)) s = decideReport(s, r.id, d.decide(s, r.id));
  s = fileOwnReport(s, d.inflate(s));
  return endQuarter(s);
}

export function playQuarters(seed: number, quarters: number, d: Driver = naiveDriver): GameState[] {
  const history: GameState[] = [];
  let s = newGame(seed);
  for (let q = 0; q < quarters && s.phase !== 'ended'; q++) {
    s = playQuarter(s, d);
    history.push(s);
  }
  return history;
}

/** Random but always-valid player inputs, driven by its own seeded generator. */
export function randomDriver(seed: number): Driver {
  const r = { rng: seed >>> 0 };
  const decisions: Decision[] = ['approve', 'approve', 'reject', 'audit'];
  return {
    plan: () => {
      const p = defaultPlan();
      for (const e of ENTERPRISE_IDS) {
        p.quota[e] = Math.round(p.quota[e] * range(r, 0.5, 1.5));
        p.wage[e] = range(r, 5, 22);
      }
      p.prices.grain = range(r, 1, 5);
      p.prices.consumer = range(r, 4, 20);
      p.steelKrasnyShare = nextFloat(r);
      for (const t of TOWN_IDS) p.grainAllocation[t] = nextFloat(r) + 0.05;
      const spots: LocationRef[] = [
        ...ENTERPRISE_IDS.map((id) => ({ type: 'enterprise', id }) as LocationRef),
        ...TOWN_IDS.map((id) => ({ type: 'town', id }) as LocationRef),
      ];
      p.observers = [pick(r, spots), pick(r, spots)];
      return p;
    },
    side: (_s, cardId) => (CARD_BY_ID[cardId] && nextFloat(r) < 0.5 ? 'left' : 'right'),
    decide: () => pick(r, decisions),
    inflate: () => range(r, 1, 1.5),
  };
}
