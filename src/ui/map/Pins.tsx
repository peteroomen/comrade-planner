import { memo } from 'react';
import type { LocationRef } from '@/content/ids';
import type { MapPin, ObserverFinding } from '@/sim';
import { stationXY } from './geometry';
import { PIN, SLIP } from './layout';
import { ENTERPRISES } from '@/content/enterprises';
import { TOWNS } from '@/content/towns';

const stationOfRef = (ref: LocationRef): string =>
  ref.type === 'enterprise' ? ENTERPRISES[ref.id].station : TOWNS[ref.id].station;

/** Tip pins: a red-headed pin and a paper tag with the informant's claim. */
export const TipPins = memo(function TipPins({ pins }: { pins: MapPin[] }) {
  const seen: Record<string, number> = {};
  return (
    <g pointerEvents="none" data-testid="tip-pins">
      {pins.map((p) => {
        const key = `${p.target.type}:${p.target.id}`;
        const n = (seen[key] = (seen[key] ?? -1) + 1);
        const o = PIN[p.target.id];
        const px = p.x + o.dx;
        const py = p.y + o.dy + n * 15;
        const w = Math.max(40, p.label.length * 5.5 + 10);
        // Hang the tag on the side with room, so it never runs off the sheet.
        const left = o.dx < 0 || px + w + 8 > 378;
        const status =
          p.status === 'confirmed' ? 'confirmed' : p.status === 'refuted' ? 'refuted' : 'open';
        return (
          <g key={p.id} className={`pin pin-${status}`} data-pin={p.id}>
            <line x1={px} y1={py} x2={p.x + (left ? -3 : 3)} y2={p.y - 3} className="pin-needle" />
            <g transform={`translate(${left ? px - w - 3 : px + 3} ${py - 7})`}>
              <rect width={w} height={13} className="pin-tag" filter="url(#slip-shadow)" />
              <text x={5} y={9.4} className="pin-text">
                {p.label}
              </text>
              {status === 'refuted' && (
                <line x1={2} y1={7} x2={w - 2} y2={6} className="pin-strike" />
              )}
            </g>
            <circle cx={px} cy={py} r={4.2} className="pin-head" />
            <circle cx={px - 1.2} cy={py - 1.3} r={1.2} fill="#fff" opacity="0.6" />
          </g>
        );
      })}
    </g>
  );
});

const total = (s: ObserverFinding['shippedIn']): number =>
  s.grain + s.steel + s.tractors + s.consumer;
const fmt = (v: number): string => String(Math.round(v));

/** Observer pins: clipped paper slips with the typed figures from the last quarter they watched. */
export const ObserverSlips = memo(function ObserverSlips({
  targets,
  findings,
  phase,
}: {
  targets: LocationRef[];
  findings: ObserverFinding[];
  phase: 'plan' | 'quarter';
}) {
  return (
    <g pointerEvents="none" data-testid="observer-slips">
      {targets.map((t, i) => {
        const st = stationXY(stationOfRef(t));
        const o = SLIP[t.id];
        const f = findings.find((x) => x.target.type === t.type && x.target.id === t.id);
        const x = st.x + o.dx;
        const y = st.y + o.dy;
        const rot = i % 2 ? 2.5 : -2.5;
        const lines: string[] = [];
        if (f) {
          if (t.type === 'enterprise') {
            lines.push(`made  ${fmt(f.output)}`);
            lines.push(`sent  ${fmt(total(f.shippedOut))}`);
            lines.push(`got   ${fmt(total(f.shippedIn))}`);
          } else {
            lines.push(`grain ${fmt(f.stock.grain)}`);
            lines.push(`short ${fmt(f.unmetGrain)}`);
            lines.push(`in    ${fmt(total(f.shippedIn))}`);
          }
        }
        return (
          <g
            key={`${t.type}:${t.id}`}
            transform={`translate(${x} ${y}) rotate(${rot})`}
            data-slip={`${t.type}:${t.id}`}
          >
            <path d="M0 0 H78 V38 H8 L0 30 Z" className="slip" filter="url(#slip-shadow)" />
            <path d="M0 30 L8 30 L8 38 Z" className="slip-fold" />
            <path d="M6 -4 V9 a3 3 0 0 0 6 0 V-2" className="clip" />
            <text x={17} y={7.5} className="slip-title">
              {phase === 'plan' ? 'Observer posted' : `Observer${f ? ` Q${f.quarter}` : ''}`}
            </text>
            {f ? (
              lines.map((l, k) => (
                <text key={k} x={9} y={17 + k * 7.6} className="slip-text" xmlSpace="preserve">
                  {l}
                </text>
              ))
            ) : (
              <>
                <text x={9} y={19} className="slip-text">
                  figures come
                </text>
                <text x={9} y={26.6} className="slip-text">
                  at quarter end
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
});
