import type { StationId } from './ids';

// Portrait map laid out for a 390 x 600 SVG viewBox. Coordinates keep a ~30px margin.

export interface Station {
  id: StationId;
  x: number;
  y: number;
  /** Small label for junctions and the Centre; towns and enterprises are labelled elsewhere. */
  label?: string;
}

export interface RailEdge {
  from: StationId;
  to: StationId;
  /** Travel time in ticks (weeks). */
  ticks: number;
}

export interface Road {
  from: StationId;
  to: StationId;
}

export const MAP_WIDTH = 390;
export const MAP_HEIGHT = 600;

export const STATIONS: Station[] = [
  { id: 'centre', x: 195, y: 30, label: 'To the Centre' },
  { id: 'junction', x: 195, y: 125 },
  { id: 'lesnoy', x: 48, y: 120 },
  { id: 'dalniy', x: 85, y: 210 },
  { id: 'oblastgrad', x: 195, y: 292 },
  { id: 'stal', x: 295, y: 248 },
  { id: 'krasny', x: 100, y: 348 },
  { id: 'kovrino', x: 300, y: 458 },
  { id: 'kolos', x: 346, y: 388 },
  { id: 'zarya', x: 232, y: 528 },
];

export const RAIL: RailEdge[] = [
  { from: 'centre', to: 'junction', ticks: 1 },
  { from: 'junction', to: 'oblastgrad', ticks: 1 },
  { from: 'junction', to: 'dalniy', ticks: 1 },
  { from: 'dalniy', to: 'lesnoy', ticks: 1 },
  { from: 'dalniy', to: 'oblastgrad', ticks: 2 },
  { from: 'oblastgrad', to: 'stal', ticks: 1 },
  { from: 'oblastgrad', to: 'krasny', ticks: 1 },
  { from: 'oblastgrad', to: 'kovrino', ticks: 2 },
  { from: 'kovrino', to: 'kolos', ticks: 1 },
  { from: 'kovrino', to: 'zarya', ticks: 1 },
];

/** Back roads used by night trucks (black market), drawn as dotted pencil lines. */
export const ROADS: Road[] = [
  { from: 'kolos', to: 'kovrino' },
  { from: 'oblastgrad', to: 'kovrino' },
  { from: 'zarya', to: 'kovrino' },
];
