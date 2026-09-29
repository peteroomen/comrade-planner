import { describe, expect, it } from 'vitest';
import { CARD_BY_ID, CARDS } from '@/content/cards';
import { ENTERPRISE_IDS, TOWN_IDS } from '@/content/ids';
import * as B from './balance';
import { blackReach } from './crackdown';
import {
  chooseCard,
  decideReport,
  defaultPlan,
  endQuarter,
  fileOwnReport,
  newGame,
  setPlan,
  tick,
} from './facade';
import { assertConserved, totalMoney } from './ledger';
import { skimRate } from './managers';
import { fileReports } from './reports';
import { effectiveSteelShare, hoardShare } from './requests';
import { sanitizePlan } from './plan';
import { treasury } from './selectors';
import { playQuarter, randomDriver } from './test-utils';
import type { Driver } from './test-utils';
import type { Decision, GameState, Plan } from './types';

/** Play a quarter with no cards, to the desk. Honest managers unless a test says otherwise. */
function toDesk(start: GameState, plan: Plan = defaultPlan()): GameState {
  let s = setPlan(start, plan);
  s.cardSchedule = [];
  let guard = 0;
  while (s.phase === 'quarter' && guard++ < 100) s = tick(s);
  return s;
}

function honest(seed: number): GameState {
  const s = newGame(seed);
  for (const e of ENTERPRISE_IDS) {
    s.managers[e].honesty = 1;
    s.managers[e].greed = 0;
  }
  return s;
}

const current = (s: GameState) => s.reports.filter((r) => r.quarter === s.quarter);
const pad = (s: GameState, factor: number): void => {
  for (const r of current(s)) r.reportedOutput = r.truth.output * factor;
};
const stampAll = (s: GameState, d: Decision): GameState => {
  for (const r of current(s)) s = decideReport(s, r.id, d);
  return s;
};

describe("desk: approving padding is the player's liability", () => {
  const caughtCount = (factor: number): number => {
    let n = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let s = toDesk(honest(seed));
      pad(s, factor);
      s = fileOwnReport(s, 1.0);
      s = endQuarter(s);
      if (s.reckoning?.lines.some((l) => l.includes('found our figures inflated'))) n++;
    }
    return n;
  };

  it('raises effective inflation so the Centre can catch an honestly filed quarter', () => {
    expect(caughtCount(1.0)).toBe(0);
    expect(caughtCount(1.3)).toBeGreaterThan(5);
  });

  it('records the approved padding on the quarter', () => {
    let s = toDesk(honest(4));
    pad(s, 1.3);
    s = endQuarter(s);
    expect(s.stats.approvedPadding).toBeGreaterThan(0);
  });

  it('pays far less Apparatus thanks for approving padding than for approving honest reports', () => {
    const run = (factor: number): number => {
      let s = toDesk(honest(6));
      pad(s, factor);
      s = endQuarter(s);
      return s.bars.apparatus;
    };
    const gap = run(1.0) - run(1.3);
    // Five reports, each paying APPARATUS_PADDED_APPROVE instead of APPARATUS_APPROVE (bar drift eats a little).
    expect(gap).toBeGreaterThan(4 * (B.APPARATUS_APPROVE - B.APPARATUS_PADDED_APPROVE));
    expect(gap).toBeLessThan(6 * (B.APPARATUS_APPROVE - B.APPARATUS_PADDED_APPROVE));
  });

  it('the ratchet raises targets on fake numbers', () => {
    const targets = (factor: number): number => {
      const start = honest(5);
      start.quarter = B.QUARTERS_PER_YEAR;
      let s = toDesk(start);
      pad(s, factor);
      s = endQuarter(s);
      return ENTERPRISE_IDS.reduce((sum, e) => sum + s.centre.targets[e], 0);
    };
    expect(targets(1.4)).toBeGreaterThan(targets(1.0));
  });
});

