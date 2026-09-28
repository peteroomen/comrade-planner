import type { LocationRef } from '@/content/ids';
import type { MapPin, ObserverFinding, VisibleMap } from '@/sim';
import { Footprints, NightTrucks, Queues, Smoke, Trains } from './Live';
import { ObserverSlips, TipPins } from './Pins';
import { Enterprises, Towns } from './Places';
import { Rails } from './Rails';
import { PaperDefs, PaperOverlay, Terrain } from './Terrain';

export interface MapSceneProps {
  map: VisibleMap;
  /** Animations play only while the quarter is running. */
  running: boolean;
  /** Places can be tapped (plan phase). */
  interactive: boolean;
  selected: LocationRef | null;
  observers: LocationRef[];
  findings: ObserverFinding[];
  pins: MapPin[];
  onPick: (ref: LocationRef) => void;
  onBackground: () => void;
}

export function MapScene(p: MapSceneProps) {
  const { map } = p;
  const hit = { interactive: p.interactive, selected: p.selected, onPick: p.onPick };
  return (
    <svg
      className={`map-svg ${p.running ? 'running' : ''}`}
      viewBox={`0 0 ${map.width} ${map.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={`Map of the province, quarter ${map.quarter}, ${map.season}`}
      onClick={p.onBackground}
      data-testid="map"
    >
      <PaperDefs />
      <Terrain quarter={map.quarter} season={map.season} />
      <NightTrucks level={map.nightTraffic} roads={map.roads} />
      <Rails stations={map.stations} rails={map.rails} />
      <Footprints level={map.emigrants} />
      <Towns items={map.towns} observers={p.observers} hit={hit} />
      <Enterprises items={map.enterprises} observers={p.observers} hit={hit} />
      <Queues towns={map.towns} />
      <Smoke items={map.enterprises} />
      <Trains trains={map.trains} />
      <PaperOverlay seasonKey={map.season} />
      <TipPins pins={map.pins} />
      {p.observers.length > 0 && (
        <ObserverSlips
          targets={p.observers}
          findings={p.findings}
          phase={map.phase === 'plan' ? 'plan' : 'quarter'}
        />
      )}
    </svg>
  );
}
