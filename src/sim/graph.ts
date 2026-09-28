import { RAIL, STATIONS } from '@/content/map';
import { ENTERPRISES } from '@/content/enterprises';
import { TOWNS } from '@/content/towns';
import type { NodeId } from './types';

// Rail routing over the content map. Static graph, so results are cached per pair.

export function stationOf(node: NodeId): string {
  if (node === 'centre') return 'centre';
  if (node.startsWith('ent:'))
    return ENTERPRISES[node.slice(4) as keyof typeof ENTERPRISES].station;
  return TOWNS[node.slice(5) as keyof typeof TOWNS].station;
}

const adjacency: Record<string, { to: string; ticks: number }[]> = {};
for (const s of STATIONS) adjacency[s.id] = [];
for (const e of RAIL) {
  adjacency[e.from]?.push({ to: e.to, ticks: e.ticks });
  adjacency[e.to]?.push({ to: e.from, ticks: e.ticks });
}

export interface Route {
  path: string[];
  ticks: number;
}

const cache = new Map<string, Route>();

/** Dijkstra over a handful of stations; ties broken by station order, so deterministic. */
export function route(from: string, to: string): Route {
  const key = `${from}>${to}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const dist: Record<string, number> = {};
  const prev: Record<string, string | undefined> = {};
  const todo = new Set(STATIONS.map((s) => s.id));
  for (const s of STATIONS) dist[s.id] = Infinity;
  dist[from] = 0;
  while (todo.size > 0) {
    let best: string | undefined;
    for (const id of todo) {
      if (best === undefined || (dist[id] as number) < (dist[best] as number)) best = id;
    }
    if (best === undefined || dist[best] === Infinity) break;
    todo.delete(best);
    for (const n of adjacency[best] ?? []) {
      const alt = (dist[best] as number) + n.ticks;
      if (alt < (dist[n.to] as number)) {
        dist[n.to] = alt;
        prev[n.to] = best;
      }
    }
  }
  const path: string[] = [];
  for (let at: string | undefined = to; at !== undefined; at = prev[at]) path.unshift(at);
  const result: Route = { path, ticks: Math.max(1, dist[to] as number) };
  cache.set(key, result);
  return result;
}
