import { useState } from 'react';
import type { PublicReport } from '@/sim';
import { RangeField } from '@/ui/plan/RangeField';
import { useStore } from '@/ui/shell/context';
import * as L from '@/ui/shell/limits';

const WORD = { approve: 'approved', reject: 'rejected', audit: 'sent for audit' } as const;

/** Your own return to the Centre: the figures you approved, and how far you are willing to stretch them. */
export function OwnReport({ reports }: { reports: PublicReport[] }) {
  const { dispatch } = useStore();
  const [inflate, setInflate] = useState<number>(L.OWN_INFLATE_MIN);
  const pct = Math.round((inflate - 1) * 100);
  return (
    <div className="desk-scroll" data-testid="own-report">
      <article className="form form-own">
        <p className="form-kicker">Form 1-P &middot; To the Centre</p>
        <h2 className="form-title">Your return</h2>
        <p className="form-line">What the province will be said to have produced.</p>
        <table className="own-table">
          <thead>
            <tr>
              <th scope="col">Enterprise</th>
              <th scope="col">Reported</th>
              <th scope="col">Sent up</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const cut = r.decision === 'reject' ? L.REJECT_HAIRCUT : 1;
              return (
                <tr key={r.id}>
                  <th scope="row">
                    {r.enterpriseName}
                    <small>{r.decision ? WORD[r.decision] : 'unhandled'}</small>
                  </th>
                  <td>{r.reportedOutput}</td>
                  <td>{Math.round(r.reportedOutput * cut * inflate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
      <section className="own-slider">
        <RangeField
          label="Inflate the figures you send up"
          value={inflate}
          min={L.OWN_INFLATE_MIN}
          max={L.OWN_INFLATE_MAX}
          step={0.01}
          format={() => (pct === 0 ? 'Honest' : `+${pct}%`)}
          onChange={setInflate}
          note="Padded figures please the Centre now. They also raise next year's targets, and the Centre sometimes checks."
        />
      </section>
      <div className="own-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => dispatch({ type: 'desk', step: Math.max(0, reports.length - 1) })}
        >
          Back to the returns
        </button>
        <button
          type="button"
          className="btn btn-red"
          onClick={() => dispatch({ type: 'file', inflate })}
          data-testid="send-up"
        >
          Send to the Centre
        </button>
      </div>
    </div>
  );
}
