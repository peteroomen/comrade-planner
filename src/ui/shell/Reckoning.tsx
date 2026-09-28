import { useEffect, useMemo, useState } from 'react';
import { reckoning } from '@/sim';
import { Bars } from './Bars';
import { useStore } from './context';
import type { UiState } from './store';

/** The quarter's verdict: bars slide from where they were to where they are now. */
export function Reckoning({ ui }: { ui: UiState }) {
  const { dispatch } = useStore();
  const r = useMemo(() => reckoning(ui.game), [ui.game]);
  const [after, setAfter] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setAfter(true), 500);
    return () => window.clearTimeout(t);
  }, []);

  if (!r) return null;
  const ended = ui.game.phase === 'ended';
  const values = after ? r.barsAfter : r.barsBefore;
  return (
    <main
      className="stage screen reckoning"
      data-testid="reckoning"
      aria-label={`Quarter ${r.quarter} reckoning`}
    >
      <div className="paper-sheet">
        <p className="kicker">Quarter {r.quarter}</p>
        <h1 className="sheet-title">Reckoning</h1>
        <div className="reckon-bars">
          <Bars values={values} numbers was={r.barsBefore} />
        </div>
        <ul className="reckon-lines">
          {r.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-red btn-big"
          onClick={() => dispatch({ type: 'continue' })}
          data-testid="continue"
        >
          {ended ? 'Face the verdict' : `Plan quarter ${r.quarter + 1}`}
        </button>
      </div>
    </main>
  );
}
