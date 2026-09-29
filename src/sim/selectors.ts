import { CARD_BY_ID } from '@/content/cards';
import { CHARACTER_BY_ID } from '@/content/characters';
import { ENTERPRISES } from '@/content/enterprises';
import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import type { EnterpriseId, GoodId, LocationRef, TownId } from '@/content/ids';
import { MAP_HEIGHT, MAP_WIDTH, RAIL, ROADS, STATIONS } from '@/content/map';
import { TOWNS } from '@/content/towns';
import * as B from './balance';
import { choiceHints } from './hints';
import type { Hint } from './hints';
import { centreGrant, wageBill } from './households';
import { TREASURY, balance } from './ledger';
import type { Bars, Decision, GameState, Phase, Plan, Stock } from './types';

// Visibility selectors: the only way the UI reads the sim. They return fresh plain objects and
// never include hidden manager traits, true production figures, informant reliability or pin
// veracity. Exact numbers appear only in reports (as filed), observer findings and resolved audits.

const round1 = (v: number): number => Math.round(v * 10) / 10;
const roundStock = (s: Stock): Stock => ({
  grain: round1(s.grain),
  steel: round1(s.steel),
  tractors: round1(s.tractors),
  consumer: round1(s.consumer),
});

export const locationName = (ref: LocationRef): string =>
  ref.type === 'enterprise' ? ENTERPRISES[ref.id].name : TOWNS[ref.id].name;

// ---------------------------------------------------------------- map

export interface MapTown {
  id: TownId;
  name: string;
  x: number;
  y: number;
  /** Queue at the state shop, 0 (none) to 3 (round the block). Ambient cue only. */
  queue: 0 | 1 | 2 | 3;
  observed: boolean;
}

export interface MapEnterprise {
  id: EnterpriseId;
  name: string;
  good: GoodId;
  x: number;
  y: number;
  /** Smoke over the star: 0 idle, 1 running light, 2 running full. Ambient cue only. */
  smoke: 0 | 1 | 2;
  observed: boolean;
}

export interface MapTrain {
  id: number;
  good: GoodId;
  /** Solid wagon when loaded, hollow when returning empty. */
  loaded: boolean;
  /** 0..1 along `path` at the current tick (ticks stay discrete; the UI interpolates). */
  progress: number;
  durationTicks: number;
  /** Station ids to follow. Return legs list the path already reversed. */
  path: string[];
  /** Wagon size 1..3, a coarse hint rather than a quantity. */
  size: 1 | 2 | 3;
}

export interface MapPin {
  id: number;
  label: string;
  target: LocationRef;
  x: number;
  y: number;
  status: 'open' | 'confirmed' | 'refuted';
}

export interface VisibleMap {
  width: number;
  height: number;
  phase: Phase;
  quarter: number;
  week: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  stations: { id: string; x: number; y: number; label?: string }[];
  rails: { from: string; to: string }[];
  roads: { from: string; to: string }[];
  towns: MapTown[];
  enterprises: MapEnterprise[];
  trains: MapTrain[];
  /** Black-market night trucks, 0 to 3. */
  nightTraffic: 0 | 1 | 2 | 3;
  /** Emigrant footprints heading for the map edge, 0 to 3, rising as People falls. */
  emigrants: 0 | 1 | 2 | 3;
  observers: LocationRef[];
  pins: MapPin[];
}

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
const stationXY = (id: string) => STATIONS.find((s) => s.id === id) ?? { x: 0, y: 0 };
const sameRef = (a: LocationRef, b: LocationRef): boolean => a.type === b.type && a.id === b.id;

function locationXY(ref: LocationRef): { x: number; y: number } {
  const station = ref.type === 'enterprise' ? ENTERPRISES[ref.id].station : TOWNS[ref.id].station;
  return stationXY(station);
}

function level(value: number, cuts: [number, number, number]): 0 | 1 | 2 | 3 {
  if (value < cuts[0]) return 0;
  if (value < cuts[1]) return 1;
  if (value < cuts[2]) return 2;
  return 3;
}

