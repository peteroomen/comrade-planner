import { CARD_BY_ID } from '@/content/cards';
import type { CardChoice } from '@/content/cards';
import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import { ENTERPRISES } from '@/content/enterprises';
import type { EnterpriseId, LocationRef, TownId } from '@/content/ids';
import {
  chooseCard,
  decideReport,
  defaultPlan,
  endQuarter,
  fileOwnReport,
  newGame,
  setPlan,
  tick,
} from '@/sim/facade';
import {
  activeCard,
  audits,
  bars,
  currentPlan,
  deskReports,
  observerFindings,
  status,
  treasury,
  visibleMap,
} from '@/sim/selectors';
import type { Hint, PublicReport } from '@/sim/selectors';
import * as B from '@/sim/balance';
import type { Decision, GameState, Plan, Side } from '@/sim/types';

// Player archetypes for the balance harness. Drivers act only through the facade and the public
// selectors, so anything "careful" achieves is something a real player could do. They never look
// at report truth, manager traits, audit `corrupt`, card `veracity` or other hidden fields.

/** Drives the facade the way a UI would. Not part of the shipped game. */
export interface Driver {
  plan: (state: GameState, quarter: number) => Plan;
  side: (state: GameState, cardId: string) => Side;
  decide: (state: GameState, reportId: number) => Decision;
  inflate: (state: GameState) => number;
}

/** Drivers may keep memory between quarters, so the harness builds a fresh one for each seed. */
export type DriverFactory = (seed: number) => Driver;

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

// ---------------------------------------------------------------- helpers

/** Tiny seeded generator (mulberry32) owned by the driver, so it never touches the game's RNG. */
export function makePrng(seed: number): () => number {
  let a = (Math.floor(seed) ^ 0x5bd1e995) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, lo: number, hi: number): number => lo + (hi - lo) * r();

const ALL_SPOTS: LocationRef[] = [
  ...ENTERPRISE_IDS.map((id) => ({ type: 'enterprise', id }) as LocationRef),
  ...TOWN_IDS.map((id) => ({ type: 'town', id }) as LocationRef),
];

/**
 * How much a card side "grants" what was asked, judged from static card content alone: any
 * world effect (tractors, bonus, reserve grain, steel share) counts most, then the Apparatus
 * and People gains it promises. Refusals only ever carry bar penalties, so they score lower.
 * Tips are believed: the side that drops a pin (acts on the tip) is the granting side.
 */
function grantScore(choice: CardChoice): number {
  let score = choice.pin ? 100 : 0;
  for (const e of choice.effects) {
    if (e.kind !== 'bars') score += 100;
    else score += (e.delta.apparatus ?? 0) + (e.delta.people ?? 0);
  }
  return score;
}

function grantSide(cardId: string): Side {
  const card = CARD_BY_ID[cardId];
  if (!card) return 'right';
  return grantScore(card.left) > grantScore(card.right) ? 'left' : 'right';
}

// ---------------------------------------------------------------- archetypes

/** A fixed, unremarkable plan: defaults, always approve, never inflate, alternate card sides. */
export const naiveDriver: Driver = {
  plan: () => defaultPlan(),
  side: (state) => (state.cardLog.length % 2 === 0 ? 'right' : 'left'),
  decide: () => 'approve',
  inflate: () => 1,
};

/** Naive plan and stamps, but always grants what a petition asks (see `grantScore`). */
export const trustingDriver: Driver = {
  ...naiveDriver,
  side: (_state, cardId) => grantSide(cardId),
};

/** Naive, except the upward report is inflated by a steady 1.35. */
export const inflaterDriver: Driver = {
  ...naiveDriver,
  inflate: () => 1.35,
};

/** Random but always-valid player inputs, driven by its own seeded generator. */
export function randomDriver(seed: number): Driver {
  const r = makePrng(seed);
  const decisions: Decision[] = ['approve', 'approve', 'reject', 'audit'];
  const pickOne = <T>(items: readonly T[]): T => items[Math.floor(r() * items.length)] as T;
  return {
    plan: () => {
      const p = defaultPlan();
      for (const e of ENTERPRISE_IDS) {
        p.quota[e] = Math.round(p.quota[e] * between(r, 0.5, 1.5));
        p.wage[e] = between(r, 5, 22);
      }
      p.prices.grain = between(r, 1, 5);
      p.prices.consumer = between(r, 4, 20);
      p.steelKrasnyShare = r();
      for (const t of TOWN_IDS) p.grainAllocation[t] = r() + 0.05;
      p.observers = [pickOne(ALL_SPOTS), pickOne(ALL_SPOTS)];
      return p;
    },
    side: () => (r() < 0.5 ? 'left' : 'right'),
    decide: () => pickOne(decisions),
    inflate: () => between(r, B.OWN_INFLATE_MIN, B.OWN_INFLATE_MAX),
  };
}

