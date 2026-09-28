import type {
  BarId,
  CharacterId,
  EnterpriseId,
  GoodId,
  LocationRef,
  NodeId,
  Side,
  TownId,
} from '@/content/ids';

export type { BarId, CharacterId, EnterpriseId, GoodId, LocationRef, NodeId, Side, TownId };

/** All state is plain JSON-safe data. No classes, functions, Maps or Sets. */

export type Phase = 'plan' | 'quarter' | 'desk' | 'ended';
export type Decision = 'approve' | 'reject' | 'audit';
export type Stock = Record<GoodId, number>;
export type Bars = Record<BarId, number>;

// ---------------------------------------------------------------- money

export type AccountId = string;

export interface Ledger {
  balances: Record<AccountId, number>;
  /** Sum of all balances, fixed at newGame. Every tick must leave this unchanged. */
  total: number;
}

// ---------------------------------------------------------------- world

export interface TownState {
  id: TownId;
  stock: Stock;
  /** Grain demand the shop could not meet last tick (drives queues). */
  lastUnmet: number;
  lastDemand: number;
}

export interface EnterpriseState {
  id: EnterpriseId;
  /** Goods on hand: outputs waiting to ship, and inputs (steel) waiting to be used. */
  stock: Stock;
  /** Tractors installed (farms only; capital that wears out). */
  tractors: number;
  /** Goods the manager has diverted to a private warehouse (steel, tractors). Hidden. */
  warehouse: Stock;
  /** Output produced last tick, before any skimming. */
  lastProduced: number;
  /** Ticks of forced stoppage remaining (breakdown events). */
  jam: number;
}

export interface Household {
  id: number;
  town: TownId;
  employer: EnterpriseId;
  skill: number;
  /** Hidden: weight on consumer goods versus saving. Drifts slowly. */
  prefConsumer: number;
}

export interface BlackMarket {
  stock: Stock;
}

export interface Shipment {
  id: number;
  from: NodeId;
  to: NodeId;
  good: GoodId;
  qty: number;
  departTick: number;
  arriveTick: number;
  /** Station path, for the UI to animate along. */
  path: string[];
}

// ---------------------------------------------------------------- managers and reports

export interface Manager {
  characterId: CharacterId;
  enterprise: EnterpriseId;
  /** Hidden traits. */
  honesty: number;
  greed: number;
  /** Hidden: share of output diverted per tick. */
  skim: number;
}

export interface ReportTruth {
  output: number;
  inputs: number;
  workers: number;
  request: number;
}

export interface Report {
  id: number;
  quarter: number;
  enterprise: EnterpriseId;
  quota: number;
  reportedOutput: number;
  reportedInputs: number;
  workers: number;
  requestNext: number;
  /** True values, kept so observers and audits can reveal them. Never selected for the UI. */
  truth: ReportTruth;
  decision: Decision | null;
}

export interface Audit {
  id: number;
  reportId: number;
  enterprise: EnterpriseId;
  quarterFiled: number;
  /** Hidden: this inspector has been captured and will vouch for the report. */
  corrupt: boolean;
  status: 'pending' | 'resolved';
  finding: AuditFinding | null;
}

export interface AuditFinding {
  quarter: number;
  enterprise: EnterpriseId;
  output: number;
  inputs: number;
  workers: number;
  reportedOutput: number;
  reportedInputs: number;
  /** Findings say the report was padded. A corrupt inspector always says it was fine. */
  padded: boolean;
}

// ---------------------------------------------------------------- observers

export interface ObserverRecord {
  quarter: number;
  target: LocationRef;
  /** True production, true stock at quarter end, true shipments in and out. */
  output: number;
  stock: Stock;
  shippedIn: Stock;
  shippedOut: Stock;
  /** Towns only: grain demand that went unmet during the quarter. */
  unmetGrain: number;
}

export interface ObserverLive {
  target: LocationRef;
  output: number;
  shippedIn: Stock;
  shippedOut: Stock;
  unmetGrain: number;
}

// ---------------------------------------------------------------- plan

export interface Plan {
  quota: Record<EnterpriseId, number>;
  wage: Record<EnterpriseId, number>;
  prices: { grain: number; consumer: number };
  /** Share of steel (Stal output and Centre imports) sent to Krasny, rest to Zarya. 0..1. */
  steelKrasnyShare: number;
  /** Share of farm grain sent to each town. Normalised on use. */
  grainAllocation: Record<TownId, number>;
  observers: LocationRef[];
}

