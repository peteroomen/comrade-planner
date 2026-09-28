import { memo } from 'react';
import type { KeyboardEvent } from 'react';
import type { LocationRef } from '@/content/ids';
import type { MapEnterprise, MapTown } from '@/sim';
import { LABEL } from './layout';

const STAR = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 1 : 0.4;
  const a = (Math.PI * i) / 5 - Math.PI / 2;
  return `${(12.5 * r * Math.cos(a)).toFixed(2)},${(12.5 * r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

/** Long names (Krasny Tractor Works) wrap after the first word so labels stay compact. */
function nameLines(name: string): string[] {
  if (name.length <= 16) return [name];
  const i = name.indexOf(' ');
  return [name.slice(0, i), name.slice(i + 1)];
}

export interface HitProps {
  interactive: boolean;
  selected: LocationRef | null;
  onPick: (ref: LocationRef) => void;
}

const isSel = (sel: LocationRef | null, ref: LocationRef): boolean =>
  sel !== null && sel.type === ref.type && sel.id === ref.id;

function keyPick(e: KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}

/** Tap target: at least 44 CSS px at the smallest supported width. */
function Hit({
  x,
  y,
  label,
  selected,
  interactive,
  onPick,
  testId,
}: {
  x: number;
  y: number;
  label: string;
  selected: boolean;
  interactive: boolean;
  onPick: () => void;
  testId: string;
}) {
  if (!interactive) return null;
  return (
    <g
      className="hit"
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onKeyDown={(e) => keyPick(e, onPick)}
    >
      <circle cx={x} cy={y} r={26} fill="transparent" />
      <circle className="hit-ring" cx={x} cy={y} r={selected ? 21 : 17} />
    </g>
  );
}

export const Enterprises = memo(function Enterprises({
  items,
  observers,
  hit,
}: {
  items: MapEnterprise[];
  observers: LocationRef[];
  hit: HitProps;
}) {
  return (
    <g>
      {items.map((e) => {
        const ref: LocationRef = { type: 'enterprise', id: e.id };
        const l = LABEL[e.id];
        const watched = observers.some((o) => o.type === 'enterprise' && o.id === e.id);
        return (
          <g key={e.id}>
            {watched && <circle className="watch-ring" cx={e.x} cy={e.y} r={19} />}
            <g transform={`translate(${e.x} ${e.y})`}>
              <polygon points={STAR} className="star" />
            </g>
            <text x={e.x + l.dx} y={e.y + l.dy} textAnchor={l.anchor} className="lbl">
              {nameLines(e.name).map((line, i) => (
                <tspan key={line} x={e.x + l.dx} dy={i === 0 ? 0 : 12}>
                  {line}
                </tspan>
              ))}
            </text>
            <Hit
              x={e.x}
              y={e.y}
              label={`${e.name}: open plan`}
              selected={isSel(hit.selected, ref)}
              interactive={hit.interactive}
              onPick={() => hit.onPick(ref)}
              testId={`place-${e.id}`}
            />
          </g>
        );
      })}
    </g>
  );
});

export const Towns = memo(function Towns({
  items,
  observers,
  hit,
}: {
  items: MapTown[];
  observers: LocationRef[];
  hit: HitProps;
}) {
  return (
    <g>
      {items.map((t) => {
        const ref: LocationRef = { type: 'town', id: t.id };
        const l = LABEL[t.id];
        const seat = t.id === 'oblastgrad';
        const watched = observers.some((o) => o.type === 'town' && o.id === t.id);
        return (
          <g key={t.id}>
            {watched && <circle className="watch-ring" cx={t.x} cy={t.y} r={20} />}
            <g transform={`translate(${t.x} ${t.y}) scale(1.25)`} className="town">
              {seat ? (
                <>
                  <rect x={-12} y={-9} width={24} height={17} />
                  <rect x={-7} y={-14} width={9} height={6} />
                  <rect x={4} y={-12} width={5} height={4} />
                  <rect className="town-window" x={-8} y={-4} width={4} height={4} />
                  <rect className="town-window" x={-1} y={-4} width={4} height={4} />
                  <rect className="town-window" x={6} y={-4} width={4} height={4} />
                  <rect className="town-shop" x={12} y={3} width={7} height={6} />
                </>
              ) : (
                <>
                  <rect x={-9} y={-7} width={17} height={13} />
                  <rect x={-5} y={-11} width={7} height={5} />
                  <rect className="town-window" x={-5} y={-3} width={3} height={3} />
                  <rect className="town-window" x={1} y={-3} width={3} height={3} />
                  <rect className="town-shop" x={9} y={1} width={7} height={6} />
                </>
              )}
            </g>
            <text x={t.x + l.dx} y={t.y + l.dy} textAnchor={l.anchor} className="lbl lbl-town">
              {t.name}
            </text>
            {seat && (
              <text x={t.x + l.dx} y={t.y + l.dy + 10} textAnchor={l.anchor} className="lbl-sub">
                provincial seat
              </text>
            )}
            <Hit
              x={t.x}
              y={t.y}
              label={`${t.name}: open plan`}
              selected={isSel(hit.selected, ref)}
              interactive={hit.interactive}
              onPick={() => hit.onPick(ref)}
              testId={`place-${t.id}`}
            />
          </g>
        );
      })}
    </g>
  );
});
