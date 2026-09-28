import { ENTERPRISES } from '@/content/enterprises';
import type { EnterpriseId } from '@/content/ids';
import type { PublicReport } from '@/sim';
import { GOOD_NAME } from '@/ui/map/layout';
import { AuditDoc, EarlierDoc, ManifestDoc, ObserverDoc } from './Documents';

const INPUT_LABEL: Record<EnterpriseId, string> = {
  lesnoy: 'Tractor-weeks in use',
  kolos: 'Tractor-weeks in use',
  stal: 'Ore consumed',
  krasny: 'Steel consumed',
  zarya: 'Steel consumed',
};

const STAMP_WORD = { approve: 'Approved', reject: 'Rejected', audit: 'Audit ordered' } as const;

/** One typewritten quarterly return. Lines type themselves in, one after another. */
export function ReportForm({ r }: { r: PublicReport }) {
  const good = ENTERPRISES[r.enterprise].good;
  const pct = r.quota > 0 ? Math.round((r.reportedOutput / r.quota) * 100) : 0;
  const rows: [string, string][] = [
    ['Quota set', String(r.quota)],
    [`Output reported (${GOOD_NAME[good].toLowerCase()})`, String(r.reportedOutput)],
    ['Share of quota', `${pct}%`],
    [INPUT_LABEL[r.enterprise], String(r.reportedInputs)],
    ['Workers employed', String(r.workers)],
    ['Requested next quarter', String(r.requestNext)],
  ];
  const docs = r.documents;
  return (
    <>
      <article
        className="form"
        data-testid="report-form"
        aria-label={`Return from ${r.enterpriseName}`}
      >
        <p className="form-kicker t-line" style={{ ['--i' as string]: 0 }}>
          Form 7-K &middot; Quarterly return
        </p>
        <h2 className="form-title t-line" style={{ ['--i' as string]: 1 }}>
          {r.enterpriseName}
        </h2>
        <p className="form-line t-line" style={{ ['--i' as string]: 2 }}>
          Quarter {r.quarter} &middot; {r.manager.name}
        </p>
        <p className="form-line form-line-sub t-line" style={{ ['--i' as string]: 2 }}>
          {r.manager.title}
        </p>
        <dl className="form-rows">
          {rows.map(([k, v], i) => (
            <div key={k} className="form-row t-line" style={{ ['--i' as string]: 3 + i }}>
              <dt>{k}</dt>
              <dd className="form-dots" aria-hidden="true" />
              <dd className="form-val">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="form-sign t-line" style={{ ['--i' as string]: 10 }}>
          Signed: <i>{r.manager.name.replace(/^(Comrade|Director)\s+/, '')}</i>
        </p>
        {r.decision && (
          <span
            className={`ink-mark ink-${r.decision}`}
            data-testid="ink-mark"
            aria-label={STAMP_WORD[r.decision]}
          >
            {STAMP_WORD[r.decision]}
          </span>
        )}
      </article>
      <section className="docs" aria-label="Supporting documents">
        <h3 className="docs-title">Supporting documents</h3>
        {docs.manifest && <ManifestDoc m={docs.manifest} />}
        {docs.observerSlip && <ObserverDoc f={docs.observerSlip} />}
        {docs.previousReport && <EarlierDoc r={docs.previousReport} />}
        {docs.audit && <AuditDoc a={docs.audit} />}
        {!docs.observerSlip && !docs.audit && (
          <p className="docs-empty">
            No observer stood here and no audit has come back for this enterprise.
          </p>
        )}
      </section>
    </>
  );
}