/**
 * Reads the evidence attached to one report. Returns how far the claim outruns what an observer
 * saw (or what the railway carried), as a share of the claim, 0 when nothing disagrees.
 */
function disagreement(r: PublicReport): number {
  const claim = Math.max(1, r.reportedOutput);
  const slip = r.documents.observerSlip;
  if (slip) return Math.max(0, (claim - slip.output) / claim);
  // Rail is only part of the picture (some output is held or sent by road), so it counts for less.
  const m = r.documents.manifest;
  if (m && r.documents.previousReport) {
    const shipped = Object.values(m.departedTotal).reduce((a, b) => a + b, 0);
    if (shipped > 0) return Math.max(0, (claim - shipped * 1.5) / claim) * 0.5;
  }
  return 0;
}

// How far the careful driver assumes a small / large hint moves a bar, in bar points.
const HINT_SMALL_PTS = 2.5;
const HINT_LARGE_PTS = 7;
// Discounts for hints that may not happen or arrive later, and the extra fear of the bar edges.
const HINT_UNCERTAIN_WEIGHT = 0.5;
const HINT_LATER_WEIGHT = 0.7;
const EDGE_FEAR = 40;

/**
 * Cost of a choice from its public hints alone: how much it pushes the four bars away from the
 * middle, counting the edges (where the run ends) as worse than the middle. Lower is better.
 */
function hintCost(hints: Hint[], b: Record<string, number>): number {
  let cost = 0;
  for (const h of hints) {
    const pts = (h.size === 'large' ? HINT_LARGE_PTS : HINT_SMALL_PTS) * (h.dir === 'up' ? 1 : -1);
    const w =
      (h.uncertain ? HINT_UNCERTAIN_WEIGHT : 1) * (h.when === 'later' ? HINT_LATER_WEIGHT : 1);
    const from = b[h.bar] ?? 50;
    const to = from + pts;
    const dist = (v: number): number =>
      (v - 50) ** 2 + (EDGE_FEAR * Math.max(0, Math.abs(v - 50) - 30) ** 2) / 10;
    cost += w * (dist(to) - dist(from));
  }
  return cost;
}

// Weekly wage bill the careful driver allows itself, as a multiple of the Centre grant per week.
const WAGE_BILL_LIMIT = 1.7;
// Apparatus below which the careful driver stops launching audits.
const AUDIT_MIN_APPARATUS = 38;
// Apparatus above which the careful driver spends every free inspector.
const AUDIT_FREELY_APPARATUS = 62;
// People below which the careful driver lifts wages, while the bill stays under this share of its limit.
const PEOPLE_WAGE_TRIGGER = 46;
const WAGE_LIFT = 1.1;
// Shadow level at which the careful driver orders a crackdown.
const CRACKDOWN_SHADOW_TRIGGER = 62;

