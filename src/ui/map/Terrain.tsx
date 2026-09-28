import { memo } from 'react';
import { GOOD_COLOUR, GOOD_NAME } from './layout';
import type { GoodId } from '@/content/ids';

// The printed sheet: paper, terrain hatching, river, frame and cartouche. Nothing here depends
// on game state except the cartouche text, so it is drawn once and memoised.

export function PaperDefs() {
  return (
    <defs>
      <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1.1 -0.5"
        />
      </filter>
      <filter id="paper-stain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves="3" seed="19" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.55  0 0 0 0 0.38  0 0 0 0 0.15  0 0 0 1.6 -0.72"
        />
      </filter>
      <filter id="slip-shadow" x="-10%" y="-10%" width="130%" height="140%">
        <feDropShadow dx="1" dy="1.6" stdDeviation="1.1" floodColor="#1C1A17" floodOpacity="0.35" />
      </filter>
      <radialGradient id="vignette" gradientUnits="userSpaceOnUse" cx="195" cy="300" r="520">
        <stop offset="52%" stopColor="#8a6a2c" stopOpacity="0" />
        <stop offset="100%" stopColor="#6b4a17" stopOpacity="0.38" />
      </radialGradient>
      <linearGradient id="crease-v" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#3a2c12" stopOpacity="0" />
        <stop offset="0.46" stopColor="#3a2c12" stopOpacity="0.07" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.3" />
        <stop offset="0.54" stopColor="#3a2c12" stopOpacity="0.09" />
        <stop offset="1" stopColor="#3a2c12" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="crease-h" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#3a2c12" stopOpacity="0" />
        <stop offset="0.46" stopColor="#3a2c12" stopOpacity="0.07" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.3" />
        <stop offset="0.54" stopColor="#3a2c12" stopOpacity="0.09" />
        <stop offset="1" stopColor="#3a2c12" stopOpacity="0" />
      </linearGradient>
      <pattern id="hatch-forest" width="9" height="9" patternUnits="userSpaceOnUse">
        <path
          d="M4.5 8 V4.2 M2.2 5.6 L4.5 2 L6.8 5.6"
          fill="none"
          stroke="#1C1A17"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.6"
        />
      </pattern>
      <pattern id="hatch-marsh" width="12" height="9" patternUnits="userSpaceOnUse">
        <path
          d="M1 6.5 H6 M8.5 5.5 V3 M7.2 4.2 L8.5 2.4 L9.8 4.2"
          fill="none"
          stroke="#1C1A17"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.5"
        />
      </pattern>
      <pattern id="hatch-field" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="0.55" fill="#1C1A17" opacity="0.32" />
      </pattern>
      <pattern
        id="hatch-smoke"
        width="3.4"
        height="3.4"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="3.4" stroke="#1C1A17" strokeWidth="0.9" />
      </pattern>
      <path
        id="river-path"
        d="M389 92 C344 128 384 188 332 230 C286 268 250 336 262 398 C272 450 204 482 172 532 C154 560 134 588 124 602"
      />
    </defs>
  );
}

const FOREST = 'M8 62 C40 48 92 54 118 78 C136 98 128 142 104 166 C80 186 34 180 12 158 Z';
const MARSH =
  'M64 420 C92 404 150 410 196 426 C224 440 214 486 176 500 C132 512 84 500 66 474 C54 456 52 432 64 420 Z';

export interface TerrainProps {
  quarter: number;
  season: string;
}

const TICKS = Array.from({ length: 12 }, (_, i) => 36 + i * 30);
const VTICKS = Array.from({ length: 18 }, (_, i) => 36 + i * 30);

