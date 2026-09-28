import { OBSERVERS_MAX, TICKS_PER_QUARTER } from '@/ui/shell/limits';
import { useStore } from '@/ui/shell/context';
import type { UiState } from '@/ui/shell/store';

export function PlanFooter({ ui }: { ui: UiState }) {
  const { dispatch } = useStore();
  const n = ui.draft.observers.length;
  return (
    <footer className="footer footer-plan">
      <p className="footer-hint" id="plan-hint">
        Tap a star or a town to set its plan.
        <span className="observer-count" aria-label={`${n} of ${OBSERVERS_MAX} observers posted`}>
          {Array.from({ length: OBSERVERS_MAX }, (_, i) => (
            <i key={i} className={i < n ? 'slot slot-on' : 'slot'} />
          ))}
          Observers
        </span>
      </p>
      <button
        type="button"
        className="btn btn-red btn-begin"
        onClick={() => dispatch({ type: 'begin' })}
        aria-describedby="plan-hint"
        data-testid="begin"
      >
        Begin quarter
      </button>
    </footer>
  );
}

export function LiveFooter({ ui }: { ui: UiState }) {
  const { dispatch } = useStore();
  const week = ui.game.week;
  return (
    <footer className="footer footer-live">
      <button
        type="button"
        className="btn btn-outline btn-ctl"
        onClick={() => dispatch({ type: 'pause' })}
        aria-pressed={ui.paused}
        data-testid="pause"
      >
        {ui.paused ? 'Resume' : 'Pause'}
      </button>
      <ol className="weeks" aria-label={`Week ${week} of ${TICKS_PER_QUARTER}`}>
        {Array.from({ length: TICKS_PER_QUARTER }, (_, i) => (
          <li key={i} className={i < week ? 'wk wk-done' : 'wk'} />
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-outline btn-ctl"
        onClick={() => dispatch({ type: 'speed' })}
        aria-pressed={ui.speed === 2}
        aria-label="Double speed"
        data-testid="speed"
      >
        2&times;
      </button>
    </footer>
  );
}
