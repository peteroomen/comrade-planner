import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import * as B from './balance';
import { applyBar, checkEnd, clampBar, driftBars } from './bars';
import { orderCrackdown, settleCrackdown } from './crackdown';
import { presentDueCard, scheduleCards } from './cards';
import { DEV_CHECKS, assertConserved } from './ledger';
import { refreshManagers } from './managers';
import { ageModifiers } from './modifiers';
import { finalizeObservers, startObservers } from './observers';
import { sanitizePlan } from './plan';
import { fileReports } from './reports';
import { grantRequests } from './requests';
import { emptyStats } from './stats';
import { chance } from './rng';
import { resolveTips } from './tips';
import { runWeek } from './world';
import type { GameState, Plan, Reckoning } from './types';

const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Commit the plan and begin the quarter: managers reconsider, cards are laid out, observers placed. */
export function beginQuarter(state: GameState, input: Plan): void {
  const previousCrackdown = state.lastCrackdown;
  state.plan = sanitizePlan(input);
  state.notes = [];
  state.week = 0;
  state.stats = emptyStats();
  state.ownInflate = null;
  state.reckoning = null;
  state.quarterStartBars = { ...state.bars };
  orderCrackdown(state, previousCrackdown);
  // The order's costs can end the run before the quarter starts.
  if (state.ended) return;
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
  // Dearer shops are resented at once; cheaper ones please (and drain the treasury's takings).
  const priceStrain =
    0.5 * (state.plan.prices.grain / B.PRICE_GRAIN_DEFAULT - 1) +
    0.5 * (state.plan.prices.consumer / B.PRICE_CONSUMER_DEFAULT - 1);
  const consumerUnmet = s.consumerWanted > 0 ? s.consumerShopUnmet / s.consumerWanted : 0;
  return (
    B.PEOPLE_FED_GAIN * (fed - B.PEOPLE_FED_TARGET) +
    B.PEOPLE_CONSUMER_GAIN * (consumerPerHh - B.PEOPLE_CONSUMER_TARGET) +
    B.PEOPLE_WAGE_GAIN * (avgWage / B.WAGE_FAIR - 1) -
    B.PEOPLE_PRICE_GAIN * priceStrain -
    B.PEOPLE_UNPAID_GAIN * unpaid -
    B.PEOPLE_QUEUE_GAIN * queueShare -
    B.PEOPLE_CONSUMER_QUEUE_GAIN * consumerUnmet
  );
}

function shadowDelta(state: GameState): number {
  const s = state.stats;
  const ticks = Math.max(1, s.ticks);
  const unmetShare = s.grainDemand > 0 ? s.grainShopUnmet / s.grainDemand : 0;
  const avgSkim =
    ENTERPRISE_IDS.reduce((sum, e) => sum + state.managers[e].skim, 0) / ENTERPRISE_IDS.length;
  const fullShare = s.fullShopTicks / (TOWN_IDS.length * ticks);
  const consumerBlackShare = s.consumerBought > 0 ? s.consumerBlack / s.consumerBought : 0;
  return (
    B.SHADOW_BASE_GAIN +
    B.SHADOW_UNMET_GAIN * unmetShare +
    B.SHADOW_SKIM_GAIN * avgSkim +
    B.SHADOW_CONSUMER_BLACK_GAIN * consumerBlackShare +
    B.SHADOW_HOARD_GAIN * s.requestHoard -
    B.SHADOW_FULL_SHOP_GAIN * fullShare
  );
}

/**
 * Close the quarter after the desk: apply decisions, judge the upward report, ratchet, update
 * the bars and either start the next plan phase or end the run.
 */
export function finishQuarter(state: GameState): void {
  const lines: string[] = [...state.notes];
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
    const padded =
      r.reportedOutput > r.truth.output * (1 + B.PADDED_TOLERANCE) ||
      r.reportedInputs > r.truth.inputs * (1 + B.PADDED_TOLERANCE);
    if (decision === 'approve') {
      approved += 1;
      applyBar(
        state,
        'apparatus',
        (padded ? B.APPARATUS_PADDED_APPROVE : B.APPARATUS_APPROVE) + B.APPARATUS_REQUEST_GRANTED,
      );
      // Approving a lie is the player's liability: it goes upward and the Centre may check it.
      if (padded) state.stats.approvedPadding += Math.max(0, r.reportedOutput - r.truth.output);
    } else if (decision === 'reject') {
      rejected += 1;
      if (padded) {
        // The right call: small cost, and the manager files closer to the truth next quarter.
        applyBar(state, 'apparatus', -B.APPARATUS_REJECT_PADDED);
        state.managers[r.enterprise].chastened = 1;
      } else {
        applyBar(state, 'apparatus', -B.APPARATUS_REJECT_HONEST);
        applyBar(state, 'people', -B.PEOPLE_REJECT_HONEST);
      }
    } else {
      audited += 1;
      applyBar(state, 'apparatus', -B.APPARATUS_AUDIT);
    }
  }
  lines.push(
    `Reports handled: ${approved} approved, ${rejected} rejected, ${audited} sent for audit.`,
  );
  lines.push(...grantRequests(state));

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
  // The spot-check judges effective inflation: what went upward (own inflation and any padding
  // the player approved) against what was truly produced.
  const upTotal = ENTERPRISE_IDS.reduce((sum, e) => sum + upward[e], 0);
  const trueTotal = current.reduce((sum, r) => sum + r.truth.output, 0);
  const effective = inflate * Math.max(1, upTotal / Math.max(1, trueTotal));
  const checkP = B.CENTRE_CHECK_BASE + B.CENTRE_CHECK_INFLATE_GAIN * (effective - 1);
  const checked = chance(state, checkP);
  if (checked && effective > 1.02) {
    applyBar(state, 'centre', -B.CENTRE_CAUGHT_INFLATION * (effective - 1));
    lines.push('The Centre sent auditors of its own, and found our figures inflated.');
  }

  // The Centre also minds a wage bill the treasury could only meet by topping up far beyond its
  // grant. It measures against the grant at Centre 50 (not today's), so low Centre cannot spiral,
  // and one quarter's penalty is capped.
  const baseGrant = B.CENTRE_FUNDING_BASE * B.TICKS_PER_QUARTER;
  const overspend = Math.min(
    B.CENTRE_OVERSPEND_CAP,
    Math.max(0, state.stats.treasuryTopUp / baseGrant - 1 - B.CENTRE_OVERSPEND_FREE),
  );
  if (overspend > 0) {
    applyBar(state, 'centre', -B.CENTRE_OVERSPEND_GAIN * overspend);
    lines.push('The Centre frowns at the treasury: the wage bill has been overspent.');
  }

  // People and Shadow come from what actually happened in the province.
  applyBar(state, 'people', peopleDelta(state));
  applyBar(state, 'shadow', shadowDelta(state));
  settleCrackdown(state, lines);

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
      state.centre.targets[e] *= 1 + B.CENTRE_TARGET_GROWTH;
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
