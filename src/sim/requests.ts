import * as B from './balance';
import { steelCap } from './production';
import type { GameState, RequestGrant } from './types';

type SteelUser = 'krasny' | 'zarya';
const USERS: SteelUser[] = ['krasny', 'zarya'];

/** Steel the province can route per quarter: last quarter's Stal output plus Centre imports. */
function steelAvailable(state: GameState): number {
  const centre =
    B.CENTRE_STEEL_BASE *
    (1 + (B.CENTRE_STEEL_GAIN * (state.bars.centre - B.BAR_START)) / B.BAR_START);
  return (Math.max(0, centre) + state.enterprises.stal.lastProduced) * B.TICKS_PER_QUARTER;
}

/**
 * Krasny's share of steel this quarter. With no granted requests it is the plan's share. Otherwise
 * the granted requests (capped by what the works can use and what steel exists) set a request
 * share, and the two are blended. A factory whose request was not granted asks for its plan slice.
 */
export function effectiveSteelShare(state: GameState): number {
  const plan = state.plan.steelKrasnyShare;
  const grants = state.requestGrants;
  if (!grants.krasny && !grants.zarya) return plan;
  const total = (steelCap('krasny') + steelCap('zarya')) * B.TICKS_PER_QUARTER;
  const ask = (u: SteelUser, planned: number): number => {
    const g = grants[u];
    if (!g) return planned;
    return Math.min(g.amount, steelCap(u) * B.TICKS_PER_QUARTER, steelAvailable(state));
  };
  const k = ask('krasny', plan * total);
  const z = ask('zarya', (1 - plan) * total);
  const fromRequests = k + z > 0 ? k / (k + z) : plan;
  return B.REQUEST_BLEND * fromRequests + (1 - B.REQUEST_BLEND) * plan;
}

/** Share of a factory's incoming steel diverted to its manager's warehouse (the padded excess). */
export function hoardShare(state: GameState, u: SteelUser): number {
  const g = state.requestGrants[u];
  if (!g || g.amount <= 0) return 0;
  return Math.min(B.HOARD_MAX_SHARE, Math.max(0, g.excess / g.amount));
}

/** Record the requests granted by this quarter's approvals, replacing last quarter's. */
export function grantRequests(state: GameState): string[] {
  const grants: GameState['requestGrants'] = {};
  const names: string[] = [];
  for (const r of state.reports) {
    if (r.quarter !== state.quarter) continue;
    if ((r.decision ?? 'approve') !== 'approve') continue;
    if (!(USERS as string[]).includes(r.enterprise)) continue;
    const grant: RequestGrant = {
      amount: r.requestNext,
      excess: Math.max(0, r.requestNext - r.truth.request),
    };
    grants[r.enterprise as SteelUser] = grant;
    names.push(r.enterprise === 'krasny' ? 'Krasny' : 'Zarya');
  }
  state.requestGrants = grants;
  return names.length > 0 ? [`Steel requests granted for ${names.join(' and ')}.`] : [];
}
