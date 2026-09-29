import { CARD_BY_ID } from '@/content/cards';
import { resolveCard } from '@/sim/cards';
import { beginQuarter, finishQuarter, stepWeek } from '@/sim/quarter';
import { launchAudit } from '@/sim/reports';
import * as B from '@/sim/balance';
import type { GameState, Phase } from '@/sim/types';
import type { Driver } from './drivers';

// Harness-only stepping path. It runs the same sim functions as the facade but mutates the state
// in place, skipping the structuredClone the facade does on every call (thousands per run). The
// facade's public behaviour is untouched; harness.test.ts checks both paths give identical states.

/** In-place twin of `playQuarter` in drivers.ts. Mutates and returns `state`. */
export function playQuarterInPlace(state: GameState, d: Driver): GameState {
  // The phase changes inside the sim calls below, which TypeScript cannot see through.
  const phase = (): Phase => state.phase;
  if (phase() !== 'plan' || state.ended) return state;
  beginQuarter(state, d.plan(state, state.quarter));
  let guard = 0;
  while (phase() === 'quarter' && !state.ended && guard++ < 200) {
    const card = state.activeCard;
    if (card) {
      if (CARD_BY_ID[card.cardId]) resolveCard(state, card.cardId, d.side(state, card.cardId));
      else break;
    } else {
      stepWeek(state);
    }
  }
  if (phase() !== 'desk') return state;
  for (const report of state.reports.filter((x) => x.quarter === state.quarter)) {
    const decision = d.decide(state, report.id);
    // Same rules as facade.decideReport: changing an audit hands the inspector back.
    if (report.decision === 'audit') {
      const prior = state.audits.findIndex(
        (a) => a.reportId === report.id && a.status === 'pending',
      );
      if (prior >= 0) {
        state.audits.splice(prior, 1);
        state.inspectorsLeft += 1;
      }
    }
    if (decision === 'audit' && !launchAudit(state, report)) continue;
    report.decision = decision;
  }
  const inflate = d.inflate(state);
  const v = Number.isFinite(inflate) ? inflate : B.OWN_INFLATE_MIN;
  state.ownInflate = Math.min(B.OWN_INFLATE_MAX, Math.max(B.OWN_INFLATE_MIN, v));
  finishQuarter(state);
  return state;
}