export function visibleMap(state: GameState): VisibleMap {
  const observing = state.phase === 'quarter' ? state.plan.observers : [];
  const trains: MapTrain[] = [];
  for (const s of state.shipments) {
    const duration = Math.max(1, s.arriveTick - s.departTick);
    trains.push({
      id: s.id,
      good: s.good,
      loaded: true,
      progress: Math.min(1, Math.max(0, (state.tick - s.departTick) / duration)),
      durationTicks: duration,
      path: s.path,
      size: s.qty < 5 ? 1 : s.qty < 25 ? 2 : 3,
    });
  }
  for (const s of state.arrived) {
    const duration = Math.max(1, s.arriveTick - s.departTick);
    const back = (state.tick - s.arriveTick) / duration;
    if (back >= 0 && back < 1) {
      trains.push({
        id: -s.id,
        good: s.good,
        loaded: false,
        progress: back,
        durationTicks: duration,
        path: [...s.path].reverse(),
        size: 1,
      });
    }
  }
  const nightTrade = state.stats.ticks > 0 ? state.stats.blackTrade / state.stats.ticks : 0;
  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    phase: state.phase,
    quarter: state.quarter,
    week: state.week,
    season: SEASONS[(state.quarter - 1) % 4] ?? 'spring',
    stations: STATIONS.map((s) => ({ ...s })),
    rails: RAIL.map((e) => ({ from: e.from, to: e.to })),
    roads: ROADS.map((r) => ({ ...r })),
    towns: TOWN_IDS.map((id) => {
      const t = state.towns[id];
      const share = t.lastDemand > 0 ? t.lastUnmet / t.lastDemand : 0;
      const { x, y } = stationXY(TOWNS[id].station);
      return {
        id,
        name: TOWNS[id].name,
        x,
        y,
        queue: level(share, [0.05, 0.15, 0.35]),
        observed: observing.some((o) => sameRef(o, { type: 'town', id })),
      };
    }),
    enterprises: ENTERPRISE_IDS.map((id) => {
      const weekly = state.plan.quota[id] / B.TICKS_PER_QUARTER;
      const made = state.enterprises[id].lastProduced;
      const { x, y } = stationXY(ENTERPRISES[id].station);
      return {
        id,
        name: ENTERPRISES[id].name,
        good: ENTERPRISES[id].good,
        x,
        y,
        smoke: made <= 0 ? 0 : made < weekly * 0.7 ? 1 : 2,
        observed: observing.some((o) => sameRef(o, { type: 'enterprise', id })),
      };
    }),
    trains,
    nightTraffic: level(nightTrade, [1, 5, 15]),
    emigrants:
      state.bars.people >= 40 ? 0 : state.bars.people >= 25 ? 1 : state.bars.people >= 12 ? 2 : 3,
    observers: observing.map((o) => ({ ...o }) as LocationRef),
    pins: state.pins.map((p) => ({
      id: p.id,
      label: p.label,
      target: p.target,
      ...locationXY(p.target),
      status: p.status,
    })),
  };
}

// ---------------------------------------------------------------- bars, plan, status

export function bars(state: GameState): Bars {
  return { ...state.bars };
}

export function currentPlan(state: GameState): Plan {
  return structuredClone(state.plan);
}

export interface GameStatus {
  phase: Phase;
  quarter: number;
  week: number;
  weeksInQuarter: number;
  ended: { cause: string; quarter: number } | null;
  inspectorsLeft: number;
  ownInflate: number | null;
  cardWaiting: boolean;
}

export function status(state: GameState): GameStatus {
  return {
    phase: state.phase,
    quarter: state.quarter,
    week: state.week,
    weeksInQuarter: B.TICKS_PER_QUARTER,
    ended: state.ended ? { ...state.ended } : null,
    inspectorsLeft: state.inspectorsLeft,
    ownInflate: state.ownInflate,
    cardWaiting: state.activeCard !== null,
  };
}

export interface TreasuryView {
  /** The planner's own account. */
  balance: number;
  /** What the Centre pays in each week at the current Centre bar. */
  centreGrantPerWeek: number;
  /** The weekly wage bill at the committed plan's wages. */
  wageBillPerWeek: number;
  /** Money the treasury has topped up enterprises with so far this quarter. */
  topUpsThisQuarter: number;
}

/** Public: the treasury is the planner's own account. */
export function treasury(state: GameState): TreasuryView {
  return {
    balance: balance(state, TREASURY),
    centreGrantPerWeek: Math.round(centreGrant(state)),
    wageBillPerWeek: wageBill(state),
    topUpsThisQuarter: state.stats.treasuryTopUp,
  };
}

export function reckoning(state: GameState) {
  return state.reckoning ? structuredClone(state.reckoning) : null;
}

// ---------------------------------------------------------------- rail manifests

export interface ManifestEntry {
  /** Week of the quarter (1..13) on which the wagons arrived or departed. */
  week: number;
  tick: number;
  from: string;
  to: string;
  good: GoodId;
  qty: number;
}

/**
 * The railway's own record of what moved through one place in the last completed quarter.
 * Trains are public, so this is honest; it is not a manager's claim. It shows rail movements
 * only, never stock on hand or what was diverted by road.
 */
export interface Manifest {
  target: LocationRef;
  targetName: string;
  /** The completed quarter this covers (0 before the first quarter has been played). */
  quarter: number;
  arrivals: ManifestEntry[];
  departures: ManifestEntry[];
  arrivedTotal: Stock;
  departedTotal: Stock;
}

