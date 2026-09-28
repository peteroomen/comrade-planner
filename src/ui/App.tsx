import { useMemo } from 'react';
import { Desk } from './desk/Desk';
import { MapScreen } from './map/MapScreen';
import { StoreContext } from './shell/context';
import { Epitaph } from './shell/Epitaph';
import { Header } from './shell/Header';
import { Reckoning } from './shell/Reckoning';
import { createStore, useUi } from './shell/store';
import type { UiState } from './shell/store';
import { Title } from './shell/Title';
import './styles/base.css';
import './styles/shell.css';
import './styles/map.css';
import './styles/plan.css';
import './styles/cards.css';
import './styles/desk.css';

function seedFromUrl(): number {
  const q = new URLSearchParams(window.location.search).get('seed');
  const n = q === null ? NaN : Number(q);
  return Number.isFinite(n) ? n : Math.floor(Date.now() % 100000);
}

type Kind = 'title' | 'reckoning' | 'epitaph' | 'desk' | 'map';

function kindOf(ui: UiState): Kind {
  const { game } = ui;
  if (!ui.started) return 'title';
  if (game.phase === 'ended') return ui.reckoningSeen ? 'epitaph' : 'reckoning';
  if (game.phase === 'plan' && !ui.reckoningSeen) return 'reckoning';
  return game.phase === 'desk' ? 'desk' : 'map';
}

function Screen({ ui, kind }: { ui: UiState; kind: Kind }) {
  switch (kind) {
    case 'title':
      return <Title />;
    case 'reckoning':
      return <Reckoning ui={ui} />;
    case 'epitaph':
      return <Epitaph ui={ui} />;
    case 'desk':
      return <Desk ui={ui} />;
    case 'map':
      return <MapScreen ui={ui} />;
  }
}

export function App() {
  const store = useMemo(() => createStore(seedFromUrl()), []);
  const ui = useUi(store);
  const kind = kindOf(ui);
  return (
    <StoreContext.Provider value={store}>
      <div className="app" data-screen={kind}>
        {(kind === 'map' || kind === 'desk') && <Header ui={ui} />}
        <Screen ui={ui} kind={kind} />
      </div>
    </StoreContext.Provider>
  );
}
