import { newGame as createGame } from './init';
import { defaultPlan as makeDefaultPlan } from './plan';
import {
  applyChooseCard,
  applyDecideReport,
  applyEndQuarter,
  applyFileOwnReport,
  applySetPlan,
  applyTick,
} from './step';
import type { Decision, GameState, Plan, Side } from './types';

// The facade is the only way the UI changes state. Every call clones the input first, so the
// sim is pure from the outside (same state + same input = same result) and old states stay valid.
// Calls made in the wrong phase return the state unchanged.

export function newGame(seed: number): GameState {
  return createGame(seed);
}

/** A legal starting plan for the UI to edit. */
export function defaultPlan(): Plan {
  return makeDefaultPlan();
}

/** Clone the state, apply one in-place move, and hand back the clone (or the input if illegal). */
function act(state: GameState, move: (draft: GameState) => boolean): GameState {
  const s = structuredClone(state);
  return move(s) ? s : state;
}

/** Commit the plan (values are clamped to legal ranges) and begin the quarter. */
export function setPlan(state: GameState, plan: Plan): GameState {
  return act(state, (s) => applySetPlan(s, plan));
}

/** Advance one week. Does nothing while a card is waiting for a choice. */
export function tick(state: GameState): GameState {
  return act(state, applyTick);
}

export function chooseCard(state: GameState, cardId: string, side: Side): GameState {
  return act(state, (s) => applyChooseCard(s, cardId, side));
}

/** Desk decision on one report. An audit needs a free inspector; otherwise nothing changes. */
export function decideReport(state: GameState, reportId: number, decision: Decision): GameState {
  return act(state, (s) => applyDecideReport(s, reportId, decision));
}

/** Inflate the figures reported upward, from 1.0 (honest) to 1.5. */
export function fileOwnReport(state: GameState, inflate: number): GameState {
  return act(state, (s) => applyFileOwnReport(s, inflate));
}

/** Close the quarter: undecided reports are approved; the Centre and the bars respond. */
export function endQuarter(state: GameState): GameState {
  return act(state, applyEndQuarter);
}
