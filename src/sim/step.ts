import { CARD_BY_ID } from '@/content/cards';
import * as B from './balance';
import { resolveCard } from './cards';
import { beginQuarter, finishQuarter, stepWeek } from './quarter';
import { launchAudit } from './reports';
import type { Decision, GameState, Plan, Side } from './types';

// The player's five moves as plain in-place functions. The facade clones the state first and calls
// these; the balance harness calls them on its own state without cloning. Each one checks its own
// phase guard and returns false, having changed nothing, when the move is not legal right now.

/** Commit the plan and begin the quarter. */
export function applySetPlan(state: GameState, plan: Plan): boolean {
  if (state.phase !== 'plan' || state.ended) return false;
  beginQuarter(state, plan);
  return true;
}

/** Advance one week. Does nothing while a card is waiting for a choice. */
export function applyTick(state: GameState): boolean {
  if (state.phase !== 'quarter' || state.activeCard || state.ended) return false;
  stepWeek(state);
  return true;
}

/** Answer the waiting card. */
export function applyChooseCard(state: GameState, cardId: string, side: Side): boolean {
  if (!state.activeCard || state.activeCard.cardId !== cardId || !CARD_BY_ID[cardId]) return false;
  return resolveCard(state, cardId, side);
}

/**
 * Desk decision on one report. Changing an earlier audit decision hands the inspector back; an
 * audit needs a free inspector, otherwise nothing changes at all.
 */
export function applyDecideReport(state: GameState, reportId: number, decision: Decision): boolean {
  if (state.phase !== 'desk') return false;
  const report = state.reports.find((r) => r.id === reportId && r.quarter === state.quarter);
  if (!report) return false;
  const prior =
    report.decision === 'audit'
      ? state.audits.findIndex((a) => a.reportId === report.id && a.status === 'pending')
      : -1;
  if (decision === 'audit' && state.inspectorsLeft + (prior >= 0 ? 1 : 0) <= 0) return false;
  if (prior >= 0) {
    state.audits.splice(prior, 1);
    state.inspectorsLeft += 1;
  }
  if (decision === 'audit' && !launchAudit(state, report)) return false;
  report.decision = decision;
  return true;
}

/** Inflate the figures reported upward, from 1.0 (honest) to 1.5. */
export function applyFileOwnReport(state: GameState, inflate: number): boolean {
  if (state.phase !== 'desk') return false;
  const v = Number.isFinite(inflate) ? inflate : B.OWN_INFLATE_MIN;
  state.ownInflate = Math.min(B.OWN_INFLATE_MAX, Math.max(B.OWN_INFLATE_MIN, v));
  return true;
}

/** Close the quarter: undecided reports are approved; the Centre and the bars respond. */
export function applyEndQuarter(state: GameState): boolean {
  if (state.phase !== 'desk') return false;
  finishQuarter(state);
  return true;
}
