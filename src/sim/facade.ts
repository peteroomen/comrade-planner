import { CARD_BY_ID } from '@/content/cards';
import * as B from './balance';
import { newGame as createGame } from './init';
import { launchAudit } from './reports';
import { defaultPlan as makeDefaultPlan } from './plan';
import { beginQuarter, finishQuarter, stepWeek } from './quarter';
import { resolveCard } from './cards';
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

/** Commit the plan (values are clamped to legal ranges) and begin the quarter. */
export function setPlan(state: GameState, plan: Plan): GameState {
  if (state.phase !== 'plan' || state.ended) return state;
  const s = structuredClone(state);
  beginQuarter(s, plan);
  return s;
}

/** Advance one week. Does nothing while a card is waiting for a choice. */
export function tick(state: GameState): GameState {
  if (state.phase !== 'quarter' || state.activeCard || state.ended) return state;
  const s = structuredClone(state);
  stepWeek(s);
  return s;
}

export function chooseCard(state: GameState, cardId: string, side: Side): GameState {
  if (!state.activeCard || state.activeCard.cardId !== cardId || !CARD_BY_ID[cardId]) return state;
  const s = structuredClone(state);
  resolveCard(s, cardId, side);
  return s;
}

/** Desk decision on one report. An audit needs a free inspector; otherwise nothing changes. */
export function decideReport(state: GameState, reportId: number, decision: Decision): GameState {
  if (state.phase !== 'desk') return state;
  const idx = state.reports.findIndex((r) => r.id === reportId && r.quarter === state.quarter);
  const current = state.reports[idx];
  if (!current) return state;
  const s = structuredClone(state);
  const report = s.reports[idx];
  if (!report) return state;
  // Changing an earlier audit decision gives the inspector back.
  if (report.decision === 'audit') {
    const prior = s.audits.findIndex((a) => a.reportId === report.id && a.status === 'pending');
    if (prior >= 0) {
      s.audits.splice(prior, 1);
      s.inspectorsLeft += 1;
    }
  }
  if (decision === 'audit' && !launchAudit(s, report)) return state;
  report.decision = decision;
  return s;
}

/** Inflate the figures reported upward, from 1.0 (honest) to 1.5. */
export function fileOwnReport(state: GameState, inflate: number): GameState {
  if (state.phase !== 'desk') return state;
  const s = structuredClone(state);
  const v = Number.isFinite(inflate) ? inflate : B.OWN_INFLATE_MIN;
  s.ownInflate = Math.min(B.OWN_INFLATE_MAX, Math.max(B.OWN_INFLATE_MIN, v));
  return s;
}

/** Close the quarter: undecided reports are approved; the Centre and the bars respond. */
export function endQuarter(state: GameState): GameState {
  if (state.phase !== 'desk') return state;
  const s = structuredClone(state);
  finishQuarter(s);
  return s;
}
