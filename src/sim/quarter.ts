import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import * as B from './balance';
import { applyBar, checkEnd, clampBar, driftBars } from './bars';
import { presentDueCard, scheduleCards } from './cards';
import { DEV_CHECKS, assertConserved } from './ledger';
import { refreshManagers } from './managers';
import { ageModifiers } from './modifiers';
import { finalizeObservers, startObservers } from './observers';
import { sanitizePlan } from './plan';
import { fileReports } from './reports';
import { emptyStats } from './stats';
import { chance } from './rng';
import { resolveTips } from './tips';
import { runWeek } from './world';
import type { GameState, Plan, Reckoning } from './types';

const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Commit the plan and begin the quarter: managers reconsider, cards are laid out, observers placed. */
export function beginQuarter(state: GameState, input: Plan): void {
  state.plan = sanitizePlan(input);
  state.week = 0;
  state.stats = emptyStats();
  state.ownInflate = null;
  state.reckoning = null;
  state.quarterStartBars = { ...state.bars };
  state.centre.extraInspectors = 0;
  state.inspectorsLeft = 0;
  refreshManagers(state);
  scheduleCards(state);
  startObservers(state);
  state.phase = 'quarter';
}

/** Advance one week. Pauses (does nothing) while a card awaits a decision. */
export function stepWeek(state: GameState): void {
  if (state.phase !== 'quarter' || state.activeCard || state.ended) return;
  runWeek(state);
  if (DEV_CHECKS) assertConserved(state);
  if (state.week >= B.TICKS_PER_QUARTER) {
    finalizeObservers(state);
    fileReports(state);
    resolveTips(state);
    // Audits coming back can end the run (Apparatus at 0), so only move to the desk if it goes on.
    if (!state.ended) state.phase = 'desk';
    return;
  }
  presentDueCard(state);
}

// ---------------------------------------------------------------- quarter end

function peopleDelta(state: GameState): number {
  const s = state.stats;
  const hh = state.households.length;
  const ticks = Math.max(1, s.ticks);
  const fed = s.grainDemand > 0 ? 1 - s.grainUnmet / s.grainDemand : 1;
  const consumerPerHh = s.consumerBought / (hh * ticks);
  const avgWage =
    state.households.reduce((sum, h) => sum + state.plan.wage[h.employer], 0) / Math.max(1, hh);
  const unpaid = s.wageDue > 0 ? 1 - s.wagePaid / s.wageDue : 0;
  const queueShare = s.queueTicks / (TOWN_IDS.length * ticks);
  return (
    B.PEOPLE_FED_GAIN * (fed - B.PEOPLE_FED_TARGET) +
    B.PEOPLE_CONSUMER_GAIN * (consumerPerHh - B.PEOPLE_CONSUMER_TARGET) +
    B.PEOPLE_WAGE_GAIN * (avgWage / B.WAGE_FAIR - 1) -
    B.PEOPLE_UNPAID_GAIN * unpaid -
    B.PEOPLE_QUEUE_GAIN * queueShare
  );
}

function shadowDelta(state: GameState): number {
  const s = state.stats;
  const ticks = Math.max(1, s.ticks);
  const unmetShare = s.grainDemand > 0 ? s.grainShopUnmet / s.grainDemand : 0;
  const avgSkim =
    ENTERPRISE_IDS.reduce((sum, e) => sum + state.managers[e].skim, 0) / ENTERPRISE_IDS.length;
  const fullShare = s.fullShopTicks / (TOWN_IDS.length * ticks);
  return (
    B.SHADOW_UNMET_GAIN * unmetShare +
    B.SHADOW_SKIM_GAIN * avgSkim -
    B.SHADOW_FULL_SHOP_GAIN * fullShare
  );
}

/**
 * Close the quarter after the desk: apply decisions, judge the upward report, ratchet, update
 * the bars and either start the next plan phase or end the run.
 */