describe('desk: rejecting', () => {
  it('a padded report chastens the manager, who files closer to the truth next quarter', () => {
    let s = toDesk(honest(8));
    pad(s, 1.4);
    s = stampAll(s, 'reject');
    s = endQuarter(s);
    expect(s.managers.kolos.chastened).toBe(1);
    expect(s.managers.lesnoy.chastened).toBe(1);
    // Chastening fades after one quarter.
    s = toDesk(s);
    expect(s.managers.kolos.chastened).toBe(0);
  });

  it('a chastened manager distorts less (same luck, scaled size)', () => {
    const excess = (chastened: number): number => {
      let sum = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const start = newGame(seed);
        start.managers.kolos.honesty = 0.2;
        start.managers.kolos.greed = 1;
        start.managers.kolos.chastened = chastened;
        const s = toDesk(start);
        const r = current(s).find((x) => x.enterprise === 'kolos');
        if (r) sum += r.reportedOutput / Math.max(1, r.truth.output) - 1;
      }
      return sum;
    };
    const normal = excess(0);
    expect(normal).toBeGreaterThan(0.2);
    expect(excess(1)).toBeCloseTo(normal * B.REJECT_CHASTEN, 5);
  });

  it('rejecting an honest report costs Apparatus and People; rejecting a padded one costs little', () => {
    const after = (d: Decision, factor: number) => {
      let s = toDesk(honest(9));
      pad(s, factor);
      const r = current(s).find((x) => x.enterprise === 'zarya')!;
      s = decideReport(s, r.id, d);
      s = endQuarter(s);
      return {
        apparatus: s.bars.apparatus,
        people: s.bars.people,
        chastened: s.managers.zarya.chastened,
      };
    };
    const approve = after('approve', 1.0);
    const rejectHonest = after('reject', 1.0);
    expect(approve.apparatus - rejectHonest.apparatus).toBeGreaterThan(3.5);
    expect(approve.people - rejectHonest.people).toBeGreaterThan(1.5);
    expect(rejectHonest.chastened).toBe(0);
    const rejectPadded = after('reject', 1.4);
    const approvePadded = after('approve', 1.4);
    expect(approvePadded.apparatus - rejectPadded.apparatus).toBeLessThan(2);
    expect(approvePadded.people).toBeCloseTo(rejectPadded.people, 5);
    expect(rejectPadded.chastened).toBe(1);
  });
});

