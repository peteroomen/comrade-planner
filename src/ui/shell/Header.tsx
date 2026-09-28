import { useMemo } from 'react';
import { activeCard, bars, visibleMap } from '@/sim';
import { Bars } from './Bars';
import type { BarDots } from './Bars';
import type { UiState } from './store';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Bars across the top, dots over the ones a card choice would move, and the phase line. */
export function Header({ ui, showBars = true }: { ui: UiState; showBars?: boolean }) {
  const { game } = ui;
  const values = useMemo(() => bars(game), [game]);
  const card = useMemo(() => activeCard(game), [game]);
  const season = useMemo(() => visibleMap(game).season, [game]);

  // Leaning on a card shows the bars that choice would move; otherwise, every bar either could.
  const dots: BarDots = {};
  if (card) {
    if (ui.lean) for (const b of card[ui.lean].hints) dots[b] = 'lean';
    else for (const b of [...card.left.hints, ...card.right.hints]) dots[b] = 'hint';
  }

  let phase: string;
  let detail: string;
  switch (game.phase) {
    case 'plan':
      phase = 'Planning';
      detail = `Quarter ${game.quarter} · ${cap(season)}`;
      break;
    case 'quarter':
      phase = `Week ${game.week} of 13`;
      detail = `Quarter ${game.quarter} · ${cap(season)}`;
      break;
    case 'desk':
      phase = 'The desk';
      detail = `Quarter ${game.quarter} returns`;
      break;
    default:
      phase = 'Concluded';
      detail = `Quarter ${game.quarter}`;
  }

  return (
    <header className="header">
      {showBars && <Bars values={values} dots={dots} />}
      <p className="phase-line">
        <span className="phase-name" data-testid="phase">
          {phase}
        </span>
        <span className="phase-detail">{detail}</span>
      </p>
    </header>
  );
}