const nodeName = (node: string): string => {
  if (node === 'centre') return 'the Centre';
  if (node.startsWith('ent:')) return ENTERPRISES[node.slice(4) as EnterpriseId]?.name ?? node;
  return TOWNS[node.slice(5) as TownId]?.name ?? node;
};

const nodeOf = (ref: LocationRef): string =>
  ref.type === 'enterprise' ? `ent:${ref.id}` : `town:${ref.id}`;

const zeroStock = (): Stock => ({ grain: 0, steel: 0, tractors: 0, consumer: 0 });

/**
 * Manifests for every enterprise and town covering the last completed quarter: shipments that
 * arrived or departed there. At the desk that is the quarter just run; while planning or during
 * a live quarter it is the one before.
 */
export function manifests(state: GameState): Manifest[] {
  const completed = state.phase === 'desk' ? state.quarter : state.quarter - 1;
  const end = state.phase === 'desk' ? state.tick : state.tick - state.week;
  const start = end - B.TICKS_PER_QUARTER;
  const inWindow = (t: number): boolean => completed >= 1 && t > start && t <= end;
  const shipments = [...state.arrived, ...state.shipments];

  const refs: LocationRef[] = [
    ...ENTERPRISE_IDS.map((id) => ({ type: 'enterprise', id }) as LocationRef),
    ...TOWN_IDS.map((id) => ({ type: 'town', id }) as LocationRef),
  ];
  return refs.map((target) => {
    const node = nodeOf(target);
    const entry = (s: GameState['shipments'][number], tick: number): ManifestEntry => ({
      week: tick - start,
      tick,
      from: nodeName(s.from),
      to: nodeName(s.to),
      good: s.good,
      qty: round1(s.qty),
    });
    // In-flight shipments have not arrived yet, so only departures can come from them.
    const arrivals = state.arrived
      .filter((s) => s.to === node && inWindow(s.arriveTick))
      .map((s) => entry(s, s.arriveTick))
      .sort((a, b) => a.tick - b.tick);
    const departures = shipments
      .filter((s) => s.from === node && inWindow(s.departTick))
      .map((s) => entry(s, s.departTick))
      .sort((a, b) => a.tick - b.tick);
    const arrivedTotal = zeroStock();
    const departedTotal = zeroStock();
    for (const a of arrivals) arrivedTotal[a.good] += a.qty;
    for (const d of departures) departedTotal[d.good] += d.qty;
    return {
      target,
      targetName: locationName(target),
      quarter: Math.max(0, completed),
      arrivals,
      departures,
      arrivedTotal: roundStock(arrivedTotal),
      departedTotal: roundStock(departedTotal),
    };
  });
}

// ---------------------------------------------------------------- observers, audits, reports

export interface ObserverFinding {
  quarter: number;
  target: LocationRef;
  targetName: string;
  output: number;
  stock: Stock;
  shippedIn: Stock;
  shippedOut: Stock;
  unmetGrain: number;
}

/** Exact figures recorded by observers, newest first. */
export function observerFindings(state: GameState): ObserverFinding[] {
  return [...state.observations].reverse().map((o) => ({
    quarter: o.quarter,
    target: o.target,
    targetName: locationName(o.target),
    output: round1(o.output),
    stock: roundStock(o.stock),
    shippedIn: roundStock(o.shippedIn),
    shippedOut: roundStock(o.shippedOut),
    unmetGrain: round1(o.unmetGrain),
  }));
}

export interface AuditView {
  enterprise: EnterpriseId;
  enterpriseName: string;
  quarter: number;
  status: 'pending' | 'resolved';
  /** Present once resolved. The player cannot tell whether the inspector was captured. */
  finding: {
    output: number;
    inputs: number;
    workers: number;
    reportedOutput: number;
    reportedInputs: number;
    padded: boolean;
  } | null;
}

export function audits(state: GameState): AuditView[] {
  return state.audits
    .map((a) => ({
      enterprise: a.enterprise,
      enterpriseName: ENTERPRISES[a.enterprise].name,
      quarter: a.quarterFiled,
      status: a.status,
      finding: a.finding
        ? {
            output: Math.round(a.finding.output),
            inputs: Math.round(a.finding.inputs),
            workers: a.finding.workers,
            reportedOutput: Math.round(a.finding.reportedOutput),
            reportedInputs: Math.round(a.finding.reportedInputs),
            padded: a.finding.padded,
          }
        : null,
    }))
    .reverse();
}