describe('desk: audits', () => {
  /** A desk with one audit launched on `enterprise`, then the plan phase of the next quarter. */
  function auditedSetup(enterprise: 'krasny' | 'kolos', padded: boolean, corrupt: boolean) {
    let s = toDesk(honest(12));
    if (padded) pad(s, 1.5);
    const r = current(s).find((x) => x.enterprise === enterprise)!;
    s = decideReport(s, r.id, 'audit');
    const audit = s.audits.find((a) => a.reportId === r.id)!;
    audit.corrupt = corrupt;
    s = endQuarter(s);
    return s;
  }

  it('a catch recovers warehouse goods, lowers Shadow, raises the Centre and reforms the manager', () => {
    const s = auditedSetup('krasny', true, false);
    const m = s.managers.krasny;
    m.honesty = 0.2;
    m.greed = 1;
    m.skim = skimRate(s, m);
    s.enterprises.krasny.warehouse.steel = 50;
    const stockBefore = s.enterprises.krasny.stock.steel;
    const bars = { ...s.bars };
    const skimBefore = m.skim;
    fileReports(s);
    expect(s.bars.shadow).toBeCloseTo(bars.shadow - B.SHADOW_AUDIT_CAUGHT, 5);
    expect(s.bars.centre).toBeCloseTo(bars.centre + B.CENTRE_AUDIT_CAUGHT, 5);
    expect(s.bars.apparatus).toBeCloseTo(bars.apparatus - B.APPARATUS_CAUGHT, 5);
    expect(s.enterprises.krasny.warehouse.steel).toBe(0);
    expect(s.enterprises.krasny.stock.steel).toBeCloseTo(stockBefore + 50, 5);
    expect(m.honesty).toBeCloseTo(0.2 + B.AUDIT_CAUGHT_HONESTY_GAIN, 5);
    expect(m.greed).toBeCloseTo(1 - B.AUDIT_CAUGHT_GREED_CUT, 5);
    expect(m.skim).toBeLessThan(skimBefore);
    expect(s.notes.some((l) => l.includes('found padding'))).toBe(true);
  });

  it('a clean audit costs a little Apparatus and changes nothing else', () => {
    const s = auditedSetup('krasny', false, false);
    s.enterprises.krasny.warehouse.steel = 10;
    const bars = { ...s.bars };
    const honesty = s.managers.krasny.honesty;
    fileReports(s);
    expect(s.bars.apparatus).toBeCloseTo(bars.apparatus - B.APPARATUS_AUDIT_CLEAN, 5);
    expect(s.bars.shadow).toBe(bars.shadow);
    expect(s.bars.centre).toBe(bars.centre);
    expect(s.enterprises.krasny.warehouse.steel).toBe(10);
    expect(s.managers.krasny.honesty).toBe(honesty);
  });

  it('a corrupt inspector triggers none of it and reads like a clean audit', () => {
    const s = auditedSetup('krasny', true, true);
    s.enterprises.krasny.warehouse.steel = 10;
    const bars = { ...s.bars };
    const honesty = s.managers.krasny.honesty;
    fileReports(s);
    expect(s.bars).toEqual(bars);
    expect(s.enterprises.krasny.warehouse.steel).toBe(10);
    expect(s.managers.krasny.honesty).toBe(honesty);
    const finding = s.audits.find((a) => a.status === 'resolved')!.finding!;
    expect(finding.padded).toBe(false);
    expect(s.notes.some((l) => l.includes('in order'))).toBe(true);
    expect(s.notes.join(' ')).not.toContain('padding');
  });
});

describe('desk: requests deliver steel', () => {
  it('approving Krasny and Zarya grants their requests; rejecting or auditing does not', () => {
    let s = toDesk(honest(14));
    const k = current(s).find((r) => r.enterprise === 'krasny')!;
    const z = current(s).find((r) => r.enterprise === 'zarya')!;
    s = decideReport(s, k.id, 'approve');
    s = decideReport(s, z.id, 'reject');
    const before = current(s).find((r) => r.enterprise === 'krasny')!;
    s = endQuarter(s);
    expect(s.requestGrants.krasny?.amount).toBeCloseTo(before.requestNext, 5);
    expect(s.requestGrants.zarya).toBeUndefined();
    expect(s.reckoning?.lines.some((l) => l.includes('Steel requests granted for Krasny.'))).toBe(
      true,
    );

    let t = toDesk(honest(14));
    for (const e of ['krasny', 'zarya']) {
      t = decideReport(t, current(t).find((r) => r.enterprise === e)!.id, 'audit');
    }
    t = endQuarter(t);
    expect(t.requestGrants).toEqual({});
  });

  it("granted requests shift next quarter's steel split, capped by what is available", () => {
    const s = newGame(1);
    s.plan.steelKrasnyShare = 0.55;
    expect(effectiveSteelShare(s)).toBe(0.55);
    s.requestGrants = { krasny: { amount: 120, excess: 0 }, zarya: { amount: 20, excess: 0 } };
    const toKrasny = effectiveSteelShare(s);
    expect(toKrasny).toBeGreaterThan(0.6);
    s.requestGrants = { krasny: { amount: 20, excess: 0 }, zarya: { amount: 100, excess: 0 } };
    expect(effectiveSteelShare(s)).toBeLessThan(0.5);
    // An absurd request cannot claim more than the works can use.
    s.requestGrants = { krasny: { amount: 1e6, excess: 0 }, zarya: { amount: 100, excess: 0 } };
    const capped = effectiveSteelShare(s);
    s.requestGrants = { krasny: { amount: 130, excess: 0 }, zarya: { amount: 100, excess: 0 } };
    expect(capped).toBeCloseTo(effectiveSteelShare(s), 5);
  });

  it('the split really changes what each factory receives', () => {
    const steelIn = (grants: GameState['requestGrants']): number => {
      const start = honest(2);
      start.requestGrants = grants;
      const s = toDesk(start);
      return s.stats.inputs.krasny;
    };
    const base = steelIn({});
    const shifted = steelIn({
      krasny: { amount: 130, excess: 0 },
      zarya: { amount: 10, excess: 0 },
    });
    expect(shifted).toBeGreaterThan(base);
  });

  it("the padded excess of a granted request lands in that manager's warehouse", () => {
    const start = honest(3);
    start.requestGrants = { krasny: { amount: 100, excess: 40 } };
    expect(hoardShare(start, 'krasny')).toBeCloseTo(0.4, 5);
    expect(hoardShare(start, 'zarya')).toBe(0);
    const s = toDesk(start);
    expect(s.enterprises.krasny.warehouse.steel).toBeGreaterThan(0);
    expect(s.stats.requestHoard).toBeCloseTo(s.enterprises.krasny.warehouse.steel, 5);
    expect(s.enterprises.zarya.warehouse.steel).toBe(0);
    assertConserved(s);
  });
});