/** Trusts the paperwork least where evidence and audits have already caught a lie. */
export function carefulDriver(): Driver {
  const suspicion = Object.fromEntries(ENTERPRISE_IDS.map((e) => [e, 0])) as Record<
    EnterpriseId,
    number
  >;
  const seenQuarter: Record<string, number> = {};
  // The desk documents do not change while stamping, so read them once per quarter.
  let desk: { quarter: number; reports: PublicReport[]; handled: Set<number> } | null = null;
  let lastCrackdown: TownId | null = null;
  // Evidence past which a claim counts as padded (the public tolerance, doubled for noise).
  const FLAG = B.PADDED_TOLERANCE * 2;

  /** Fold this desk's evidence into the running suspicion once per quarter. */
  const learn = (state: GameState): void => {
    if (seenQuarter[state.quarter]) return;
    seenQuarter[state.quarter] = 1;
    for (const r of desk?.reports ?? []) {
      suspicion[r.enterprise] = suspicion[r.enterprise] * 0.6 + disagreement(r);
    }
    for (const a of audits(state)) {
      if (a.status === 'resolved' && a.finding?.padded && a.quarter === state.quarter - 1) {
        suspicion[a.enterprise] += 0.5;
      }
    }
  };

  const caughtBefore = (state: GameState, e: EnterpriseId): boolean =>
    audits(state).some(
      (a) =>
        a.enterprise === e &&
        a.status === 'resolved' &&
        a.finding?.padded &&
        a.quarter < state.quarter,
    );

  const stamp = (state: GameState, reportId: number): Decision => {
    if (desk?.quarter !== state.quarter) {
      desk = { quarter: state.quarter, reports: deskReports(state), handled: new Set() };
    }
    learn(state);
    const pending = desk.reports;
    const r = pending.find((x) => x.id === reportId);
    if (!r) return 'approve';
    const slip = r.documents.observerSlip;
    const proven = slip !== null && disagreement(r) > FLAG;
    // An earlier audit already caught this enterprise padding: refuse unless an observer clears it.
    if (caughtBefore(state, r.enterprise) && !(slip && !proven)) return 'reject';
    if (proven) return 'reject';
    // Spend inspectors on the reports we trust least, most suspect first.
    const score = (x: PublicReport): number => suspicion[x.enterprise] + disagreement(x);
    // Reports already stamped (in `handled`) are out of the running.
    const open = pending.filter((x) => !desk?.handled.has(x.id) || x.id === reportId);
    const rank = open.sort((a, b) => score(b) - score(a)).findIndex((x) => x.id === reportId);
    const left = status(state).inspectorsLeft;
    // Audits cost the Apparatus its goodwill, so a careful planner rations them when it runs low.
    const affordable = bars(state).apparatus >= AUDIT_MIN_APPARATUS;
    // With Apparatus running high an audit's goodwill cost is welcome, so inspectors are used freely.
    const flush = bars(state).apparatus >= AUDIT_FREELY_APPARATUS;
    return affordable && rank < left && (flush || score(r) > FLAG) ? 'audit' : 'approve';
  };

  return {
    plan: (state) => {
      const p = defaultPlan();
      // Observers where suspicion is highest; with no history, the grain farm and steel-user.
      const ranked = [...ENTERPRISE_IDS].sort((a, b) => suspicion[b] - suspicion[a]);
      const chosen = suspicion[ranked[0] as EnterpriseId] > 0 ? ranked : ['kolos', 'krasny'];
      p.observers = chosen
        .slice(0, B.OBSERVERS_MAX)
        .map((id) => ({ type: 'enterprise', id }) as LocationRef);
      // Grain to the towns with queues, and to where observers found unmet demand last quarter.
      const queues = Object.fromEntries(visibleMap(state).towns.map((t) => [t.id, t.queue]));
      const unmet = observerFindings(state).filter(
        (o) => o.quarter === state.quarter - 1 && o.target.type === 'town',
      );
      for (const t of TOWN_IDS) {
        const found = unmet.find((o) => o.target.id === t)?.unmetGrain ?? 0;
        p.grainAllocation[t] *= 1 + 0.4 * (queues[t] ?? 0) + (found > 0 ? 0.3 : 0);
      }
      // Wage restraint: keep the weekly bill within what the Centre grant can fund (public figures).
      const t = treasury(state);
      const committed = currentPlan(state).wage;
      const limit = t.centreGrantPerWeek * WAGE_BILL_LIMIT;
      const scale = t.wageBillPerWeek > limit ? limit / t.wageBillPerWeek : 1;
      const lift =
        bars(state).people < PEOPLE_WAGE_TRIGGER && t.wageBillPerWeek * WAGE_LIFT < limit
          ? WAGE_LIFT
          : 1;
      for (const e of ENTERPRISE_IDS) p.wage[e] = committed[e] * scale * lift;
      // When People runs low, steel favours the consumer-goods works and the shops charge a little less.
      if (bars(state).people < PEOPLE_WAGE_TRIGGER) {
        p.steelKrasnyShare = 0.4;
        p.prices.consumer *= 0.9;
      }
      // One crackdown when Shadow runs high, on the town showing the most signs: queues (people
      // turning to the black market) and enterprises we distrust. Never two quarters running.
      const crackedLast = lastCrackdown;
      lastCrackdown = null;
      const b = bars(state);
      if (b.shadow > CRACKDOWN_SHADOW_TRIGGER && b.people > 35 && crackedLast === null) {
        const score = (town: TownId): number => {
          const q = visibleMap(state).towns.find((x) => x.id === town)?.queue ?? 0;
          const doubt = ENTERPRISE_IDS.filter((e) => ENTERPRISES[e].town === town).reduce(
            (sum, e) => sum + suspicion[e],
            0,
          );
          return q + doubt;
        };
        const target = [...TOWN_IDS].sort((a, c) => score(c) - score(a))[0] ?? null;
        p.crackdown = target;
        lastCrackdown = target;
      }
      return p;
    },
    // Tips are pinned (the informant may be wrong, which observers and audits will show). Every
    // other card goes the way its public hints push the bars toward the middle.
    side: (state, cardId) => {
      const card = activeCard(state);
      if (!card || card.cardId !== cardId) return grantSide(cardId);
      if (card.type === 'tip') return grantSide(cardId);
      const now = bars(state);
      return hintCost(card.left.hints, now) <= hintCost(card.right.hints, now) ? 'left' : 'right';
    },
    decide: (state, reportId) => {
      const decision = stamp(state, reportId);
      desk?.handled.add(reportId);
      return decision;
    },
    inflate: () => 1,
  };
}
/** Named archetypes, in table order. */
export const ARCHETYPES: { name: string; make: DriverFactory }[] = [
  { name: 'random', make: (seed) => randomDriver(seed) },
  { name: 'naive', make: () => naiveDriver },
  { name: 'trusting', make: () => trustingDriver },
  { name: 'careful', make: () => carefulDriver() },
  { name: 'inflater', make: () => inflaterDriver },
];
