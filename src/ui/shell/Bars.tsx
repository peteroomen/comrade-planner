import { BAR_IDS } from '@/content/ids';
import type { BarId } from '@/content/ids';
import type { Bars as BarValues } from '@/sim';

export const BAR_LABELS: Record<BarId, string> = {
  people: 'People',
  apparatus: 'Apparatus',
  centre: 'Centre',
  shadow: 'Shadow',
};

export type BarDots = Partial<Record<BarId, 'hint' | 'lean'>>;

interface Props {
  values: BarValues;
  dots?: BarDots;
  /** Show the numbers (reckoning) instead of the bare gauges. */
  numbers?: boolean;
  /** With `numbers`: where each bar stood at the start, shown as "was 50". */
  was?: BarValues;
}

/** The four bars. Both ends are deadly, so both ends are hatched in red. */
export function Bars({ values, dots = {}, numbers = false, was }: Props) {
  return (
    <ul className="bars" aria-label="The four bars">
      {BAR_IDS.map((id) => {
        const v = Math.max(0, Math.min(100, values[id]));
        const danger = v < 12 || v > 88;
        const dot = dots[id];
        return (
          <li key={id} className="bar">
            <span
              className={`bar-dot ${dot ? `bar-dot-${dot}` : ''}`}
              aria-hidden="true"
              data-testid={dot ? `dot-${id}` : undefined}
            />
            <span className="bar-label">{BAR_LABELS[id]}</span>
            <div
              className={`bar-track ${danger ? 'bar-danger' : ''}`}
              role="meter"
              aria-label={BAR_LABELS[id]}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(v)}
            >
              <span className="bar-fill" style={{ width: `${v}%` }} />
              <span className="bar-mid" />
            </div>
            {numbers && (
              <span className="bar-num">
                <b>{Math.round(v)}</b>
                {was && <small>was {Math.round(was[id])}</small>}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