describe('wages and the treasury', () => {
  it('the treasury selector is public and matches the ledger', () => {
    const s = toDesk(newGame(1));
    const t = treasury(s);
    expect(t.balance).toBe(s.ledger.balances.treasury);
    expect(t.centreGrantPerWeek).toBeGreaterThan(0);
    expect(t.wageBillPerWeek).toBeGreaterThan(0);
    expect(t.topUpsThisQuarter).toBe(s.stats.treasuryTopUp);
    expect(s.stats.centreGrant).toBeGreaterThan(0);
    expect(s.stats.treasuryTopUp).toBeGreaterThan(0);
    expect(JSON.stringify(t)).not.toContain('warehouse');
  });

  it('an overspent wage bill costs the Centre, with a reckoning line', () => {
    const after = (wage: number) => {
      const plan = defaultPlan();
      for (const e of ENTERPRISE_IDS) plan.wage[e] = wage;
      let s = toDesk(honest(15), plan);
      s = endQuarter(s);
      return {
        centre: s.bars.centre,
        line: s.reckoning?.lines.some((l) => l.includes('overspent')) ?? false,
      };
    };
    expect(after(B.WAGE_DEFAULT).line).toBe(false);
    const high = after(B.WAGE_MAX);
    expect(high.line).toBe(true);
  });

  it('a low Centre does not turn the same wage bill into an overspend (no spiral)', () => {
    const line = (centre: number) => {
      const start = honest(15);
      start.bars.centre = centre;
      let s = toDesk(start);
      s = endQuarter(s);
      return s.reckoning?.lines.some((l) => l.includes('overspent')) ?? false;
    };
    // The judgement uses the grant at Centre 50, so a shrunken grant does not make it harsher.
    expect(line(20)).toBe(false);
    expect(line(80)).toBe(false);
  });

  it('excess consumer spending on the black market raises Shadow; shop shortfalls cost People', () => {
    const end = (mutate: (s: GameState) => void) => {
      const s = toDesk(honest(16));
      mutate(s);
      return endQuarter(s);
    };
    const base = end(() => undefined);
    const black = end((s) => {
      s.stats.consumerBlack = s.stats.consumerBought * 0.6;
    });
    expect(black.bars.shadow).toBeGreaterThan(base.bars.shadow);
    const queue = end((s) => {
      s.stats.consumerWanted = 100;
      s.stats.consumerShopUnmet = 80;
    });
    expect(queue.bars.people).toBeLessThan(end(() => undefined).bars.people);
  });
});

