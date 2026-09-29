import { describe, expect, it } from 'vitest';
import { CARDS } from '@/content/cards';
import { ENTERPRISE_IDS } from '@/content/ids';
import { defaultPlan, newGame } from './facade';
import { choiceHints, planHints, stampHints } from './hints';
import { activeCard } from './selectors';
import type { Effect, GameState } from './types';

const barsOf = (fx: Effect[]): Record<string, number> => {
  const sum: Record<string, number> = {};
  for (const e of fx) {
    if (e.kind === 'bars') for (const [b, d] of Object.entries(e.delta)) sum[b] = (sum[b] ?? 0) + d;
  }
  return sum;
};

describe('card hints', () => {
  it('immediate hints match the sign of the bars effects, in every card', () => {
    for (const card of CARDS) {
      for (const choice of [card.left, card.right]) {
        const sums = barsOf(choice.effects);
        const now = choiceHints(choice).filter((h) => h.when === 'now');
        for (const [bar, d] of Object.entries(sums)) {
          const h = now.find((x) => x.bar === bar);
          if (d === 0) expect(h).toBeUndefined();
          else expect(h?.dir, `${card.id} ${bar}`).toBe(d > 0 ? 'up' : 'down');
        }
        expect(now.length).toBe(Object.values(sums).filter((d) => d !== 0).length);
      }
    }
  });

  it('marks effects of at least HINT_LARGE as large', () => {
    const hints = choiceHints({
      label: 'x',
      effects: [{ kind: 'bars', delta: { people: 5, apparatus: -4.9, centre: -6 } }],
    });
    expect(hints).toEqual([
      { bar: 'people', dir: 'up', size: 'large', when: 'now' },
      { bar: 'apparatus', dir: 'down', size: 'small', when: 'now' },
      { bar: 'centre', dir: 'down', size: 'large', when: 'now' },
    ]);
  });

  it('carries hand-written later hints, and every world effect card declares them', () => {
    const later = choiceHints({
      label: 'x',
      effects: [{ kind: 'tractors', enterprise: 'lesnoy', n: 2 }],
      later: [{ bar: 'people', dir: 'up', size: 'small' }],
    });
    expect(later).toEqual([{ bar: 'people', dir: 'up', size: 'small', when: 'later' }]);
    for (const card of CARDS) {
      for (const choice of [card.left, card.right]) {
        const world = choice.effects.some((e) => e.kind !== 'bars');
        if (world && !choice.pin) {
          expect(choice.later?.length ?? 0, `${card.id}: ${choice.label}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('tip hints do not depend on whether the tip is true', () => {
    const tips = CARDS.filter((c) => c.type === 'tip');
    expect(tips.length).toBeGreaterThan(0);
    for (const card of tips) {
      const view = (veracity: boolean): unknown => {
        const s: GameState = newGame(4);
        s.activeCard = { cardId: card.id, tick: 3, veracity };
        return activeCard(s);
      };
      expect(view(true)).toEqual(view(false));
    }
  });
});

describe('stamp hints', () => {
  it('depend only on the decision, so padded and honest reports look alike', () => {
    for (const d of ['approve', 'reject', 'audit'] as const) {
      expect(stampHints(d)).toEqual(stampHints(d));
      expect(stampHints(d).length).toBeGreaterThan(0);
    }
    // The function takes no report at all: nothing about a report can reach it.
    expect(stampHints.length).toBe(1);
  });

  it('follows the desk rules', () => {
    expect(stampHints('approve')[0]).toEqual({
      bar: 'apparatus',
      dir: 'up',
      size: 'small',
      when: 'now',
    });
    expect(stampHints('reject').find((h) => h.bar === 'apparatus')?.dir).toBe('down');
    expect(stampHints('reject').find((h) => h.bar === 'people')?.uncertain).toBe(true);
    expect(stampHints('audit').find((h) => h.bar === 'shadow')).toMatchObject({
      dir: 'down',
      when: 'later',
      uncertain: true,
    });
  });
});

describe('plan hints', () => {
  it('returns nothing for an unchanged plan', () => {
    const p = defaultPlan();
    expect(planHints(p, structuredClone(p))).toEqual([]);
  });

  it('gives directions for changed controls', () => {
    const a = defaultPlan();
    const b = structuredClone(a);
    for (const e of ENTERPRISE_IDS) b.wage[e] += 3;
    b.prices.grain += 1;
    b.crackdown = 'dalniy';
    b.quota.kolos += 10;
    const out = planHints(a, b);
    const of = (c: string) => out.find((x) => x.control === c)?.hints ?? [];
    expect(of('wage').find((h) => h.bar === 'people')?.dir).toBe('up');
    expect(of('wage').find((h) => h.bar === 'centre')).toMatchObject({
      dir: 'down',
      when: 'later',
    });
    expect(of('priceGrain').find((h) => h.bar === 'people')?.dir).toBe('down');
    expect(of('crackdown').find((h) => h.bar === 'shadow')?.when).toBe('later');
    expect(of('crackdown').find((h) => h.bar === 'people')?.dir).toBe('down');
    expect(of('quota')).toEqual([]);
  });

  it('reads a repeated crackdown as heavier on People', () => {
    const a = defaultPlan();
    a.crackdown = 'dalniy';
    const b = structuredClone(a);
    b.crackdown = 'kovrino';
    const people = planHints(a, b)[0]?.hints.find((h) => h.bar === 'people');
    expect(people?.size).toBe('large');
  });
});
