import { ENTERPRISE_IDS } from '@/content/ids';
import type { EnterpriseId } from '@/content/ids';
import type { QuarterStats } from './types';

export function emptyStats(): QuarterStats {
  const produced = {} as Record<EnterpriseId, number>;
  const inputs = {} as Record<EnterpriseId, number>;
  for (const e of ENTERPRISE_IDS) {
    produced[e] = 0;
    inputs[e] = 0;
  }
  return {
    ticks: 0,
    grainDemand: 0,
    grainUnmet: 0,
    grainShopUnmet: 0,
    consumerBought: 0,
    consumerBlack: 0,
    blackTrade: 0,
    wageDue: 0,
    wagePaid: 0,
    queueTicks: 0,
    fullShopTicks: 0,
    produced,
    inputs,
    skimmed: 0,
    cardDeltas: {},
  };
}
