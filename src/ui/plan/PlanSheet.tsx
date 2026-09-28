import { forwardRef } from 'react';
import { CHARACTER_BY_ID } from '@/content/characters';
import { ENTERPRISES } from '@/content/enterprises';
import { TOWN_IDS } from '@/content/ids';
import type { EnterpriseId, LocationRef, TownId } from '@/content/ids';
import { TOWNS } from '@/content/towns';
import type { Plan } from '@/sim';
import { useStore } from '@/ui/shell/context';
import * as L from '@/ui/shell/limits';
import { RangeField } from './RangeField';

interface SheetProps {
  target: LocationRef;
  draft: Plan;
}

const money = (v: number): string => `${v.toFixed(v % 1 === 0 ? 0 : 1)} R`;

function GrainSplit({ draft }: { draft: Plan }) {
  const { dispatch } = useStore();
  const sum = TOWN_IDS.reduce((s, t) => s + draft.grainAllocation[t], 0) || 1;
  return (
    <section className="sheet-section" aria-label="Grain allocation">
      <h3>Where the grain goes</h3>
      {TOWN_IDS.map((t: TownId) => (
        <RangeField
          key={t}
          label={TOWNS[t].name}
          value={Math.round(draft.grainAllocation[t] * 100)}
          min={0}
          max={100}
          step={5}
          format={() => `${Math.round((draft.grainAllocation[t] / sum) * 100)}%`}
          onChange={(v) =>
            dispatch({
              type: 'plan',
              patch: (p) => ({ ...p, grainAllocation: { ...p.grainAllocation, [t]: v / 100 } }),
            })
          }
        />
      ))}
      <p className="field-note">Shares are rebalanced to add up to 100%.</p>
    </section>
  );
}

function SteelSplit({ draft }: { draft: Plan }) {
  const { dispatch } = useStore();
  const k = Math.round(draft.steelKrasnyShare * 100);
  return (
    <section className="sheet-section" aria-label="Steel allocation">
      <h3>Where the steel goes</h3>
      <RangeField
        label="Share to Krasny Tractor Works"
        value={k}
        min={0}
        max={100}
        step={5}
        format={(v) => `${v}% / ${100 - v}% Zarya`}
        onChange={(v) =>
          dispatch({ type: 'plan', patch: (p) => ({ ...p, steelKrasnyShare: v / 100 }) })
        }
        note="Covers Stal's output and the steel the Centre sends. The rest goes to Zarya Textile Works."
      />
    </section>
  );
}

function ObserverToggle({ target, draft }: SheetProps) {
  const { dispatch } = useStore();
  const posted = draft.observers.some((o) => o.type === target.type && o.id === target.id);
  const full = !posted && draft.observers.length >= L.OBSERVERS_MAX;
  return (
    <section className="sheet-section" aria-label="Observer">
      <h3>Observer</h3>
      <button
        type="button"
        className={`btn ${posted ? 'btn-ink' : 'btn-outline'}`}
        aria-disabled={full}
        disabled={full}
        onClick={() => dispatch({ type: 'observer', ref: target })}
        data-testid="observer-toggle"
      >
        {posted
          ? 'Recall the observer'
          : full
            ? 'Both observers are posted'
            : 'Post an observer here'}
      </button>
      <p className="field-note">
        Observers write down the true figures here for the quarter ({draft.observers.length} of{' '}
        {L.OBSERVERS_MAX} posted). Their slip reaches your desk when the quarter ends.
      </p>
    </section>
  );
}

