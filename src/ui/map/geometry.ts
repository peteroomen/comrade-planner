import { RAIL, STATIONS } from '@/content/map';

// Track geometry for the live layer. Trains move by time, so a leg that takes two ticks is
// twice as slow as a one-tick leg, whatever its length on the page.

const XY: Record<string, { x: number; y: number }> = Object.fromEntries(
  STATIONS.map((s) => [s.id, { x: s.x, y: s.y }]),
);

const edgeTicks = (a: string, b: string): number =>
  RAIL.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a))?.ticks ?? 1;

export interface Track {
  pts: { x: number; y: number }[];
  /** Length of each leg on the page. */
  len: number[];
  /** Ticks each leg takes. */
  ticks: number[];
  totalLen: number;
  totalTicks: number;
}

const cache = new Map<string, Track>();

export function trackOf(path: string[]): Track {
  const key = path.join('>');
  const hit = cache.get(key);
  if (hit) return hit;
  const pts = path.map((id) => XY[id] ?? { x: 0, y: 0 });
  const len: number[] = [];
  const ticks: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    len.push(Math.hypot(b.x - a.x, b.y - a.y));
    ticks.push(edgeTicks(path[i - 1]!, path[i]!));
  }
  const track: Track = {
    pts,
    len,
    ticks,
    totalLen: len.reduce((s, v) => s + v, 0),
    totalTicks: ticks.reduce((s, v) => s + v, 0),
  };
  cache.set(key, track);
  return track;
}

/** Distance along the page path reached at `progress` (0..1 of the trip time). */
export function distanceAt(track: Track, progress: number): number {
  let t = Math.min(1, Math.max(0, progress)) * track.totalTicks;
  let d = 0;
  for (let i = 0; i < track.len.length; i++) {
    const legTicks = track.ticks[i]!;
    if (t <= legTicks) return d + track.len[i]! * (t / legTicks);
    t -= legTicks;
    d += track.len[i]!;
  }
  return d;
}

export interface Placed {
  x: number;
  y: number;
  /** Degrees. */
  angle: number;
}

export function pointAt(track: Track, dist: number): Placed {
  let d = Math.min(track.totalLen, Math.max(0, dist));
  for (let i = 0; i < track.len.length; i++) {
    const l = track.len[i]!;
    if (d <= l || i === track.len.length - 1) {
      const a = track.pts[i]!;
      const b = track.pts[i + 1]!;
      const f = l > 0 ? Math.min(1, d / l) : 0;
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }
    d -= l;
  }
  const p = track.pts[0] ?? { x: 0, y: 0 };
  return { x: p.x, y: p.y, angle: 0 };
}

export const stationXY = (id: string): { x: number; y: number } => XY[id] ?? { x: 0, y: 0 };
