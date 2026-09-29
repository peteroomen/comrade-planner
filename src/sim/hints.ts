import type { CardChoice } from '@/content/cards';
import { TOWN_IDS } from '@/content/ids';
import * as B from './balance';
import { cardScale } from './bars';
import type { BarId, Decision, Plan } from './types';

// Effect hints tell the player which way a choice pushes a bar, never by how much. They come
// from static content and static rules only, so they cannot leak hidden truth: a stamp's hints
// do not depend on the report, and a tip's do not depend on whether the tip is true.

export interface Hint {
  bar: BarId;
  dir: 'up' | 'down';
  size: 'small' | 'large';
  /** 'now' lands as the choice is made or the quarter closes; 'later' comes after a delay. */
  when: 'now' | 'later';
  /** The direction depends on things the player cannot see yet. */
  uncertain?: boolean;
}

/** A hand-written hint on a card choice, for world effects. Its timing is always 'later'. */
export type LaterHint = Omit<Hint, 'when'>;

const BAR_ORDER: BarId[] = ['people', 'apparatus', 'centre', 'shadow'];

const small = (bar: BarId, dir: Hint['dir'], when: Hint['when'], uncertain = false): Hint =>
  uncertain ? { bar, dir, size: 'small', when, uncertain } : { bar, dir, size: 'small', when };

/** Same bar, direction and timing are one hint; the larger size and any certainty win. */
function merge(hints: Hint[]): Hint[] {
  const out: Hint[] = [];
  for (const h of hints) {
    const same = out.find((o) => o.bar === h.bar && o.dir === h.dir && o.when === h.when);
    if (!same) {
      out.push({ ...h });
      continue;
    }
    if (h.size === 'large') same.size = 'large';
    if (!h.uncertain) delete same.uncertain;
  }
  return out.sort((a, b) => BAR_ORDER.indexOf(a.bar) - BAR_ORDER.indexOf(b.bar));
}

/**
 * Hints for one side of a card: the sign and size of its immediate bar effects (summed per bar, scaled as the sim scales them),
 * plus the hand-written `later` hints for world effects.
 */
export function choiceHints(choice: CardChoice): Hint[] {
  const sums: Partial<Record<BarId, number>> = {};
  for (const fx of choice.effects) {
    if (fx.kind !== 'bars') continue;
    for (const [bar, d] of Object.entries(fx.delta) as [BarId, number][]) {
      sums[bar] = (sums[bar] ?? 0) + d * cardScale();
    }
  }
  const hints: Hint[] = [];
  for (const bar of BAR_ORDER) {
    const d = sums[bar] ?? 0;
    if (d === 0) continue;
    hints.push({
      bar,
      dir: d > 0 ? 'up' : 'down',
      size: Math.abs(d) >= B.HINT_LARGE ? 'large' : 'small',
      when: 'now',
    });
  }
  for (const l of choice.later ?? []) hints.push({ ...l, when: 'later' });
  return merge(hints);
}

/**
 * What a desk stamp does in general. The same for every report of a given decision: it must
 * not reveal whether the report is padded.
 */
export function stampHints(decision: Decision): Hint[] {
  switch (decision) {
    case 'approve':
      // Small Apparatus thanks; any padding approved is ours at the Centre's spot-check.
      return [small('apparatus', 'up', 'now'), small('centre', 'down', 'later', true)];
    case 'reject':
      // Rejecting honest work costs a lot, rejecting a lie little: the marker must not say which.
      return [
        { bar: 'apparatus', dir: 'down', size: 'large', when: 'now', uncertain: true },
        small('people', 'down', 'now', true),
        small('centre', 'down', 'now', true),
      ];
    case 'audit':
      return [
        small('apparatus', 'down', 'now'),
        small('centre', 'up', 'later', true),
        small('shadow', 'down', 'later', true),
      ];
  }
}

export type PlanControl =
  | 'quota'
  | 'wage'
  | 'priceGrain'
  | 'priceConsumer'
  | 'steelShare'
  | 'grainAllocation'
  | 'observers'
  | 'crackdown';