function EnterpriseControls({ id, draft }: { id: EnterpriseId; draft: Plan }) {
  const { dispatch } = useStore();
  const def = ENTERPRISES[id];
  const mgr = CHARACTER_BY_ID[def.managerId];
  const min = Math.round(def.baseQuota * L.QUOTA_MIN_SHARE);
  const max = Math.round(def.baseQuota * L.QUOTA_MAX_SHARE);
  const step = def.baseQuota >= 100 ? 10 : 1;
  return (
    <>
      <p className="sheet-sub">{mgr ? `${mgr.name}, ${mgr.title}` : def.name}</p>
      <section className="sheet-section" aria-label="Quota and wage">
        <RangeField
          label="Quarterly quota"
          value={draft.quota[id]}
          min={min}
          max={max}
          step={step}
          onChange={(v) =>
            dispatch({ type: 'plan', patch: (p) => ({ ...p, quota: { ...p.quota, [id]: v } }) })
          }
          note={`Standard quota ${def.baseQuota}. A high quota strains the managers; a low one disappoints the Centre.`}
        />
        <RangeField
          label="Wage per household, per week"
          value={draft.wage[id]}
          min={L.WAGE_MIN}
          max={L.WAGE_MAX}
          step={0.5}
          format={money}
          onChange={(v) =>
            dispatch({ type: 'plan', patch: (p) => ({ ...p, wage: { ...p.wage, [id]: v } }) })
          }
          note={`A fair wage is about ${L.WAGE_FAIR} R.`}
        />
      </section>
      <ObserverToggle target={{ type: 'enterprise', id }} draft={draft} />
      {def.good === 'grain' && <GrainSplit draft={draft} />}
      {(id === 'stal' || id === 'krasny' || id === 'zarya') && <SteelSplit draft={draft} />}
      {id === 'krasny' && (
        <p className="field-note sheet-foot">New tractors go to whichever farm has the fewest.</p>
      )}
      {id === 'zarya' && (
        <p className="field-note sheet-foot">
          Consumer goods are shared between the towns by population.
        </p>
      )}
    </>
  );
}

function TownControls({ id, draft }: { id: TownId; draft: Plan }) {
  const { dispatch } = useStore();
  return (
    <>
      <p className="sheet-sub">
        {TOWNS[id].households} households{TOWNS[id].seat ? ', the provincial seat' : ''}
      </p>
      <section className="sheet-section" aria-label="State shop prices">
        <h3>State shop prices</h3>
        <RangeField
          label="Grain"
          value={draft.prices.grain}
          min={L.PRICE_GRAIN_MIN}
          max={L.PRICE_GRAIN_MAX}
          step={0.1}
          format={money}
          onChange={(v) =>
            dispatch({ type: 'plan', patch: (p) => ({ ...p, prices: { ...p.prices, grain: v } }) })
          }
        />
        <RangeField
          label="Consumer goods"
          value={draft.prices.consumer}
          min={L.PRICE_CONSUMER_MIN}
          max={L.PRICE_CONSUMER_MAX}
          step={0.5}
          format={money}
          onChange={(v) =>
            dispatch({
              type: 'plan',
              patch: (p) => ({ ...p, prices: { ...p.prices, consumer: v } }),
            })
          }
          note="Prices are the same in every town's state shop. Cheap goods sell out; dear goods sit."
        />
      </section>
      <ObserverToggle target={{ type: 'town', id }} draft={draft} />
      <GrainSplit draft={draft} />
    </>
  );
}

export const PlanSheet = forwardRef<HTMLElement, SheetProps>(function PlanSheet(
  { target, draft },
  ref,
) {
  const { dispatch } = useStore();
  const name = target.type === 'enterprise' ? ENTERPRISES[target.id].name : TOWNS[target.id].name;
  return (
    <section
      ref={ref}
      className="sheet"
      role="dialog"
      aria-label={`Plan for ${name}`}
      data-testid="plan-sheet"
    >
      <header className="sheet-head">
        <h2>{name}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close plan sheet"
          onClick={() => dispatch({ type: 'sheet', ref: null })}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path
              d="M4 4 L16 16 M16 4 L4 16"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <div className="sheet-body">
        {target.type === 'enterprise' ? (
          <EnterpriseControls id={target.id} draft={draft} />
        ) : (
          <TownControls id={target.id} draft={draft} />
        )}
      </div>
    </section>
  );
});
