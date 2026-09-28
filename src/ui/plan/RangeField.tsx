import { useId } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  /** Small print under the slider, e.g. the standard figure. */
  note?: string;
}

/** A labelled slider with a large touch target and the value written out beside it. */
export function RangeField({ label, value, min, max, step, onChange, format, note }: Props) {
  const id = useId();
  const shown = format ? format(value) : String(value);
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{shown}</output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={shown}
      />
      {note && <p className="field-note">{note}</p>}
    </div>
  );
}
