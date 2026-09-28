import { status } from '@/sim';
import { useStore } from './context';
import type { UiState } from './store';
import { Star } from './Title';

const ENDINGS: Record<string, { head: string; body: string }> = {
  'people-low': {
    head: 'The queues went home',
    body: 'The shops emptied, then the factories, then the streets. When the Centre sent an inspector, he found stoves cold and doors open. You are reassigned to a forestry office a very long way north.',
  },
  'people-high': {
    head: 'Beloved, and therefore suspect',
    body: 'The people adore you. They sing under your window and write letters of thanks. The Centre reads the letters, and asks why you have so much to be thanked for.',
  },
  'apparatus-low': {
    head: 'Nobody signed anything',
    body: 'Every manager, clerk and inspector stopped answering you. Orders went out and nothing came back. One morning you find the office door locked from the outside.',
  },
  'apparatus-high': {
    head: 'The Apparatus has a new planner',
    body: 'You approved everything, so the officials came to run everything. Your signature is still on the forms. Your opinion is no longer required.',
  },
  'centre-low': {
    head: 'The Centre withdraws its confidence',
    body: 'The steel stopped, the inspectors stopped, and finally the telephone stopped. A short cable arrives: your successor is on the morning train.',
  },
  'centre-high': {
    head: 'Summoned to the Centre',
    body: 'Your figures were so splendid that the Centre wishes to learn from you personally. A car waits at the station. It will not be a long conversation.',
  },
  'shadow-low': {
    head: 'The lights went out at night',
    body: 'A crackdown emptied the back roads and the back rooms. No one trades, no one talks, no one trusts you. Even the informants have gone quiet.',
  },
  'shadow-high': {
    head: 'The province runs after dark',
    body: 'The real economy moved to the night trucks and the official one became a rumour. Nobody bothered to overthrow you. They simply stopped consulting the plan.',
  },
};

export function Epitaph({ ui }: { ui: UiState }) {
  const { dispatch } = useStore();
  const st = status(ui.game);
  const cause = st.ended?.cause ?? 'people-low';
  const quarters = st.ended?.quarter ?? st.quarter;
  const e = ENDINGS[cause] ?? ENDINGS['people-low']!;
  return (
    <main className="stage screen epitaph" data-testid="epitaph" aria-label="The end">
      <div className="paper-sheet epitaph-card">
        <Star size={46} />
        <p className="kicker">Your service ends</p>
        <h1 className="sheet-title">{e.head}</h1>
        <p className="epitaph-body">{e.body}</p>
        <p className="epitaph-served">
          Quarters served: <b>{quarters}</b>
        </p>
        <button
          type="button"
          className="btn btn-red btn-big"
          onClick={() => dispatch({ type: 'restart', seed: (ui.seed * 7 + 13) % 100000 })}
          data-testid="restart"
        >
          Start again
        </button>
      </div>
    </main>
  );
}
