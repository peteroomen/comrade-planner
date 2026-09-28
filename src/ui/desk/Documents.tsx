import type { AuditView, Manifest, ObserverFinding, PublicReport } from '@/sim';
import { GOOD_NAME } from '@/ui/map/layout';
import type { GoodId } from '@/content/ids';

const GOODS: GoodId[] = ['grain', 'steel', 'tractors', 'consumer'];
const n = (v: number): string => String(Math.round(v));

function Doc({
  title,
  sub,
  tilt,
  children,
  testId,
}: {
  title: string;
  sub?: string;
  tilt: number;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <article className="doc" style={{ transform: `rotate(${tilt}deg)` }} data-testid={testId}>
      <span className="clip-icon" aria-hidden="true" />
      <h3 className="doc-title">{title}</h3>
      {sub && <p className="doc-sub">{sub}</p>}
      {children}
    </article>
  );
}

function Row({ k, v, emph }: { k: string; v: string; emph?: boolean }) {
  return (
    <div className={`doc-row ${emph ? 'doc-emph' : ''}`}>
      <span>{k}</span>
      <span className="doc-dots" aria-hidden="true" />
      <b>{v}</b>
    </div>
  );
}

export function ManifestDoc({ m }: { m: Manifest }) {
  const out = GOODS.filter((g) => m.departedTotal[g] > 0);
  const inn = GOODS.filter((g) => m.arrivedTotal[g] > 0);
  const all = [
    ...m.departures.map((d) => ({ ...d, dir: 'out' as const })),
    ...m.arrivals.map((d) => ({ ...d, dir: 'in' as const })),
  ].sort((a, b) => a.tick - b.tick);
  return (
    <Doc
      title="Railway manifest"
      sub={`${m.targetName}, quarter ${m.quarter}. Kept by the railway.`}
      tilt={-0.7}
      testId="doc-manifest"
    >
      <p className="doc-head">Carried away from the gate</p>
      {out.length === 0 ? (
        <p className="doc-none">No wagons left here.</p>
      ) : (
        out.map((g) => <Row key={g} k={GOOD_NAME[g]} v={n(m.departedTotal[g])} emph />)
      )}
      <p className="doc-head">Delivered to the gate</p>
      {inn.length === 0 ? (
        <p className="doc-none">No wagons arrived here.</p>
      ) : (
        inn.map((g) => <Row key={g} k={GOOD_NAME[g]} v={n(m.arrivedTotal[g])} emph />)
      )}
      {all.length > 0 && (
        <details className="doc-details">
          <summary>All {all.length} consignments</summary>
          <table className="doc-table">
            <thead>
              <tr>
                <th scope="col">Wk</th>
                <th scope="col">Route</th>
                <th scope="col">Cargo</th>
              </tr>
            </thead>
            <tbody>
              {all.map((e, i) => (
                <tr key={i}>
                  <td>{e.week}</td>
                  <td>{e.dir === 'out' ? `to ${e.to}` : `from ${e.from}`}</td>
                  <td>
                    {n(e.qty)} {GOOD_NAME[e.good].toLowerCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <p className="doc-fine">
        Rail only: stock on hand and anything moved by road is not on this record.
      </p>
    </Doc>
  );
}

export function ObserverDoc({ f }: { f: ObserverFinding }) {
  const sum = (s: ObserverFinding['shippedOut']) => s.grain + s.steel + s.tractors + s.consumer;
  const stockTotal = f.stock.grain + f.stock.steel + f.stock.tractors + f.stock.consumer;
  return (
    <Doc
      title="Observer's slip"
      sub={`${f.targetName}, quarter ${f.quarter}. Written on the spot.`}
      tilt={0.8}
      testId="doc-observer"
    >
      <Row k="Actually produced" v={n(f.output)} emph />
      <Row k="Sent out by rail" v={n(sum(f.shippedOut))} />
      <Row k="Received by rail" v={n(sum(f.shippedIn))} />
      <Row k="In store at quarter end" v={n(stockTotal)} />
    </Doc>
  );
}

export function EarlierDoc({ r }: { r: NonNullable<PublicReport['documents']['previousReport']> }) {
  return (
    <Doc
      title="Earlier return"
      sub={`Quarter ${r.quarter}, as filed.`}
      tilt={-0.5}
      testId="doc-earlier"
    >
      <Row k="Output reported" v={n(r.reportedOutput)} />
      <Row k="Inputs consumed" v={n(r.reportedInputs)} />
    </Doc>
  );
}

export function AuditDoc({ a }: { a: AuditView }) {
  const f = a.finding;
  if (!f) return null;
  return (
    <Doc
      title="Audit finding"
      sub={`Inspector's report on the quarter ${a.quarter} return.`}
      tilt={0.6}
      testId="doc-audit"
    >
      <Row k="Output found" v={`${n(f.output)} (filed ${n(f.reportedOutput)})`} emph />
      <Row k="Inputs found" v={`${n(f.inputs)} (filed ${n(f.reportedInputs)})`} />
      <p className={`doc-verdict ${f.padded ? 'doc-bad' : ''}`}>
        {f.padded ? 'Figures were padded.' : 'Nothing amiss found.'}
      </p>
    </Doc>
  );
}