export interface PlanControlHints {
  control: PlanControl;
  hints: Hint[];
}

const EPS = 1e-6;

const changedRecord = (a: Record<string, number>, b: Record<string, number>): number => {
  let net = 0;
  let any = false;
  for (const k of Object.keys(b)) {
    const d = (b[k] ?? 0) - (a[k] ?? 0);
    if (Math.abs(d) > EPS) {
      any = true;
      net += d;
    }
  }
  return any ? (net === 0 ? EPS : net) : 0;
};

/**
 * Hints for every plan control that differs between the committed plan and the draft. Directions
 * come from a static table read off the sim's rules. Controls with no bar consequence of their own
 * (quotas only change what the tips and the desk compare against; observers only gather
 * information) return no hints and are left out.
 */
export function planHints(committed: Plan, draft: Plan): PlanControlHints[] {
  const out: PlanControlHints[] = [];
  const add = (control: PlanControl, hints: Hint[]): void => {
    if (hints.length > 0) out.push({ control, hints });
  };

  // Quota moves no bar directly (the Centre judges reports against its own targets): no hints.

  // Wage: People follow the average wage now; a bigger bill can outrun the Centre grant.
  const wage = changedRecord(committed.wage, draft.wage);
  if (wage > 0) {
    add('wage', [small('people', 'up', 'now'), small('centre', 'down', 'later', true)]);
  } else if (wage < 0) {
    add('wage', [small('people', 'down', 'now'), small('centre', 'up', 'later', true)]);
  }

  // Grain price: dearer bread is felt at once; cheaper bread starves the treasury of takings.
  const g = draft.prices.grain - committed.prices.grain;
  if (g > EPS) {
    add('priceGrain', [small('people', 'down', 'now'), small('shadow', 'up', 'later', true)]);
  } else if (g < -EPS) {
    add('priceGrain', [small('people', 'up', 'now'), small('centre', 'down', 'later', true)]);
  }

  // Consumer price: dearer goods sell to fewer people and push buyers to the black market;
  // cheaper goods empty the shelves.
  const c = draft.prices.consumer - committed.prices.consumer;
  if (c > EPS) {
    add('priceConsumer', [small('people', 'down', 'now'), small('shadow', 'up', 'later', true)]);
  } else if (c < -EPS) {
    add('priceConsumer', [
      small('people', 'up', 'now', true),
      small('shadow', 'up', 'later', true),
    ]);
  }

  // Steel split: to Krasny means tractors and, in time, grain; to Zarya means goods in the shops now.
  const s = draft.steelKrasnyShare - committed.steelKrasnyShare;
  if (s > EPS) {
    add('steelShare', [small('people', 'up', 'later', true), small('centre', 'up', 'later', true)]);
  } else if (s < -EPS) {
    add('steelShare', [small('people', 'up', 'now', true), small('centre', 'down', 'later', true)]);
  }

  // Grain allocation: helps the towns it moves toward and starves the others, so it is uncertain.
  const alloc: Record<string, number> = {};
  const was: Record<string, number> = {};
  for (const t of TOWN_IDS) {
    alloc[t] = draft.grainAllocation[t];
    was[t] = committed.grainAllocation[t];
  }
  if (changedRecord(was, alloc) !== 0) {
    add('grainAllocation', [
      small('people', 'up', 'now', true),
      small('shadow', 'down', 'later', true),
    ]);
  }

  // Observers cost nothing on any bar: they only gather information, so no hints.

  // Crackdown order: costs now, pays in Shadow. Two quarters running is heavier on People.
  if (draft.crackdown && draft.crackdown !== committed.crackdown) {
    const repeat = committed.crackdown !== null;
    add('crackdown', [
      {
        bar: 'people',
        dir: 'down',
        // A repeat order doubles the People cost, which is worth a large marker.
        size: repeat ? 'large' : 'small',
        when: 'now',
      },
      small('apparatus', 'down', 'now'),
      small('shadow', 'down', 'later'),
    ]);
  }
  return out;
}
