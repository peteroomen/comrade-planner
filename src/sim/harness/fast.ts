import {
  applyChooseCard,
  applyDecideReport,
  applyEndQuarter,
  applyFileOwnReport,
  applySetPlan,
  applyTick,
} from '@/sim/step';
import type { GameState, Phase } from '@/sim/types';
import type { Driver } from './drivers';

// Harness-only stepping path. It calls the same in-place move functions the facade uses (see
// sim/step.ts) but skips the structuredClone the facade does on every call (thousands per run).
// harness.test.ts checks both paths give identical states.

/** In-place twin of `playQuarter` in drivers.ts. Mutates and returns `state`. */
export function playQuarterInPlace(state: GameState, d: Driver): GameState {
  // The phase changes inside the sim calls below, which TypeScript cannot see through.
  const phase = (): Phase => state.phase;
  if (!applySetPlan(state, d.plan(state, state.quarter))) return state;
  let guard = 0;
  while (phase() === 'quarter' && !state.ended && guard++ < 200) {
    const card = state.activeCard;
    if (card) {
      if (!applyChooseCard(state, card.cardId, d.side(state, card.cardId))) break;
    } else {
      applyTick(state);
    }
  }
  if (phase() !== 'desk') return state;
  for (const report of state.reports.filter((x) => x.quarter === state.quarter)) {
    applyDecideReport(state, report.id, d.decide(state, report.id));
  }
  applyFileOwnReport(state, d.inflate(state));
  applyEndQuarter(state);
  return state;
}