describe('crackdown order', () => {
  const withCrackdown = (town: Plan['crackdown']): Plan => ({ ...defaultPlan(), crackdown: town });

  it('is validated by sanitizePlan and defaults to null', () => {
    expect(defaultPlan().crackdown).toBeNull();
    expect(sanitizePlan(withCrackdown('kovrino')).crackdown).toBe('kovrino');
    expect(sanitizePlan({ ...defaultPlan(), crackdown: 'gotham' as never }).crackdown).toBeNull();
    const legacy = defaultPlan() as Partial<Plan>;
    delete legacy.crackdown;
    expect(sanitizePlan(legacy as Plan).crackdown).toBeNull();
  });

  it('costs People and Apparatus when the quarter begins, more when repeated', () => {
    const base = setPlan(newGame(20), defaultPlan());
    const once = setPlan(newGame(20), withCrackdown('kovrino'));
    expect(base.bars.people - once.bars.people).toBeCloseTo(B.CRACKDOWN_PEOPLE, 5);
    expect(base.bars.apparatus - once.bars.apparatus).toBeCloseTo(B.CRACKDOWN_APPARATUS, 5);
    expect(once.notes.some((l) => l.includes('Kovrino'))).toBe(true);

    let s = toDesk(newGame(20), withCrackdown('kovrino'));
    s = endQuarter(s);
    const barsAfter = { ...s.bars };
    const repeat = setPlan(s, withCrackdown('kovrino'));
    expect(barsAfter.people - repeat.bars.people).toBeCloseTo(
      B.CRACKDOWN_PEOPLE + B.CRACKDOWN_REPEAT_PEOPLE,
      5,
    );
    const later = setPlan(s, withCrackdown('dalniy'));
    expect(barsAfter.people - later.bars.people).toBeCloseTo(
      B.CRACKDOWN_PEOPLE + B.CRACKDOWN_REPEAT_PEOPLE,
      5,
    );
    const fresh = setPlan(s, defaultPlan());
    expect(fresh.notes).toEqual([]);
  });

  it('can end the run before the quarter starts', () => {
    const start = newGame(20);
    start.bars.people = 2;
    const s = setPlan(start, withCrackdown('dalniy'));
    expect(s.phase).toBe('ended');
    expect(s.ended?.cause).toBe('people-low');
  });

  it("cuts skimming in that town's enterprises only", () => {
    const base = setPlan(newGame(20), defaultPlan());
    const hit = setPlan(newGame(20), withCrackdown('kovrino'));
    for (const e of ['kolos', 'zarya'] as const) {
      expect(hit.managers[e].skim).toBeLessThanOrEqual(
        base.managers[e].skim * B.CRACKDOWN_SKIM_MULT * 1.1,
      );
    }
    for (const e of ['lesnoy', 'stal', 'krasny'] as const) {
      // Only the Apparatus cost of the order nudges these (low Apparatus raises skim slightly).
      expect(hit.managers[e].skim).toBeGreaterThan(base.managers[e].skim * 0.95);
      expect(hit.managers[e].skim).toBeLessThan(base.managers[e].skim * 1.1);
    }
  });

  it('cuts black sales in that town only', () => {
    const s = setPlan(newGame(20), withCrackdown('kovrino'));
    expect(blackReach(s, 'kovrino')).toBeCloseTo(1 - B.CRACKDOWN_TOWN_CUT, 5);
    expect(blackReach(s, 'dalniy')).toBe(1);
    const consumed = (plan: Plan): number => {
      let t = setPlan(newGame(21), plan);
      t.cardSchedule = [];
      for (const id of TOWN_IDS) {
        t.towns[id].stock.consumer = 0;
        t.towns[id].stock.grain = 0;
      }
      t.black.stock.consumer = 500;
      t.black.stock.grain = 500;
      t = tick(t);
      return 1000 - t.black.stock.consumer - t.black.stock.grain;
    };
    expect(consumed(withCrackdown('kovrino'))).toBeLessThan(consumed(defaultPlan()));
  });

  it('lowers Shadow at quarter end and says so', () => {
    const run = (plan: Plan) => endQuarter(toDesk(honest(22), plan));
    const calm = run(defaultPlan());
    const raided = run(withCrackdown('oblastgrad'));
    expect(raided.bars.shadow).toBeLessThan(calm.bars.shadow);
    expect(raided.reckoning?.lines.some((l) => l.includes('crackdown in Oblastgrad'))).toBe(true);
    expect(calm.reckoning?.lines.some((l) => l.includes('crackdown'))).toBe(false);
  });

  it('the crackdown card shares the same effect code', () => {
    let s = newGame(23);
    s.black.stock.consumer = 100;
    s = setPlan(s, defaultPlan());
    s.activeCard = { cardId: 'event-crackdown', tick: 1, veracity: null };
    s = chooseCard(s, 'event-crackdown', 'left');
    expect(s.black.stock.consumer).toBeLessThan(100 * (1 - B.CRACKDOWN_BLACK_CUT) + 1);
    expect(
      s.modifiers.some((m) => m.name === 'skimMult' && m.value === B.CRACKDOWN_SKIM_MULT),
    ).toBe(true);
  });
});

