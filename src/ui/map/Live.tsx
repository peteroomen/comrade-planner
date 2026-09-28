import { memo, useSyncExternalStore } from 'react';
import type { MapEnterprise, MapTown, MapTrain, VisibleMap } from '@/sim';
import { clock } from './clock';
import { distanceAt, pointAt, stationXY, trackOf } from './geometry';
import { GOOD_COLOUR, QUEUE, TRAILS } from './layout';

// The live layer. Everything here is drawn from the sim's visible state; only the trains are
// re-drawn every frame, sliding between ticks by the clock.

// ---------------------------------------------------------------- trains

const WAGON_GAP = 12.5;

function Wagon({
  x,
  y,
  angle,
  good,
  loaded,
}: {
  x: number;
  y: number;
  angle: number;
  good: MapTrain['good'];
  loaded: boolean;
}) {
  const colour = GOOD_COLOUR[good];
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(0)})`}>
      <rect
        x={-5.4}
        y={-4}
        width={10.8}
        height={8}
        rx={1}
        className={loaded ? 'wagon wagon-loaded' : 'wagon wagon-empty'}
        fill={loaded ? colour : 'var(--paper)'}
        stroke={loaded ? '#1C1A17' : colour}
        strokeWidth={loaded ? 0.9 : 1.7}
      />
    </g>
  );
}

function TrainMark({ t, tp }: { t: MapTrain; tp: number }) {
  const track = trackOf(t.path);
  const p = Math.min(1, t.progress + tp / t.durationTicks);
  const d = distanceAt(track, p);
  const head = pointAt(track, d);
  const wagons = Array.from({ length: t.size }, (_, k) => pointAt(track, d - 10.5 - k * WAGON_GAP));
  return (
    <g data-train={t.good} data-loaded={t.loaded ? '1' : '0'}>
      {wagons.map((w, k) => (
        <Wagon key={k} x={w.x} y={w.y} angle={w.angle} good={t.good} loaded={t.loaded} />
      ))}
      <g
        transform={`translate(${head.x.toFixed(1)} ${head.y.toFixed(1)}) rotate(${head.angle.toFixed(0)})`}
      >
        <rect x={-6} y={-4.8} width={12} height={9.6} rx={1.5} fill="#1C1A17" />
        <rect x={1} y={-3} width={3.4} height={6} fill="var(--paper)" opacity={0.85} />
        <circle cx={-2.6} cy={0} r={2} fill="var(--red)" />
      </g>
    </g>
  );
}

export function Trains({ trains }: { trains: MapTrain[] }) {
  const tp = useSyncExternalStore(clock.subscribe, clock.get);
  return (
    <g aria-hidden="true" pointerEvents="none" data-testid="trains">
      {trains.map((t) => (
        <TrainMark key={t.id} t={t} tp={tp} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- night trucks

/** Curve for a back road: bowed away from the straight line so it never hides under the rail. */
function roadPath(from: string, to: string, bow: number): string {
  const a = stationXY(from);
  const b = stationXY(to);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
}

const BOWS = [-34, 30, -38];

export const NightTrucks = memo(function NightTrucks({
  level,
  roads,
}: {
  level: VisibleMap['nightTraffic'];
  roads: VisibleMap['roads'];
}) {
  if (level === 0) return null;
  return (
    <g aria-hidden="true" pointerEvents="none" data-testid="night-trucks" data-level={level}>
      {roads.map((r, i) => {
        const d = roadPath(r.from, r.to, BOWS[i % BOWS.length]!);
        const o = 0.3 + level * 0.2;
        return (
          <g
            key={`${r.from}-${r.to}`}
            style={{ ['--o' as string]: o, animationDelay: `${i * 0.9}s` }}
            className="night"
          >
            <path d={d} className="night-line" style={{ animationDelay: `${i * 0.9}s` }} />
            {level >= 2 && (
              <path d={d} className="night-line night-line-2" transform="translate(3 3)" />
            )}
            {level >= 3 && (
              <path d={d} className="night-line night-line-3" transform="translate(-3 -2)" />
            )}
          </g>
        );
      })}
    </g>
  );
});

// ---------------------------------------------------------------- queues

const TALLY = [0, 4, 9, 14] as const;

function Tally({ n, x, y }: { n: number; x: number; y: number }) {
  const groups = Math.ceil(n / 5);
  const out = [];
  for (let g = 0; g < groups; g++) {
    const count = Math.min(5, n - g * 5);
    const gx = x + (g % 3) * 17;
    const gy = y + Math.floor(g / 3) * 11;
    const bars = Math.min(4, count);
    out.push(
      <g key={g} transform={`rotate(${g % 2 ? -2 : 3} ${gx} ${gy})`}>
        {Array.from({ length: bars }, (_, i) => (
          <line key={i} x1={gx + i * 3.4} y1={gy - 5} x2={gx + i * 3.4} y2={gy + 4} />
        ))}
        {count === 5 && <line x1={gx - 2} y1={gy + 3} x2={gx + 13} y2={gy - 4} />}
      </g>,
    );
  }
  return <>{out}</>;
}

export const Queues = memo(function Queues({ towns }: { towns: MapTown[] }) {
  return (
    <g aria-hidden="true" pointerEvents="none" className="tally" data-testid="queues">
      {towns.map((t) =>
        t.queue > 0 ? (
          <g key={t.id} data-queue={t.queue}>
            <Tally n={TALLY[t.queue]} x={t.x + QUEUE[t.id].dx} y={t.y + QUEUE[t.id].dy} />
          </g>
        ) : null,
      )}
    </g>
  );
});

// ---------------------------------------------------------------- smoke

const PUFF = 'M-5 0 C-9 -1 -9 -7 -4 -7 C-4 -12 3 -13 5 -8 C10 -9 12 -2 7 0 Z';

export const Smoke = memo(function Smoke({ items }: { items: MapEnterprise[] }) {
  return (
    <g aria-hidden="true" pointerEvents="none" data-testid="smoke">
      {items.map((e) =>
        e.smoke > 0 ? (
          <g key={e.id} transform={`translate(${e.x + 3} ${e.y - 11})`} data-smoke={e.smoke}>
            {Array.from({ length: e.smoke === 2 ? 3 : 2 }, (_, i) => (
              <path
                key={i}
                d={PUFF}
                className="puff"
                transform={e.smoke === 2 ? 'scale(1.2)' : undefined}
                style={{ animationDelay: `${i * 0.95}s` }}
              />
            ))}
          </g>
        ) : null,
      )}
    </g>
  );
});

// ---------------------------------------------------------------- emigrants

const PRINTS = 8;

export const Footprints = memo(function Footprints({ level }: { level: VisibleMap['emigrants'] }) {
  if (level === 0) return null;
  return (
    <g aria-hidden="true" pointerEvents="none" data-testid="footprints" data-level={level}>
      {TRAILS.slice(0, level).map((tr, ti) => {
        const dx = tr.to[0] - tr.from[0];
        const dy = tr.to[1] - tr.from[1];
        const len = Math.hypot(dx, dy);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        const nx = -dy / len;
        const ny = dx / len;
        return (
          <g key={ti}>
            {Array.from({ length: PRINTS }, (_, i) => {
              const f = (i + 1) / (PRINTS + 0.5);
              const side = i % 2 ? 1 : -1;
              const x = tr.from[0] + dx * f + nx * side * 3;
              const y = tr.from[1] + dy * f + ny * side * 3;
              return (
                <g
                  key={i}
                  className="foot"
                  transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(0)})`}
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <ellipse cx={0} cy={0} rx={3.2} ry={1.9} />
                  <ellipse cx={-4.2} cy={0} rx={1.5} ry={1.2} />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
});
