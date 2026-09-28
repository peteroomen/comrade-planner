import { useEffect, useMemo, useRef } from 'react';
import { deskReports, status } from '@/sim';
import type { Decision } from '@/sim';
import { useStore } from '@/ui/shell/context';
import type { UiState } from '@/ui/shell/store';
import { OwnReport } from './OwnReport';
import { ReportForm } from './ReportForm';
import { Stamps } from './Stamps';

const reduced = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The desk: returns one at a time, then your own. */
export function Desk({ ui }: { ui: UiState }) {
  const { dispatch } = useStore();
  const reports = useMemo(() => deskReports(ui.game), [ui.game]);
  const st = useMemo(() => status(ui.game), [ui.game]);
  const timer = useRef<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const step = Math.min(ui.deskStep, reports.length);
  const report = reports[step];

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [step]);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  if (!report)
    return (
      <main className="stage desk">
        <OwnReport reports={reports} />
      </main>
    );

  const stamp = (d: Decision) => {
    if (timer.current !== null) return;
    dispatch({ type: 'decide', reportId: report.id, decision: d });
    timer.current = window.setTimeout(
      () => {
        timer.current = null;
        dispatch({ type: 'desk', step: step + 1 });
      },
      reduced() ? 250 : 900,
    );
  };

  return (
    <main className="stage desk" data-testid="desk">
      <nav className="desk-nav" aria-label="Returns">
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous return"
          disabled={step === 0}
          onClick={() => dispatch({ type: 'desk', step: step - 1 })}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path
              d="M13 3 L6 10 L13 17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="desk-count" data-testid="desk-count">
          Return {step + 1} of {reports.length}
          <small>
            {st.inspectorsLeft} inspector{st.inspectorsLeft === 1 ? '' : 's'} free
          </small>
        </p>
        <button
          type="button"
          className="icon-btn"
          aria-label="Next return"
          disabled={report.decision === null}
          onClick={() => dispatch({ type: 'desk', step: step + 1 })}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path
              d="M7 3 L14 10 L7 17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </nav>
      <div className="desk-scroll" ref={scroller}>
        <ReportForm key={report.id} r={report} />
      </div>
      <Stamps current={report.decision} inspectorsLeft={st.inspectorsLeft} onStamp={stamp} />
    </main>
  );
}
