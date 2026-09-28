import type { Decision } from '@/sim';

interface Props {
  current: Decision | null;
  inspectorsLeft: number;
  onStamp: (d: Decision) => void;
}

/** Three rubber stamps. Audit needs a free inspector. */
export function Stamps({ current, inspectorsLeft, onStamp }: Props) {
  const noAudit = inspectorsLeft <= 0 && current !== 'audit';
  return (
    <div className="stamps" role="group" aria-label="Decide this return">
      <button
        type="button"
        className={`stamp stamp-approve ${current === 'approve' ? 'stamp-on' : ''}`}
        onClick={() => onStamp('approve')}
        data-testid="stamp-approve"
      >
        Approve
      </button>
      <button
        type="button"
        className={`stamp stamp-reject ${current === 'reject' ? 'stamp-on' : ''}`}
        onClick={() => onStamp('reject')}
        data-testid="stamp-reject"
      >
        Reject
      </button>
      <button
        type="button"
        className={`stamp stamp-audit ${current === 'audit' ? 'stamp-on' : ''}`}
        onClick={() => onStamp('audit')}
        disabled={noAudit}
        data-testid="stamp-audit"
        aria-label={`Audit, ${inspectorsLeft} inspector${inspectorsLeft === 1 ? '' : 's'} free`}
      >
        Audit
        <small>{inspectorsLeft} free</small>
      </button>
    </div>
  );
}