export interface PublicReport {
  id: number;
  enterprise: EnterpriseId;
  enterpriseName: string;
  manager: { name: string; title: string };
  quarter: number;
  quota: number;
  reportedOutput: number;
  reportedInputs: number;
  workers: number;
  requestNext: number;
  decision: Decision | null;
  documents: {
    /** The same enterprise's previous filed report, as filed. */
    previousReport: { quarter: number; reportedOutput: number; reportedInputs: number } | null;
    /** Present if an observer stood here this quarter. */
    observerSlip: ObserverFinding | null;
    /** Result of an earlier audit of this enterprise, if it has come back. */
    audit: AuditView | null;
    /** The railway's record of shipments in and out of this enterprise this quarter. */
    manifest: Manifest | null;
  };
}

function publicReport(state: GameState, r: GameState['reports'][number]): PublicReport {
  const mgr = CHARACTER_BY_ID[state.managers[r.enterprise].characterId];
  const prev = state.reports.find(
    (x) => x.enterprise === r.enterprise && x.quarter === r.quarter - 1,
  );
  const slip = observerFindings(state).find(
    (o) =>
      o.quarter === r.quarter && o.target.type === 'enterprise' && o.target.id === r.enterprise,
  );
  const audit = audits(state).find((a) => a.enterprise === r.enterprise && a.status === 'resolved');
  return {
    id: r.id,
    enterprise: r.enterprise,
    enterpriseName: ENTERPRISES[r.enterprise].name,
    manager: { name: mgr?.name ?? 'Manager', title: mgr?.title ?? '' },
    quarter: r.quarter,
    quota: r.quota,
    reportedOutput: Math.round(r.reportedOutput),
    reportedInputs: Math.round(r.reportedInputs),
    workers: r.workers,
    requestNext: Math.round(r.requestNext),
    decision: r.decision,
    documents: {
      previousReport: prev
        ? {
            quarter: prev.quarter,
            reportedOutput: Math.round(prev.reportedOutput),
            reportedInputs: Math.round(prev.reportedInputs),
          }
        : null,
      observerSlip: slip ?? null,
      audit: audit ?? null,
      manifest:
        manifests(state).find(
          (m) => m.target.type === 'enterprise' && m.target.id === r.enterprise,
        ) ?? null,
    },
  };
}

/** Every report filed this quarter, decided or not. Empty until the quarter has run. */
export function deskReports(state: GameState): PublicReport[] {
  if (state.phase !== 'desk') return [];
  return state.reports
    .filter((r) => r.quarter === state.quarter)
    .map((r) => publicReport(state, r));
}

/** Reports still waiting for a decision at the desk. */
export function pendingReports(state: GameState): PublicReport[] {
  return deskReports(state).filter((r) => r.decision === null);
}

// ---------------------------------------------------------------- pins, informants, cards

export interface PinView {
  id: number;
  label: string;
  target: LocationRef;
  targetName: string;
  quarterPlaced: number;
  informant: { id: string; name: string; right: number; wrong: number };
  /** Only moves off "open" after an observer or resolved audit checked the location. */
  status: 'open' | 'confirmed' | 'refuted';
}

export function pins(state: GameState): PinView[] {
  return state.pins.map((p) => {
    const inf = state.informants[p.informant];
    return {
      id: p.id,
      label: p.label,
      target: p.target,
      targetName: locationName(p.target),
      quarterPlaced: p.quarterPlaced,
      informant: {
        id: p.informant,
        name: CHARACTER_BY_ID[p.informant]?.name ?? p.informant,
        right: inf?.right ?? 0,
        wrong: inf?.wrong ?? 0,
      },
      status: p.status,
    };
  });
}

export interface ActiveCardView {
  cardId: string;
  type: 'petition' | 'tip' | 'event';
  character: { id: string; name: string; title: string };
  text: string;
  left: { label: string; hints: Hint[] };
  right: { label: string; hints: Hint[] };
  target: LocationRef | null;
  /** Visible track record of the informant, for tip cards. */
  trackRecord: { right: number; wrong: number } | null;
}

export function activeCard(state: GameState): ActiveCardView | null {
  if (!state.activeCard) return null;
  const card = CARD_BY_ID[state.activeCard.cardId];
  if (!card) return null;
  const who = CHARACTER_BY_ID[card.character];
  const inf = state.informants[card.character];
  return {
    cardId: card.id,
    type: card.type,
    character: { id: card.character, name: who?.name ?? card.character, title: who?.title ?? '' },
    text: card.text,
    left: { label: card.left.label, hints: choiceHints(card.left) },
    right: { label: card.right.label, hints: choiceHints(card.right) },
    target: card.tip ? card.tip.target : null,
    trackRecord: card.type === 'tip' && inf ? { right: inf.right, wrong: inf.wrong } : null,
  };
}

// Effect hints: direction and size of a choice's effect, never numbers (see hints.ts).
export { planHints, stampHints } from './hints';
export type { Hint, LaterHint, PlanControl, PlanControlHints } from './hints';