describe('new shadow cards', () => {
  const ids = [
    'event-militia-raid',
    'event-gromov-names-dealer',
    'event-kolkhoz-amnesty',
    'event-close-bazaar',
    'event-party-purge',
  ];

  it('each has a Shadow-down side that costs another bar', () => {
    for (const id of ids) {
      const card = CARD_BY_ID[id]!;
      expect(card, id).toBeDefined();
      const sides = [card.left, card.right].map((c) =>
        Object.assign(
          {},
          ...c.effects.filter((e) => e.kind === 'bars').map((e) => (e as { delta: object }).delta),
        ),
      ) as Record<string, number>[];
      const good = sides.find((d) => (d.shadow ?? 0) < 0);
      expect(good, id).toBeDefined();
      const costs = (['people', 'apparatus', 'centre'] as const).filter(
        (b) => (good?.[b] ?? 0) < 0,
      );
      expect(costs.length, id).toBeGreaterThan(0);
    }
    expect(CARDS.length).toBeGreaterThanOrEqual(25);
  });

  it('a black raid destroys black stock', () => {
    let s = setPlan(newGame(24), defaultPlan());
    s.black.stock.grain = 100;
    s.activeCard = { cardId: 'event-militia-raid', tick: 1, veracity: null };
    s = chooseCard(s, 'event-militia-raid', 'left');
    expect(s.black.stock.grain).toBeCloseTo(65, 5);
  });
});

describe('money and stocks under every new rule', () => {
  const driver = (seed: number): Driver => {
    const base = randomDriver(seed);
    let q = 0;
    return {
      ...base,
      plan: (state, quarter) => {
        const p = base.plan(state, quarter);
        q += 1;
        p.crackdown = q % 3 === 0 ? null : TOWN_IDS[q % TOWN_IDS.length]!;
        if (q % 2 === 0) for (const e of ENTERPRISE_IDS) p.wage[e] = B.WAGE_MAX;
        return p;
      },
      decide: (state, id) => {
        void state;
        void id;
        const ds: Decision[] = ['approve', 'approve', 'reject', 'audit'];
        return ds[Math.floor((q + id) % ds.length)]!;
      },
      inflate: () => 1.2,
    };
  };

  it('conserves money and keeps stocks non-negative across multi-quarter runs', () => {
    for (const seed of [1, 2, 3, 4]) {
      let s = newGame(seed);
      const total = s.ledger.total;
      const d = driver(seed);
      for (let i = 0; i < 10 && s.phase !== 'ended'; i++) {
        s = playQuarter(s, d);
        expect(totalMoney(s)).toBe(total);
        assertConserved(s);
        for (const e of ENTERPRISE_IDS) {
          for (const v of Object.values(s.enterprises[e].stock))
            expect(v).toBeGreaterThanOrEqual(-1e-9);
          for (const v of Object.values(s.enterprises[e].warehouse))
            expect(v).toBeGreaterThanOrEqual(-1e-9);
        }
      }
    }
  });
});
