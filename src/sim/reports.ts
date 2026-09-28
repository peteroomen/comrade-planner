import { ENTERPRISE_IDS } from '@/content/ids';
import type { EnterpriseId } from '@/content/ids';
import * as B from './balance';
import { applyBar, inspectorCorruptChance, inspectorsAvailable } from './bars';
import { workersOf } from './households';
import { chance, nextFloat } from './rng';
import type { Audit, GameState, Report } from './types';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Share by which low Apparatus amplifies distortion: 0 at Apparatus 50 and above, up to 1 at 0. */
function lowApparatus(state: GameState): number {
  return clamp01((B.BAR_START - state.bars.apparatus) / B.BAR_START);
}

/**
 * The manager's version of the truth. A manager with honesty 1 (or greed 0) distorts nothing,
 * so their figures equal the truth exactly. Random draws are always consumed so that one
 * manager's honesty never shifts another's luck.
 */
function distortion(state: GameState, e: EnterpriseId): number {
  const m = state.managers[e];
  const low = lowApparatus(state);
  const p = B.DISTORT_CHANCE_BASE + B.DISTORT_CHANCE_APPARATUS * low;
  const fires = chance(state, p);
  const noise = 1 - B.DISTORT_NOISE / 2 + B.DISTORT_NOISE * nextFloat(state);
  const size =
    (1 - m.honesty) *
    (B.DISTORT_BASE + B.DISTORT_GREED_GAIN * m.greed) *
    (1 + B.DISTORT_APPARATUS_GAIN * low) *
    noise;
  return fires ? size : 0;
}

/** Resolve last quarter's audits. Reveals truth unless the inspector was captured. */
function resolveAudits(state: GameState): void {
  for (const a of state.audits) {
    if (a.status !== 'pending' || a.quarterFiled >= state.quarter) continue;
    const r = state.reports.find((x) => x.id === a.reportId);
    a.status = 'resolved';
    if (!r) continue;
    const padded =
      r.reportedOutput > r.truth.output * (1 + B.PADDED_TOLERANCE) ||
      r.reportedInputs > r.truth.inputs * (1 + B.PADDED_TOLERANCE);
    a.finding = a.corrupt
      ? {
          quarter: r.quarter,
          enterprise: r.enterprise,
          output: r.reportedOutput,
          inputs: r.reportedInputs,
          workers: r.workers,
          reportedOutput: r.reportedOutput,
          reportedInputs: r.reportedInputs,
          padded: false,
        }
      : {
          quarter: r.quarter,
          enterprise: r.enterprise,
          output: r.truth.output,
          inputs: r.truth.inputs,
          workers: r.workers,
          reportedOutput: r.reportedOutput,
          reportedInputs: r.reportedInputs,
          padded,
        };
    if (!a.corrupt && padded) {
      applyBar(state, 'apparatus', -B.APPARATUS_CAUGHT);
      const m = state.managers[a.enterprise];
      m.honesty = clamp01(m.honesty + B.AUDIT_CAUGHT_HONESTY_GAIN);
    }
  }
}

/** Quarter end: every enterprise files a report and last quarter's audits come back. */
export function fileReports(state: GameState): void {
  resolveAudits(state);
  for (const e of ENTERPRISE_IDS) {
    const m = state.managers[e];
    const output = state.stats.produced[e];
    const inputs = state.stats.inputs[e];
    const d = distortion(state, e);
    const trueRequest = inputs * B.REQUEST_BASE_COVER;
    const report: Report = {
      id: state.nextId++,
      quarter: state.quarter,
      enterprise: e,
      quota: state.plan.quota[e],
      reportedOutput: output * (1 + d),
      reportedInputs: inputs * (1 + m.skim * B.INPUT_PAD_SKIM + d * 0.5),
      workers: workersOf(state, e).length,
      requestNext: trueRequest * (1 + d * B.REQUEST_PAD + m.skim),
      truth: { output, inputs, workers: workersOf(state, e).length, request: trueRequest },
      decision: null,
    };
    state.reports.push(report);
  }
  state.reports = state.reports.filter((r) => r.quarter > state.quarter - B.REPORTS_KEEP);
  state.inspectorsLeft = inspectorsAvailable(state);
}

/** Launch an audit on a report. Returns false if no inspector is free. */
export function launchAudit(state: GameState, report: Report): boolean {
  if (state.inspectorsLeft <= 0) return false;
  state.inspectorsLeft -= 1;
  const audit: Audit = {
    id: state.nextId++,
    reportId: report.id,
    enterprise: report.enterprise,
    quarterFiled: report.quarter,
    corrupt: chance(state, inspectorCorruptChance(state)),
    status: 'pending',
    finding: null,
  };
  state.audits.push(audit);
  return true;
}
