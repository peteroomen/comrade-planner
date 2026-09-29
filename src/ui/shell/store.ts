import { useSyncExternalStore } from 'react';
import {
  chooseCard,
  currentPlan,
  decideReport,
  defaultPlan,
  endQuarter,
  fileOwnReport,
  newGame,
  setPlan,
  tick,
} from '@/sim';
import type { Decision, GameState, Plan, Side } from '@/sim';
import type { LocationRef } from '@/content/ids';
import { OBSERVERS_MAX } from './limits';

// One store for the whole game. The reducer is pure and only ever changes the sim through the
// facade. UI-only state (open sheet, pause, desk step) sits beside it.

export type DeskStep = number; // 0..n-1 = report index, n = own report

export interface UiState {
  started: boolean;
  game: GameState;
  /** The plan being edited during the plan phase. */
  draft: Plan;
  sheet: LocationRef | null;
  paused: boolean;
  speed: 1 | 2;
  deskStep: DeskStep;
  /** Which way the player is leaning on the current card (drives the dots over the bars). */
  lean: Side | null;
  /** True once the player has dismissed the reckoning that follows a quarter. */
  reckoningSeen: boolean;
  seed: number;
}

export type Action =
  | { type: 'start' }
  | { type: 'restart'; seed: number }
  | { type: 'sheet'; ref: LocationRef | null }
  | { type: 'plan'; patch: (p: Plan) => Plan }
  | { type: 'observer'; ref: LocationRef }
  | { type: 'begin' }
  | { type: 'tick' }
  | { type: 'pause'; paused?: boolean }
  | { type: 'speed' }
  | { type: 'lean'; side: Side | null }
  | { type: 'card'; cardId: string; side: Side }
  | { type: 'decide'; reportId: number; decision: Decision }
  | { type: 'desk'; step: DeskStep }
  | { type: 'file'; inflate: number }
  | { type: 'continue' };

const sameRef = (a: LocationRef, b: LocationRef): boolean => a.type === b.type && a.id === b.id;

export function initialState(seed: number): UiState {
  const game = newGame(seed);
  return {
    started: false,
    game,
    draft: defaultPlan(),
    sheet: null,
    paused: false,
    speed: 1,
    deskStep: 0,
    lean: null,
    reckoningSeen: true,
    seed,
  };
}

export function reduce(ui: UiState, a: Action): UiState {
  switch (a.type) {
    case 'start':
      return { ...ui, started: true };
    case 'restart':
      return { ...initialState(a.seed), started: true };
    case 'sheet':
      return { ...ui, sheet: a.ref };
    case 'plan':
      return ui.game.phase === 'plan' ? { ...ui, draft: a.patch(ui.draft) } : ui;
    case 'observer': {
      if (ui.game.phase !== 'plan') return ui;
      const has = ui.draft.observers.some((o) => sameRef(o, a.ref));
      const observers = has
        ? ui.draft.observers.filter((o) => !sameRef(o, a.ref))
        : ui.draft.observers.length < OBSERVERS_MAX
          ? [...ui.draft.observers, a.ref]
          : ui.draft.observers;
      return { ...ui, draft: { ...ui.draft, observers } };
    }
    case 'begin': {
      if (ui.game.phase !== 'plan') return ui;
      return { ...ui, game: setPlan(ui.game, ui.draft), sheet: null, paused: false, deskStep: 0 };
    }
    case 'tick':
      return ui.paused ? ui : { ...ui, game: tick(ui.game) };
    case 'pause':
      return { ...ui, paused: a.paused ?? !ui.paused };
    case 'speed':
      return { ...ui, speed: ui.speed === 1 ? 2 : 1 };
    case 'lean':
      return ui.lean === a.side ? ui : { ...ui, lean: a.side };
    case 'card':
      return { ...ui, lean: null, game: chooseCard(ui.game, a.cardId, a.side) };
    case 'decide':
      return { ...ui, game: decideReport(ui.game, a.reportId, a.decision) };
    case 'desk':
      return { ...ui, deskStep: Math.max(0, a.step) };
    case 'file': {
      const filed = fileOwnReport(ui.game, a.inflate);
      const game = endQuarter(filed);
      return { ...ui, game, deskStep: 0, reckoningSeen: false };
    }
    case 'continue': {
      const game = ui.game;
      return {
        ...ui,
        reckoningSeen: true,
        // Each quarter starts from the last plan, with observers and any crackdown order taken down.
        draft: { ...currentPlan(game), observers: [], crackdown: null },
      };
    }
  }
}

export interface Store {
  get: () => UiState;
  dispatch: (a: Action) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createStore(seed: number): Store {
  let state = initialState(seed);
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    dispatch: (a) => {
      const next = reduce(state, a);
      if (next === state) return;
      state = next;
      for (const l of listeners) l();
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useUi(store: Store): UiState {
  return useSyncExternalStore(store.subscribe, store.get);
}