export const Terrain = memo(function Terrain({ quarter, season }: TerrainProps) {
  return (
    <g aria-hidden="true">
      {/* the paper runs past the printed area so tall screens show margin, not a gap */}
      <rect x="-200" y="-320" width="790" height="1240" fill="var(--paper)" />
      <rect x="-200" y="-320" width="790" height="1240" filter="url(#paper-stain)" opacity="0.5" />
      <rect x="-200" y="-320" width="790" height="1240" filter="url(#paper-grain)" opacity="0.55" />

      {/* fields around the farms */}
      <g fill="url(#hatch-field)" stroke="#1C1A17" strokeWidth="0.5" strokeOpacity="0.4">
        <rect x="16" y="88" width="30" height="20" />
        <rect x="52" y="184" width="22" height="16" transform="rotate(-6 60 190)" />
        <rect x="316" y="410" width="34" height="18" />
        <rect x="354" y="344" width="22" height="30" />
        <rect x="302" y="364" width="28" height="16" transform="rotate(4 316 372)" />
      </g>

      {/* forest and marsh */}
      <path
        d={FOREST}
        fill="url(#hatch-forest)"
        stroke="#1C1A17"
        strokeWidth="0.7"
        strokeDasharray="2 3"
        strokeOpacity="0.6"
      />
      <path
        d={MARSH}
        fill="url(#hatch-marsh)"
        stroke="#1C1A17"
        strokeWidth="0.7"
        strokeDasharray="1 3"
        strokeOpacity="0.55"
      />
      <text x="24" y="76" className="map-note">
        pine forest
      </text>
      <text x="96" y="472" className="map-note">
        marsh
      </text>

      {/* river */}
      <use
        href="#river-path"
        fill="none"
        stroke="#1C1A17"
        strokeWidth="6.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <use
        href="#river-path"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <use
        href="#river-path"
        fill="none"
        stroke="#1C1A17"
        strokeWidth="0.6"
        strokeDasharray="5 4"
        opacity="0.5"
      />
      <text className="map-note" dy="-5">
        <textPath href="#river-path" startOffset="8%">
          R. Kovra
        </textPath>
      </text>

      {/* frame with graduation ticks */}
      <rect x="6" y="6" width="378" height="588" fill="none" stroke="#1C1A17" strokeWidth="2.2" />
      <rect x="11" y="11" width="368" height="578" fill="none" stroke="#1C1A17" strokeWidth="0.7" />
      <g stroke="#1C1A17" strokeWidth="0.8">
        {TICKS.map((x) => (
          <g key={`h${x}`}>
            <line x1={x} y1="6" x2={x} y2="11" />
            <line x1={x} y1="589" x2={x} y2="594" />
          </g>
        ))}
        {VTICKS.map((y) => (
          <g key={`v${y}`}>
            <line x1="6" y1={y} x2="11" y2={y} />
            <line x1="379" y1={y} x2="384" y2={y} />
          </g>
        ))}
      </g>

      {/* cartouche */}
      <g transform="translate(258 16)">
        <rect
          width="118"
          height="50"
          fill="var(--paper)"
          fillOpacity="0.85"
          stroke="#1C1A17"
          strokeWidth="1.4"
        />
        <rect x="3" y="3" width="112" height="44" fill="none" stroke="#1C1A17" strokeWidth="0.6" />
        <text x="59" y="17" textAnchor="middle" className="cart-small">
          Oblast planning map
        </text>
        <text x="59" y="35" textAnchor="middle" className="cart-big">
          Quarter {quarter}
        </text>
        <text x="59" y="44" textAnchor="middle" className="cart-small">
          {season}
        </text>
      </g>

      {/* legend of wagon colours */}
      <g transform="translate(16 522)">
        <rect
          width="118"
          height="64"
          fill="var(--paper)"
          fillOpacity="0.85"
          stroke="#1C1A17"
          strokeWidth="1"
        />
        <text x="6" y="12" className="cart-small">
          Wagons carry
        </text>
        {(['grain', 'steel', 'tractors', 'consumer'] as GoodId[]).map((g, i) => (
          <g key={g} transform={`translate(8 ${20 + i * 11})`}>
            <rect
              width="11"
              height="6"
              rx="1"
              fill={GOOD_COLOUR[g]}
              stroke="#1C1A17"
              strokeWidth="0.7"
            />
            <text x="16" y="6.4" className="legend-text">
              {GOOD_NAME[g]}
            </text>
          </g>
        ))}
      </g>

      {/* compass */}
      <g transform="translate(352 556)" stroke="#1C1A17" fill="none">
        <circle r="15" strokeWidth="0.8" />
        <path d="M0 -20 L4 0 L0 20 L-4 0 Z" fill="#1C1A17" strokeWidth="0.6" />
        <path d="M-20 0 L0 -3 L20 0 L0 3 Z" fill="var(--paper)" strokeWidth="0.6" />
        <text x="0" y="-23" textAnchor="middle" className="cart-small" fill="#1C1A17" stroke="none">
          N
        </text>
      </g>
    </g>
  );
});

const TINT: Record<string, string> = {
  spring: '#9DB37A',
  summer: '#DDB85C',
  autumn: '#C97B3B',
  winter: '#8FA4B8',
};

/** Vignette, fold creases and the seasonal tint: drawn last, never catches taps. */
export const PaperOverlay = memo(function PaperOverlay({ seasonKey }: { seasonKey: string }) {
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect
        width="390"
        height="600"
        fill={TINT[seasonKey] ?? TINT.spring}
        opacity="0.11"
        style={{ mixBlendMode: 'multiply' }}
      />
      <rect width="390" height="600" fill="url(#vignette)" />
      <rect x="186" y="0" width="18" height="600" fill="url(#crease-v)" />
      <rect x="0" y="291" width="390" height="18" fill="url(#crease-h)" />
    </g>
  );
});