export function finishQuarter(state: GameState): void {
  const lines: string[] = [];
  const inflate = state.ownInflate ?? B.OWN_INFLATE_MIN;
  const current = state.reports.filter((r) => r.quarter === state.quarter);

  // Desk decisions -> Apparatus, and the figures that go upward.
  let approved = 0;
  let rejected = 0;
  let audited = 0;
  const upward = {} as Record<(typeof ENTERPRISE_IDS)[number], number>;
  for (const r of current) {
    const decision = r.decision ?? 'approve';
    upward[r.enterprise] = r.reportedOutput * (decision === 'reject' ? B.REJECT_HAIRCUT : 1);
    if (decision === 'approve') {
      approved += 1;
      const padded =
        r.reportedOutput > r.truth.output * (1 + B.PADDED_TOLERANCE) ||
        r.reportedInputs > r.truth.inputs * (1 + B.PADDED_TOLERANCE);
      applyBar(state, 'apparatus', B.APPARATUS_APPROVE + B.APPARATUS_REQUEST_GRANTED);
      if (padded) applyBar(state, 'apparatus', B.APPARATUS_PADDED_APPROVE);
    } else if (decision === 'reject') {
      rejected += 1;
      applyBar(state, 'apparatus', -B.APPARATUS_REJECT);
    } else {
      audited += 1;
      applyBar(state, 'apparatus', -B.APPARATUS_AUDIT);
    }
  }
  lines.push(
    `Reports handled: ${approved} approved, ${rejected} rejected, ${audited} sent for audit.`,
  );

  // The Centre judges what we reported upward against its targets.
  let ratioSum = 0;
  for (const e of ENTERPRISE_IDS) {
    const ratio = (upward[e] * inflate) / Math.max(1, state.centre.targets[e]);
    ratioSum += Math.min(1 + B.CENTRE_MEET_CAP, Math.max(1 - B.CENTRE_MEET_CAP, ratio));
    state.centre.reportedThisYear[e].push(upward[e] * inflate);
  }
  const meanRatio = ratioSum / ENTERPRISE_IDS.length;
  applyBar(state, 'centre', B.CENTRE_MEET_GAIN * (meanRatio - 1));
  lines.push(
    meanRatio >= 1
      ? 'The Centre notes that the province met its targets.'
      : 'The Centre notes that the province fell short of its targets.',
  );
  const checkP = B.CENTRE_CHECK_BASE + B.CENTRE_CHECK_INFLATE_GAIN * (inflate - 1);
  const checked = chance(state, checkP);
  if (checked && inflate > 1.02) {
    applyBar(state, 'centre', -B.CENTRE_CAUGHT_INFLATION * (inflate - 1));
    lines.push('The Centre sent auditors of its own, and found our figures inflated.');
  }

  // People and Shadow come from what actually happened in the province.
  applyBar(state, 'people', peopleDelta(state));
  applyBar(state, 'shadow', shadowDelta(state));

  // Year end: the ratchet moves the Centre's targets toward what we reported upward.
  if (state.quarter % B.QUARTERS_PER_YEAR === 0) {
    let raised = false;
    for (const e of ENTERPRISE_IDS) {
      const seen = state.centre.reportedThisYear[e];
      if (seen.length > 0) {
        const avg = seen.reduce((a, b) => a + b, 0) / seen.length;
        if (avg > state.centre.targets[e]) {
          state.centre.targets[e] += B.RATCHET_BLEND * (avg - state.centre.targets[e]);
          raised = true;
        }
      }
      state.centre.reportedThisYear[e] = [];
    }
    if (raised) lines.push('New year: the Centre has raised its targets to match your reports.');
  }

  if (!state.ended) driftBars(state);
  for (const b of Object.keys(state.bars) as (keyof typeof state.bars)[]) {
    state.bars[b] = clampBar(state.bars[b]);
  }
  checkEnd(state);
  ageModifiers(state);
  if (state.cardHistory.length > 60) state.cardHistory = state.cardHistory.slice(-40);
  if (state.cardLog.length > 80) state.cardLog = state.cardLog.slice(-60);

  const reckoning: Reckoning = {
    quarter: state.quarter,
    barsBefore: { ...state.quarterStartBars },
    barsAfter: { ...state.bars },
    lines: [...lines, ...barLines(state.quarterStartBars, state.bars)],
  };
  state.reckoning = reckoning;
  state.ownInflate = null;
  if (!state.ended) {
    state.quarter += 1;
    state.week = 0;
    state.phase = 'plan';
  }
}

function barLines(from: GameState['bars'], to: GameState['bars']): string[] {
  const names = {
    people: 'The people',
    apparatus: 'The Apparatus',
    centre: 'The Centre',
    shadow: 'The shadow economy',
  } as const;
  const out: string[] = [];
  for (const b of Object.keys(names) as (keyof typeof names)[]) {
    const d = round1(to[b] - from[b]);
    if (Math.abs(d) >= 1)
      out.push(`${names[b]} ${d > 0 ? 'grew' : 'fell'} by ${Math.abs(d)} this quarter.`);
  }
  return out;
}
