import { useEffect, useMemo, useRef } from 'react';
import type { LocationRef } from '@/content/ids';
import { activeCard, currentPlan, observerFindings, visibleMap } from '@/sim';
import { CardView } from '@/ui/cards/CardView';
import { PlanSheet } from '@/ui/plan/PlanSheet';
import { useStore } from '@/ui/shell/context';
import type { UiState } from '@/ui/shell/store';
import { LiveFooter, PlanFooter } from './Controls';
import { MapScene } from './MapScene';
import { useQuarterRunner } from './runner';

const MAP_W = 390;
const MAP_H = 600;

/** Where the sheet leaves room for the map: the pan that keeps the picked place in view. */
function useSheetPan(
  sel: LocationRef | null,
  places: { ref: LocationRef; x: number; y: number }[],
) {
  const area = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const panEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (px: number) => {
      if (panEl.current) panEl.current.style.transform = `translateY(${-px}px)`;
    };
    if (!sel) {
      apply(0);
      return;
    }
    const measure = () => {
      const a = area.current;
      const s = sheet.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const scale = Math.min(r.width / MAP_W, r.height / MAP_H);
      const top = (r.height - MAP_H * scale) / 2;
      const p = places.find((x) => x.ref.type === sel.type && x.ref.id === sel.id);
      if (!p) return;
      const sheetH = s ? s.getBoundingClientRect().height : r.height * 0.5;
      const visible = r.height - sheetH;
      const y = top + p.y * scale;
      apply(Math.max(0, y - visible * 0.45));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (area.current) ro.observe(area.current);
    if (sheet.current) ro.observe(sheet.current);
    return () => ro.disconnect();
  }, [sel, places]);

  return { area, sheet, panEl };
}

export function MapScreen({ ui }: { ui: UiState }) {
  const store = useStore();
  const { game } = ui;
  useQuarterRunner(store, ui);

  const map = useMemo(() => visibleMap(game), [game]);
  const findings = useMemo(() => observerFindings(game), [game]);
  const card = useMemo(() => activeCard(game), [game]);
  const planning = game.phase === 'plan';
  const observers = planning ? ui.draft.observers : currentPlan(game).observers;

  const places = useMemo(
    () => [
      ...map.enterprises.map((e) => ({
        ref: { type: 'enterprise', id: e.id } as LocationRef,
        x: e.x,
        y: e.y,
      })),
      ...map.towns.map((t) => ({ ref: { type: 'town', id: t.id } as LocationRef, x: t.x, y: t.y })),
    ],
    [map],
  );
  const sel = planning ? ui.sheet : null;
  const { area, sheet, panEl } = useSheetPan(sel, places);

  return (
    <main className="stage map-stage">
      <div className="map-area" ref={area}>
        <div className="map-pan" ref={panEl}>
          <MapScene
            map={map}
            running={game.phase === 'quarter' && !ui.paused && !card}
            interactive={planning}
            selected={sel}
            observers={observers}
            findings={findings}
            pins={map.pins}
            onPick={(ref) => store.dispatch({ type: 'sheet', ref })}
            onBackground={() => sel && store.dispatch({ type: 'sheet', ref: null })}
          />
        </div>
        {sel && <PlanSheet ref={sheet} target={sel} draft={ui.draft} />}
        {card && <CardView key={card.cardId} card={card} />}
      </div>
      {planning ? <PlanFooter ui={ui} /> : <LiveFooter ui={ui} />}
    </main>
  );
}