// ---------------------------------------------------------------- cards

export type Effect =
  | { kind: 'bars'; delta: Partial<Record<BarId, number>> }
  | { kind: 'tractors'; enterprise: EnterpriseId; n: number }
  | { kind: 'bonus'; enterprise: EnterpriseId; amount: number }
  | { kind: 'reserveGrain'; town: TownId; qty: number }
  | { kind: 'steelShare'; delta: number }
  | { kind: 'modifier'; name: ModifierName; value: number; quarters: number }
  | { kind: 'delayShipments'; ticks: number }
  | { kind: 'extraInspectors'; n: number }
  | { kind: 'crackdown' }
  | { kind: 'repair'; enterprise: EnterpriseId; cost: number }
  | { kind: 'jam'; enterprise: EnterpriseId; ticks: number };

export type ModifierName = 'grainMult' | 'skimMult';

export interface Modifier {
  name: ModifierName;
  value: number;
  quartersLeft: number;
}

export type TipClaim = 'skimming' | 'shortage' | 'idle';

export interface CardInstance {
  cardId: string;
  tick: number;
  /** For tips: whether the claim matched real state when the card was drawn. Hidden. */
  veracity: boolean | null;
}

/** A slot in the quarter's card schedule. The actual card is picked when the slot comes up. */
export interface ScheduledCard {
  tick: number;
  kind: 'tip' | 'other';
  done: boolean;
}

export interface Informant {
  characterId: CharacterId;
  /** Hidden. */
  reliability: number;
  right: number;
  wrong: number;
}

export interface Pin {
  id: number;
  cardId: string;
  informant: CharacterId;
  target: LocationRef;
  claim: TipClaim;
  label: string;
  quarterPlaced: number;
  status: 'open' | 'confirmed' | 'refuted';
}

export interface CardLogEntry {
  quarter: number;
  tick: number;
  cardId: string;
  side: Side;
}

// ---------------------------------------------------------------- quarter bookkeeping

export interface QuarterStats {
  ticks: number;
  grainDemand: number;
  grainUnmet: number;
  /** Grain the state shops could not supply (households then turn to the black market). */
  grainShopUnmet: number;
  consumerBought: number;
  consumerBlack: number;
  blackTrade: number;
  wageDue: number;
  wagePaid: number;
  queueTicks: number;
  fullShopTicks: number;
  /** Official output that entered the plan (after skimming), per enterprise. */
  produced: Record<EnterpriseId, number>;
  /** Inputs consumed per enterprise (steel for factories, tractor-weeks for farms, ore for Stal). */
  inputs: Record<EnterpriseId, number>;
  skimmed: number;
  /** Bar deltas applied by cards this quarter, for the reckoning summary. */
  cardDeltas: Partial<Record<BarId, number>>;
}

export interface Reckoning {
  quarter: number;
  barsBefore: Bars;
  barsAfter: Bars;
  /** Only things the player could know. */
  lines: string[];
}

export interface EndState {
  cause: string;
  quarter: number;
}

export interface CentreState {
  /** What the Centre expects per enterprise per quarter. Ratchets up with what we report. */
  targets: Record<EnterpriseId, number>;
  /** Quarterly figures reported upward, per enterprise, for the ratchet. */
  reportedThisYear: Record<EnterpriseId, number[]>;
  extraInspectors: number;
}

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  tick: number;
  quarter: number;
  /** Ticks elapsed within the current quarter, 0..13. */
  week: number;
  phase: Phase;
  ended: EndState | null;
  bars: Bars;
  quarterStartBars: Bars;
  ledger: Ledger;
  towns: Record<TownId, TownState>;
  enterprises: Record<EnterpriseId, EnterpriseState>;
  households: Household[];
  managers: Record<EnterpriseId, Manager>;
  black: BlackMarket;
  /** Province grain reserve, drawn on by cards. */
  reserveGrain: number;
  shipments: Shipment[];
  arrived: Shipment[];
  nextId: number;
  plan: Plan;
  centre: CentreState;
  modifiers: Modifier[];
  reports: Report[];
  audits: Audit[];
  inspectorsLeft: number;
  observersLive: ObserverLive[];
  observations: ObserverRecord[];
  cardSchedule: ScheduledCard[];
  activeCard: CardInstance | null;
  cardHistory: string[];
  cardLog: CardLogEntry[];
  informants: Record<CharacterId, Informant>;
  pins: Pin[];
  ownInflate: number | null;
  stats: QuarterStats;
  reckoning: Reckoning | null;
}
