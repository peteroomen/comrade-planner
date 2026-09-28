// Public rules the controls need (slider ranges). These are published constants, not hidden state.
export {
  OBSERVERS_MAX,
  OWN_INFLATE_MAX,
  OWN_INFLATE_MIN,
  PRICE_CONSUMER_MAX,
  PRICE_CONSUMER_MIN,
  PRICE_GRAIN_MAX,
  PRICE_GRAIN_MIN,
  QUOTA_MAX_SHARE,
  QUOTA_MIN_SHARE,
  REJECT_HAIRCUT,
  TICKS_PER_QUARTER,
  WAGE_FAIR,
  WAGE_MAX,
  WAGE_MIN,
} from '@/sim/balance';

/** A live quarter lasts about 75 seconds at normal speed. */
export const QUARTER_SECONDS = 75;
export const TICK_MS = (QUARTER_SECONDS * 1000) / 13;

/**
 * Milliseconds per week. `?tickms=300` shortens it for automated play-tests; anything under
 * 40 ms is ignored.
 */
export function tickMs(): number {
  const q = new URLSearchParams(window.location.search).get('tickms');
  const n = q === null ? NaN : Number(q);
  return Number.isFinite(n) && n >= 40 ? n : TICK_MS;
}
