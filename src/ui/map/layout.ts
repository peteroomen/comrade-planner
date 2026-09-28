import type { EnterpriseId, GoodId, TownId } from '@/content/ids';

// Hand-tuned drawing offsets so labels, pins and slips sit clear of the rail. Map units.

export interface Anchor {
  dx: number;
  dy: number;
  anchor: 'start' | 'middle' | 'end';
}

export const LABEL: Record<EnterpriseId | TownId, Anchor> = {
  lesnoy: { dx: 0, dy: 27, anchor: 'middle' },
  kolos: { dx: 4, dy: -20, anchor: 'end' },
  stal: { dx: 0, dy: -20, anchor: 'middle' },
  krasny: { dx: 0, dy: 27, anchor: 'middle' },
  zarya: { dx: 0, dy: 27, anchor: 'middle' },
  dalniy: { dx: 16, dy: 4, anchor: 'start' },
  kovrino: { dx: 16, dy: 5, anchor: 'start' },
  oblastgrad: { dx: 0, dy: 33, anchor: 'middle' },
};

/** Where a queue's tally marks go, relative to the town block. */
export const QUEUE: Record<TownId, { dx: number; dy: number }> = {
  dalniy: { dx: -50, dy: 4 },
  kovrino: { dx: 14, dy: -34 },
  oblastgrad: { dx: 24, dy: 10 },
};

/** Where observer slips and tip pins hang, relative to the place. */
export const SLIP: Record<EnterpriseId | TownId, { dx: number; dy: number }> = {
  lesnoy: { dx: 18, dy: -14 },
  kolos: { dx: -62, dy: -76 },
  stal: { dx: 8, dy: 16 },
  krasny: { dx: -86, dy: 32 },
  zarya: { dx: 30, dy: -22 },
  dalniy: { dx: -64, dy: 24 },
  kovrino: { dx: -96, dy: -20 },
  oblastgrad: { dx: -28, dy: 60 },
};

export const PIN: Record<EnterpriseId | TownId, { dx: number; dy: number }> = {
  lesnoy: { dx: 14, dy: -16 },
  kolos: { dx: 14, dy: -14 },
  stal: { dx: 14, dy: -44 },
  krasny: { dx: 14, dy: -16 },
  zarya: { dx: 14, dy: -16 },
  dalniy: { dx: 16, dy: -16 },
  kovrino: { dx: -14, dy: -16 },
  oblastgrad: { dx: 16, dy: -18 },
};

/** Muted print palette, one ink per good. */
export const GOOD_COLOUR: Record<GoodId, string> = {
  grain: '#C08F2E',
  steel: '#4E6577',
  tractors: '#6B7B3F',
  consumer: '#8E5B70',
};

export const GOOD_NAME: Record<GoodId, string> = {
  grain: 'Grain',
  steel: 'Steel',
  tractors: 'Tractors',
  consumer: 'Consumer goods',
};

/** Footprint trails, each ending at a map edge. */
export const TRAILS: { from: [number, number]; to: [number, number] }[] = [
  { from: [70, 232], to: [4, 292] },
  { from: [318, 476], to: [386, 524] },
  { from: [176, 310], to: [40, 452] },
];
