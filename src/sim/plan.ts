import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import type { EnterpriseId, LocationRef, TownId } from '@/content/ids';
import { ENTERPRISES } from '@/content/enterprises';
import { TOWNS } from '@/content/towns';
import * as B from './balance';
import type { Plan } from './types';

const clamp = (v: number, lo: number, hi: number): number =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;

export function defaultPlan(): Plan {
  const quota = {} as Record<EnterpriseId, number>;
  const wage = {} as Record<EnterpriseId, number>;
  for (const id of ENTERPRISE_IDS) {
    quota[id] = ENTERPRISES[id].baseQuota;
    wage[id] = B.WAGE_DEFAULT;
  }
  const grainAllocation = {} as Record<TownId, number>;
  for (const t of TOWN_IDS) grainAllocation[t] = TOWNS[t].households / 100;
  return {
    quota,
    wage,
    prices: { grain: B.PRICE_GRAIN_DEFAULT, consumer: B.PRICE_CONSUMER_DEFAULT },
    steelKrasnyShare: 0.55,
    grainAllocation,
    observers: [],
  };
}

function validRef(ref: LocationRef): boolean {
  return ref.type === 'enterprise' ? ref.id in ENTERPRISES : ref.id in TOWNS;
}

/** Clamp any player plan into legal ranges. Never throws, so the UI cannot wedge the sim. */
export function sanitizePlan(input: Plan): Plan {
  const base = defaultPlan();
  const plan: Plan = structuredClone(base);
  for (const id of ENTERPRISE_IDS) {
    const q = ENTERPRISES[id].baseQuota;
    plan.quota[id] = Math.round(
      clamp(input.quota?.[id] ?? q, q * B.QUOTA_MIN_SHARE, q * B.QUOTA_MAX_SHARE),
    );
    plan.wage[id] = clamp(input.wage?.[id] ?? B.WAGE_DEFAULT, B.WAGE_MIN, B.WAGE_MAX);
  }
  plan.prices.grain = clamp(
    input.prices?.grain ?? B.PRICE_GRAIN_DEFAULT,
    B.PRICE_GRAIN_MIN,
    B.PRICE_GRAIN_MAX,
  );
  plan.prices.consumer = clamp(
    input.prices?.consumer ?? B.PRICE_CONSUMER_DEFAULT,
    B.PRICE_CONSUMER_MIN,
    B.PRICE_CONSUMER_MAX,
  );
  plan.steelKrasnyShare = clamp(input.steelKrasnyShare ?? 0.55, 0, 1);
  let sum = 0;
  for (const t of TOWN_IDS) {
    plan.grainAllocation[t] = clamp(input.grainAllocation?.[t] ?? base.grainAllocation[t], 0, 1);
    sum += plan.grainAllocation[t];
  }
  // Normalise so shares add to 1; fall back to population shares if everything is zero.
  for (const t of TOWN_IDS) {
    plan.grainAllocation[t] = sum > 0 ? plan.grainAllocation[t] / sum : base.grainAllocation[t];
  }
  const seen = new Set<string>();
  plan.observers = [];
  for (const ref of input.observers ?? []) {
    const key = `${ref.type}:${ref.id}`;
    if (!validRef(ref) || seen.has(key) || plan.observers.length >= B.OBSERVERS_MAX) continue;
    seen.add(key);
    plan.observers.push({ type: ref.type, id: ref.id } as LocationRef);
  }
  return plan;
}
