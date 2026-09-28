import { memo } from 'react';
import type { VisibleMap } from '@/sim';

/** Rail as the classic black-and-white dashed line, plus junction and Centre markers. */
export const Rails = memo(function Rails({
  stations,
  rails,
}: Pick<VisibleMap, 'stations' | 'rails'>) {
  const at = (id: string) => stations.find((s) => s.id === id);
  const lines = rails
    .map((r) => ({ a: at(r.from), b: at(r.to), key: `${r.from}-${r.to}` }))
    .filter((l) => l.a && l.b);
  const centre = at('centre');
  const junction = at('junction');
  return (
    <g aria-hidden="true">
      <g stroke="#1C1A17" strokeWidth="5.2" strokeLinecap="butt">
        {lines.map((l) => (
          <line key={l.key} x1={l.a!.x} y1={l.a!.y} x2={l.b!.x} y2={l.b!.y} />
        ))}
      </g>
      <g stroke="var(--paper)" strokeWidth="2.8" strokeDasharray="7 5">
        {lines.map((l) => (
          <line key={l.key} x1={l.a!.x} y1={l.a!.y} x2={l.b!.x} y2={l.b!.y} />
        ))}
      </g>
      {junction && (
        <circle
          cx={junction.x}
          cy={junction.y}
          r={5}
          fill="var(--paper)"
          stroke="#1C1A17"
          strokeWidth="2"
        />
      )}
      {centre && (
        <g transform={`translate(${centre.x} ${centre.y})`}>
          <polygon points="0,-15 -8,-2 8,-2" fill="var(--red)" stroke="#1C1A17" strokeWidth="1.2" />
          <rect
            x={-4}
            y={-2}
            width={8}
            height={9}
            fill="var(--red)"
            stroke="#1C1A17"
            strokeWidth="1.2"
          />
          <text x={-16} y={4} textAnchor="end" className="lbl lbl-centre">
            {centre.label ?? 'To the Centre'}
          </text>
        </g>
      )}
    </g>
  );
});
